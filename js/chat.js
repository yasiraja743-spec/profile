// chat.js — talks to https://ai-kyro.vercel.app/api/chat?question=...

(function () {
  const API_BASE = 'https://ai-kyro.vercel.app/api/chat';

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
      const url = `${API_BASE}?question=${encodeURIComponent(question)}`;
      let data;

      try {
        // direct call first
        const res = await fetch(url);
        if (!res.ok) throw new Error('bad status');
        data = await res.json();
      } catch (directErr) {
        // direct call blocked (usually CORS) — retry through a proxy
        const proxied = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
        const res2 = await fetch(proxied);
        if (!res2.ok) throw new Error('bad status via proxy');
        data = await res2.json();
      }

      removeTyping();

      if (data && data.status && data.result) {
        const meta = data.model ? `model: ${data.model}` : '';
        addAiMessage(data.result, meta, false);
      } else {
        addAiMessage('AI tidak memberikan jawaban yang valid. coba pertanyaan lain.', '', true);
      }
    } catch (err) {
      removeTyping();
      addAiMessage('gagal terhubung ke server AI. periksa koneksi kamu lalu coba lagi.', '', true);
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
