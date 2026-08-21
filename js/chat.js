// chat.js — frontend only calls the Vercel serverless API.
// Provider API keys stay on the server and are never shipped to the browser.

(function () {
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
      <div><div class="bubble"></div></div>
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
      <div><div class="bubble"><span class="typing"><span></span><span></span><span></span></span></div></div>
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
        ${meta ? '<div class="msg-meta"></div>' : ''}
      </div>
    `;
    el.querySelector('.bubble').textContent = text;
    if (meta) el.querySelector('.msg-meta').textContent = meta;
    stream.appendChild(el);
    scrollToEnd();
  }

  async function askAI(question) {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question })
    });

    const raw = await response.text();
    let data = {};
    try {
      data = JSON.parse(raw);
    } catch {
      throw new Error(`API mengembalikan response bukan JSON (HTTP ${response.status})`);
    }

    if (!response.ok || data.status === false) {
      const detail = Array.isArray(data.details)
        ? data.details.join(' | ')
        : data.error;
      throw new Error(detail || `HTTP ${response.status}`);
    }

    if (!data.result) {
      throw new Error('API tidak mengembalikan jawaban');
    }

    return data;
  }

  async function sendMessage(question) {
    question = String(question || '').trim();
    if (!question || sendBtn.disabled) return;

    addUserMessage(question);
    input.value = '';
    input.style.height = 'auto';
    sendBtn.disabled = true;
    addTyping();

    try {
      const data = await askAI(question);
      removeTyping();
      addAiMessage(data.result, `${data.provider} · ${data.model}`, false);
    } catch (err) {
      removeTyping();
      const message = err?.message || 'Unknown error';
      addAiMessage(`Gagal mendapatkan jawaban AI.\n\n${message}`, '', true);
      console.error('AI API failed:', err);
    } finally {
      sendBtn.disabled = false;
      input.focus();
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
