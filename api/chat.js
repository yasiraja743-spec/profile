import { json, parseJson } from "./_hf.js";

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const GROQ_API_KEY = process.env.GROQ_API_KEY;

const SYSTEM_PROMPT = `
Kamu adalah asisten AI di portofolio Kyro.

IDENTITAS:
- Developer: Kyro

ATURAN IDENTITAS:
1. Jika ditanya siapa yang membuat kamu, jawab bahwa kamu dikembangkan oleh Kyro.
2. Jangan memperkenalkan diri sebagai model AI lain.
3. Jika ditanya teknologi/model yang digunakan, jawab jujur bahwa kamu memakai model pihak ketiga lewat API.
4. Jangan mengarang informasi pribadi tentang Kyro.

ATURAN OUTPUT:
1. Jangan pernah menampilkan reasoning, chain-of-thought, thinking process, atau instruksi internal.
2. Langsung berikan jawaban final.
3. Gunakan bahasa yang sama dengan pengguna.
`;

async function requestOpenRouter(messages) {
  if (!OPENROUTER_API_KEY) {
    throw new Error("OPENROUTER_API_KEY belum dikonfigurasi");
  }

  const response = await fetch(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://profile-kyro.vercel.app",
        "X-Title": "Kyro Portfolio Chat"
      },
      body: JSON.stringify({
        model: "openrouter/free",
        messages,
        temperature: 0.7,
        max_tokens: 16384
      })
    }
  );

  let data = {};
  try {
    data = await response.json();
  } catch {}

  if (!response.ok) {
    throw new Error(
      data?.error?.message || data?.error || `OpenRouter HTTP ${response.status}`
    );
  }

  const result = data?.choices?.[0]?.message?.content;
  if (!result) throw new Error("OpenRouter tidak mengembalikan hasil");

  return { result, provider: "openrouter", model: data?.model || "openrouter/free" };
}

async function requestGroq(messages) {
  if (!GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY belum dikonfigurasi");
  }

  const response = await fetch(
    "https://api.groq.com/openai/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "openai/gpt-oss-120b",
        messages,
        temperature: 0.7,
        max_tokens: 16384
      })
    }
  );

  let data = {};
  try {
    data = await response.json();
  } catch {}

  if (!response.ok) {
    throw new Error(
      data?.error?.message || data?.error || `Groq HTTP ${response.status}`
    );
  }

  const result = data?.choices?.[0]?.message?.content;
  if (!result) throw new Error("Groq tidak mengembalikan hasil");

  return { result, provider: "groq", model: data?.model || "openai/gpt-oss-120b" };
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  try {
    let body = {};

    if (req.method === "GET") {
      body = req.query || {};
    } else if (req.method === "POST") {
      body = await parseJson(req);
    } else {
      return json(res, 405, {
        status: false,
        error: "Method Not Allowed",
        allowed: ["GET", "POST"]
      });
    }

    const question = String(body.question || "").trim();

    if (!question) {
      return json(res, 400, { status: false, error: "question wajib diisi" });
    }

    const messages = [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: question }
    ];

    let openRouterError = null;

    try {
      const result = await requestOpenRouter(messages);
      return json(res, 200, {
        status: true,
        provider: result.provider,
        model: result.model,
        result: result.result
      });
    } catch (error) {
      openRouterError = error?.message || "OpenRouter gagal";
      console.error("OPENROUTER FAILED:", openRouterError);
    }

    try {
      const result = await requestGroq(messages);
      return json(res, 200, {
        status: true,
        provider: result.provider,
        model: result.model,
        result: result.result,
        fallback: true
      });
    } catch (groqError) {
      const groqErrorMessage = groqError?.message || "Groq gagal";
      console.error("GROQ FAILED:", groqErrorMessage);

      return json(res, 503, {
        status: false,
        error: "Semua AI provider gagal",
        providers: { openrouter: openRouterError, groq: groqErrorMessage }
      });
    }
  } catch (error) {
    console.error("CHAT API ERROR:", error);
    return json(res, 500, { status: false, error: error?.message || "Internal Server Error" });
  }
}
