(function() {
  'use strict';

  var API_BASE = (function() {
    if (location.protocol === 'file:') return 'http://localhost:3001/api';
    var localHosts = { 'localhost': true, '127.0.0.1': true, '::1': true };
    if (localHosts[location.hostname] && location.port !== '3001') return 'http://localhost:3001/api';
    return '/api';
  })();

  var sessionId = 'ask-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);

  function el(tag, cls, text) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text !== undefined && text !== null) node.textContent = text;
    return node;
  }

  var STYLE_CSS = [
    '.ask-backdrop{position:fixed;inset:0;background:rgba(0,0,0,0.4);z-index:9998;display:none}',
    '.ask-backdrop.open{display:block}',
    '.ask-sheet{position:fixed;left:0;right:0;bottom:0;z-index:9999;background:var(--bg-card,#fff);border-top:2px solid var(--text-primary,#1a1a1a);border-radius:16px 16px 0 0;max-height:82vh;display:none;flex-direction:column;box-shadow:0 -4px 16px rgba(0,0,0,0.15)}',
    '.ask-sheet.open{display:flex}',
    '.ask-header{padding:14px 16px;border-bottom:1px solid rgba(0,0,0,0.08);display:flex;justify-content:space-between;align-items:center;font-weight:700}',
    '.ask-close{background:none;border:none;font-size:22px;cursor:pointer;padding:4px 8px}',
    '.ask-messages{flex:1;overflow-y:auto;padding:12px 16px;display:flex;flex-direction:column;gap:10px}',
    '.ask-msg{padding:10px 12px;border-radius:10px;max-width:90%;line-height:1.5;white-space:pre-wrap;word-break:break-word}',
    '.ask-msg.user{align-self:flex-end;background:#1a1a1a;color:#fff}',
    '.ask-msg.assistant{align-self:flex-start;background:#f4f4f4}',
    '.ask-sources{margin-top:8px;display:flex;flex-wrap:wrap;gap:6px}',
    '.ask-source-chip{padding:4px 10px;border:1px solid rgba(0,0,0,0.15);border-radius:12px;font-size:12px;background:#fff;cursor:pointer;font-family:inherit}',
    '.ask-input-row{display:flex;gap:8px;padding:12px 16px;border-top:1px solid rgba(0,0,0,0.08)}',
    '.ask-input{flex:1;padding:10px 12px;border:1px solid #ccc;border-radius:8px;font-family:inherit;font-size:14px}',
    '.ask-send{padding:10px 16px;background:#1a1a1a;color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:700;font-family:inherit}',
    '.ask-send:disabled{opacity:0.5;cursor:not-allowed}',
    '.ask-error{color:#c00;padding:8px 12px;font-size:13px;background:#fee;border-radius:8px}'
  ].join('\n');

  function ensureStyles() {
    if (document.getElementById('chat-ui-styles')) return;
    var style = document.createElement('style');
    style.id = 'chat-ui-styles';
    style.textContent = STYLE_CSS;
    document.head.appendChild(style);
  }

  function buildSheet() {
    ensureStyles();

    var backdrop = el('div', 'ask-backdrop');
    var sheet = el('div', 'ask-sheet');

    var header = el('div', 'ask-header');
    var title = el('span', 'ask-title', '📜 AI 질문');
    var closeBtn = el('button', 'ask-close', '×');
    header.appendChild(title);
    header.appendChild(closeBtn);

    var msgs = el('div', 'ask-messages');

    var inputRow = el('div', 'ask-input-row');
    var input = el('input', 'ask-input');
    input.type = 'text';
    input.placeholder = '규정에 대해 질문하세요';
    var sendBtn = el('button', 'ask-send', '전송');
    inputRow.appendChild(input);
    inputRow.appendChild(sendBtn);

    sheet.appendChild(header);
    sheet.appendChild(msgs);
    sheet.appendChild(inputRow);
    document.body.appendChild(backdrop);
    document.body.appendChild(sheet);

    var inflight = false;

    function closeSheet() {
      backdrop.classList.remove('open');
      sheet.classList.remove('open');
    }
    closeBtn.addEventListener('click', closeSheet);
    backdrop.addEventListener('click', closeSheet);

    function appendUser(text) {
      msgs.appendChild(el('div', 'ask-msg user', text));
      msgs.scrollTop = msgs.scrollHeight;
    }

    function appendAssistant() {
      var node = el('div', 'ask-msg assistant', '');
      msgs.appendChild(node);
      msgs.scrollTop = msgs.scrollHeight;
      return node;
    }

    function renderSources(assistantNode, sources) {
      if (!sources || !sources.length) return;
      var wrap = el('div', 'ask-sources');
      var seen = {};
      sources.slice(0, 5).forEach(function(s) {
        if (!s.title || seen[s.title]) return;
        seen[s.title] = true;
        var chip = el('button', 'ask-source-chip', s.title);
        chip.addEventListener('click', function() {
          closeSheet();
          if (window.scrollToArticle) window.scrollToArticle(s.title);
        });
        wrap.appendChild(chip);
      });
      assistantNode.appendChild(wrap);
    }

    function handleSend(articleHint) {
      var q = input.value.trim();
      if (!q || inflight) return;
      inflight = true;
      sendBtn.disabled = true;
      appendUser(q);
      input.value = '';
      var assistantNode = appendAssistant();

      fetch(API_BASE + '/rag/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q, sessionId: sessionId, articleHint: articleHint })
      }).then(function(res) {
        if (!res.ok) {
          if (res.status === 429) throw new Error('요청이 너무 많습니다. 잠시 후 다시 시도해주세요.');
          throw new Error('서버 오류 (' + res.status + ')');
        }
        if (!res.body) throw new Error('스트리밍 응답을 받을 수 없습니다.');
        var reader = res.body.getReader();
        var decoder = new TextDecoder();
        var buffer = '';
        var sources = null;
        var serverError = null;
        function pump() {
          return reader.read().then(function(chunk) {
            if (chunk.done) {
              if (serverError) {
                msgs.appendChild(el('div', 'ask-error', serverError));
              } else {
                renderSources(assistantNode, sources);
              }
              return;
            }
            buffer += decoder.decode(chunk.value, { stream: true });
            var lines = buffer.split('\n\n');
            buffer = lines.pop() || '';
            for (var i = 0; i < lines.length; i++) {
              var line = lines[i].replace(/^data:\s*/, '').trim();
              if (!line) continue;
              try {
                var ev = JSON.parse(line);
                if (ev.type === 'delta') {
                  assistantNode.textContent += ev.text;
                  msgs.scrollTop = msgs.scrollHeight;
                } else if (ev.type === 'done') {
                  sources = ev.sources;
                } else if (ev.type === 'error') {
                  serverError = ev.message || '서버에서 오류가 발생했습니다.';
                }
              } catch (e) { /* ignore partial */ }
            }
            return pump();
          });
        }
        return pump();
      }).catch(function(err) {
        msgs.appendChild(el('div', 'ask-error', err.message || '오류가 발생했습니다.'));
      }).then(function() {
        inflight = false;
        sendBtn.disabled = false;
      });
    }

    return {
      open: function(opts) {
        opts = opts || {};
        var ref = opts.articleRef || '';
        var t = opts.title || '';
        if (ref || t) {
          title.textContent = '📜 ' + (ref + (t ? ' — ' + t : '')) + ' 에 대해 질문';
        } else {
          title.textContent = '📜 AI 질문';
        }
        while (msgs.firstChild) msgs.removeChild(msgs.firstChild);
        input.value = opts.prefill || '';
        var hint = (ref || t) ? (ref + ' ' + t).trim() : undefined;
        sendBtn.onclick = function() { handleSend(hint); };
        input.onkeydown = function(e) { if (e.key === 'Enter') handleSend(hint); };
        backdrop.classList.add('open');
        sheet.classList.add('open');
        setTimeout(function() { input.focus(); }, 100);
      }
    };
  }

  var api = null;
  window.AskChatUI = {
    open: function(opts) {
      if (!api) api = buildSheet();
      api.open(opts);
    }
  };
})();
