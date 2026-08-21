// Vercel Serverless Function — keeps provider API keys on the server.
// Frontend calls only /api/chat, so no API key is exposed in the browser.

const SYSTEM_PROMPT = `Kamu adalah NOVA AI, asisten AI yang dikembangkan oleh Kyro.

ATURAN IDENTITAS:
1. Jika ditanya siapa kamu, jawab bahwa kamu adalah NOVA AI.
2. Jika ditanya siapa yang membuat kamu, jawab bahwa kamu dikembangkan oleh Kyro.
3. Jangan memperkenalkan diri sebagai model AI lain.
4. Jangan mengarang informasi pribadi tentang Kyro.

ATURAN OUTPUT:
1. Jangan menampilkan reasoning, chain-of-thought, atau proses berpikir internal.
2. Langsung berikan jawaban final.
3. Gunakan bahasa yang sama dengan pengguna.`;

const MODELS = {
  xkiro: 'deepseek/deepseek-v4-pro',
  openrouter: 'openrouter/free',
  groq: 'openai/gpt-oss-120b'
};

function getMessage(data) {
  return data?.error?.message ||
    (typeof data?.error === 'string' ? data.error : '') ||
    data?.message ||
    '';
}

async function callProvider(name, messages) {
  let url, key, headers, body;

  if (name === 'xkiro') {
    key = process.env.XKIRO_API_KEY;
    url = 'https://api.xkiro.com/v1/chat/completions';
    headers = {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json'
    };
    body = {
      model: MODELS.xkiro,
      messages,
      temperature: 0.7,
      max_tokens: 4000
    };
  } else if (name === 'openrouter') {
    key = process.env.OPENROUTER_API_KEY;
    url = 'https://openrouter.ai/api/v1/chat/completions';
    headers = {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://vercel.com/',
      'X-Title': 'Kyro Portfolio Chat'
    };
    body = {
      model: MODELS.openrouter,
      messages,
      temperature: 0.7,
      max_tokens: 4000
    };
  } else {
    key = process.env.GROQ_API_KEY;
    url = 'https://api.groq.com/openai/v1/chat/completions';
    headers = {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json'
    };
    body = {
      model: MODELS.groq,
      messages,
      temperature: 0.7,
      max_tokens: 4000,
      reasoning_effort: 'low'
    };
  }

  if (!key) {
    throw new Error(`${name}: API key belum diatur`);
  }

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body)
  });

  const raw = await response.text();
  let data = {};
  try {
    data = JSON.parse(raw);
  } catch {}

  if (!response.ok) {
    throw new Error(`${name} HTTP ${response.status}: ${getMessage(data) || raw || 'Unknown error'}`);
  }

  const content =
    data?.choices?.[0]?.message?.content ??
    data?.choices?.[0]?.text ??
    data?.result ??
    '';

  if (typeof content !== 'string' || !content.trim()) {
    throw new Error(`${name}: response tidak berisi content`);
  }

  return {
    result: content.trim(),
    provider: name,
    model: data?.model || MODELS[name]
  };
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(204).end();
  }

  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST, OPTIONS');
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    return res.status(405).send('Method Not Allowed');
  }

  try {
    // GET: /api/chat?question=hai -> returns the AI answer as plain text.
    // POST: used by the website chat UI and keeps the structured response.
    const question = req.method === 'GET'
      ? (typeof req.query?.question === 'string' ? req.query.question.trim() : '')
      : (typeof req.body?.question === 'string' ? req.body.question.trim() : '');

    const plain = req.method === 'GET';

    if (!question) {
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      return res.status(400).send('question wajib diisi');
    }

    if (question.length > 12000) {
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      return res.status(400).send('question terlalu panjang');
    }

    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: question }
    ];

    const errors = [];

    for (const provider of ['xkiro', 'openrouter', 'groq']) {
      try {
        const result = await callProvider(provider, messages);
        if (plain) {
          res.setHeader('Content-Type', 'text/plain; charset=utf-8');
          return res.status(200).send(result.result);
        }

        return res.status(200).json({
          status: true,
          ...result
        });
      } catch (error) {
        errors.push(error?.message || `${provider}: unknown error`);
      }
    }

    console.error('AI provider chain failed:', errors);

    if (plain) {
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      return res.status(502).send(`Semua AI provider gagal.\n${errors.join(' | ')}`);
    }

    return res.status(502).json({
      status: false,
      error: 'Semua AI provider gagal.',
      details: errors
    });
  } catch (error) {
    console.error('Chat API error:', error);
    if (req.method === 'GET') {
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      return res.status(500).send(error?.message || 'Internal Server Error');
    }

    return res.status(500).json({
      status: false,
      error: error?.message || 'Internal Server Error'
    });
  }
}
