// chat.js — calls xKiro / OpenRouter / Groq DIRECTLY from the browser.
// No backend, no /api folder. Paste your API keys below.
//
// IMPORTANT: any key placed here is visible to anyone who views this
// file's source in the browser (Ctrl+U / DevTools). There is no way
// to hide a secret key in client-side JavaScript — that's how browsers
// work, not a choice this code makes. If a provider blocks direct
// browser calls (no CORS support), that provider's fetch below will
// fail and the chain moves to the next one.

(function () {
  const ENV = window.__ENV__ || {};
  const XKIRO_API_KEY = ENV.XKIRO_API_KEY || '';
  const OPENROUTER_API_KEY = ENV.OPENROUTER_API_KEY || '';
  const GROQ_API_KEY = ENV.GROQ_API_KEY || '';

  const DEEPSEEK_MODEL = 'deepseek/deepseek-v4-pro';
  const OPENROUTER_MODEL = 'openrouter/free';
  const GROQ_MODEL = 'openai/gpt-oss-120b';

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

  async function getErrorText(response) {
    const text = await response.text();
    try {
      const data = JSON.parse(text);
      return data?.error?.message || data?.error || data?.message || `HTTP ${response.status}`;
    } catch {
      return text || `HTTP ${response.status}`;
    }
  }

  function extractContent(data) {
    return data?.choices?.[0]?.message?.content || data?.choices?.[0]?.text || data?.result || '';
  }

  async function requestXkiro(messages) {
    if (!XKIRO_API_KEY) {
      throw new Error('XKIRO_API_KEY belum diisi di Vercel Environment Variables');
    }
    const res = await fetch('https://api.xkiro.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${XKIRO_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ model: DEEPSEEK_MODEL, messages, temperature: 0.7, max_tokens: 4000 })
    });
    if (!res.ok) throw new Error(`xKiro: ${await getErrorText(res)}`);
    const data = await res.json();
    const result = extractContent(data);
    if (!result) throw new Error('xKiro tidak mengembalikan hasil');
    return { result, provider: 'xkiro', model: data?.model || DEEPSEEK_MODEL };
  }

  async function requestOpenRouter(messages) {
    if (!OPENROUTER_API_KEY) {
      throw new Error('OPENROUTER_API_KEY belum diisi di Vercel Environment Variables');
    }
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': location.origin,
        'X-Title': 'Kyro Portfolio Chat'
      },
      body: JSON.stringify({ model: OPENROUTER_MODEL, messages, temperature: 0.7, max_tokens: 4000 })
    });
    if (!res.ok) throw new Error(`OpenRouter: ${await getErrorText(res)}`);
    const data = await res.json();
    const result = extractContent(data);
    if (!result) throw new Error('OpenRouter tidak mengembalikan hasil');
    return { result, provider: 'openrouter', model: data?.model || OPENROUTER_MODEL };
  }

  async function requestGroq(messages) {
    if (!GROQ_API_KEY) {
      throw new Error('GROQ_API_KEY belum diisi di Vercel Environment Variables');
    }
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ model: GROQ_MODEL, messages, temperature: 0.7, max_tokens: 4000 })
    });
    if (!res.ok) throw new Error(`Groq: ${await getErrorText(res)}`);
    const data = await res.json();
    const result = extractContent(data);
    if (!result) throw new Error('Groq tidak mengembalikan hasil');
    return { result, provider: 'groq', model: data?.model || GROQ_MODEL };
  }

  async function askAI(question) {
    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: question }
    ];
    const chain = [requestXkiro, requestOpenRouter, requestGroq];
    const errors = [];
    for (const fn of chain) {
      try {
        return await fn(messages);
      } catch (err) {
        errors.push(err.message);
      }
    }
    throw new Error(errors.join(' | '));
  }

  const stream = document.getElementById('chatStream');
  const empty = document.getElementById('chatEmpty');
  const form = document.getElementById('chatForm');
  const input = document.getElementById('chatInput');
  const sendBtn = document.getElementById('chatSend');
  const clearBtn = document.getElementById('chatClear');
  const suggests = document.querySelectorAll('.suggest-chip');

  function scrollToEnd() {
    stream.scrollTop = stream.scrollHeight;
  }

  function hideEmpty() {
    if (empty) empty.style.display = 'none';
  }

  function addUserMessage(text) {
    hideEmpty();
    const el = document.createElement('div');
    el.className = 'msg user';
    el.innerHTML = `
      <div class="avatar">
        <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
      </div>
      <div>
        <div class="bubble"></div>
      </div>
    `;
    el.querySelector('.bubble').textContent = text;
    stream.appendChild(el);
    scrollToEnd();
  }

  function addTyping() {
    const el = document.createElement('div');
    el.className = 'msg ai';
    el.id = 'typingMsg';
    el.innerHTML = `
      <div class="avatar">
        <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a4 4 0 0 1 4 4v1a4 4 0 0 1-8 0V6a4 4 0 0 1 4-4z"/><path d="M5 21v-1a7 7 0 0 1 14 0v1"/></svg>
      </div>
      <div>
        <div class="bubble"><span class="typing"><span></span><span></span><span></span></span></div>
      </div>
    `;
    stream.appendChild(el);
    scrollToEnd();
  }

  function removeTyping() {
    const t = document.getElementById('typingMsg');
    if (t) t.remove();
  }

  function addAiMessage(text, meta, isError) {
    const el = document.createElement('div');
    el.className = 'msg ai';
    el.innerHTML = `
      <div class="avatar">
        <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a4 4 0 0 1 4 4v1a4 4 0 0 1-8 0V6a4 4 0 0 1 4-4z"/><path d="M5 21v-1a7 7 0 0 1 14 0v1"/></svg>
      </div>
      <div>
        <div class="bubble${isError ? ' error' : ''}"></div>
        ${meta ? `<div class="msg-meta"></div>` : ''}
      </div>
    `;
    el.querySelector('.bubble').textContent = text;
    if (meta) el.querySelector('.msg-meta').textContent = meta;
    stream.appendChild(el);
    scrollToEnd();
  }

  async function sendMessage(question) {
    if (!question.trim()) return;
    addUserMessage(question);
    input.value = '';
    input.style.height = 'auto';
    sendBtn.disabled = true;
    addTyping();

    try {
      const { result, provider, model } = await askAI(question);
      removeTyping();
      addAiMessage(result, `${provider} · ${model}`, false);
    } catch (err) {
      removeTyping();
      addAiMessage('gagal dapat jawaban dari AI provider. cek API key & console browser buat detail error.', '', true);
      console.error('AI chain failed:', err.message);
    } finally {
      sendBtn.disabled = false;
    }
  }

  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      sendMessage(input.value);
    });
  }

  if (input) {
    input.addEventListener('input', () => {
      input.style.height = 'auto';
      input.style.height = Math.min(input.scrollHeight, 120) + 'px';
    });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage(input.value);
      }
    });
  }

  suggests.forEach((chip) => {
    chip.addEventListener('click', () => sendMessage(chip.textContent.trim()));
  });

  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      stream.innerHTML = '';
      if (empty) {
        stream.appendChild(empty);
        empty.style.display = 'block';
      }
    });
  }
})();
