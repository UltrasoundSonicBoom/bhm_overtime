(function() {
  'use strict';

  // Resolved lazily on each call so `window.__RAG_API_BASE__` override works
  // even when set after the page loads.
  function apiBase() {
    if (typeof window !== 'undefined' && window.__RAG_API_BASE__) return window.__RAG_API_BASE__;
    if (location.protocol === 'file:') return 'http://localhost:3001/api';
    var localHosts = { 'localhost': true, '127.0.0.1': true, '::1': true };
    if (localHosts[location.hostname] && location.port !== '3001') return 'http://localhost:3001/api';
    return '/api';
  }

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
    '.ask-msg.assistant.rendered{white-space:normal}',
    '.ask-md-h{font-size:13px;font-weight:700;margin:10px 0 4px;color:#444}',
    '.ask-md-p{margin:4px 0}',
    '.ask-md-list{margin:4px 0 6px 0;padding-left:20px}',
    '.ask-md-list li{margin:2px 0}',
    '.ask-md-table{border-collapse:collapse;margin:6px 0;font-size:12px;width:100%}',
    '.ask-md-table th,.ask-md-table td{border:1px solid rgba(0,0,0,0.15);padding:4px 8px;text-align:left}',
    '.ask-md-table th{background:#fafafa;font-weight:700}',
    '.ask-sources{margin-top:8px;display:flex;flex-wrap:wrap;gap:6px}',
    '.ask-source-chip{padding:4px 10px;border:1px solid rgba(0,0,0,0.15);border-radius:12px;font-size:12px;background:#fff;cursor:pointer;font-family:inherit}',
    '.ask-source-chip.primary{background:#1a1a1a;color:#fff;border-color:#1a1a1a}',
    '.ask-source-chip.open{background:#e8e8e8;border-color:#888}',
    '.ask-source-panel{margin-top:8px;padding:10px 12px;background:#fff;border:1px solid rgba(0,0,0,0.12);border-radius:10px;font-size:13px;line-height:1.55}',
    '.ask-source-panel h4{margin:0 0 6px 0;font-size:13px;font-weight:700}',
    '.ask-source-panel .ask-src-chapter{font-size:11px;color:#888;margin-bottom:4px}',
    '.ask-source-panel .ask-src-section{margin-top:8px;font-weight:700;font-size:12px;color:#444}',
    '.ask-source-panel .ask-md-table th,.ask-source-panel .ask-md-table td{font-size:11px}',
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

  function extractArticleRefs(text) {
    var matches = (text || '').match(/제\d+조(?:의\d+)?/g) || [];
    var uniq = [];
    matches.forEach(function(m) { if (uniq.indexOf(m) === -1) uniq.push(m); });
    return uniq;
  }

  function renderMarkdown(parent, text) {
    while (parent.firstChild) parent.removeChild(parent.firstChild);
    var lines = (text || '').split('\n');
    var i = 0;
    while (i < lines.length) {
      var line = lines[i];
      var trimmed = line.trim();
      if (!trimmed) { i++; continue; }
      var hMatch = /^(#{1,3})\s+(.+)$/.exec(trimmed);
      if (hMatch) {
        var h = document.createElement('div');
        h.className = 'ask-md-h';
        h.textContent = hMatch[2];
        parent.appendChild(h);
        i++;
        continue;
      }
      var sepNext = lines[i + 1] ? lines[i + 1].trim() : '';
      if (/^\|.*\|/.test(trimmed) && /^\|[\s:\-|]+\|/.test(sepNext)) {
        var headers = trimmed.split('|').slice(1, -1).map(function(c) { return c.trim(); });
        var tbl = document.createElement('table');
        tbl.className = 'ask-md-table';
        var thead = document.createElement('thead');
        var trh = document.createElement('tr');
        headers.forEach(function(htxt) {
          var th = document.createElement('th');
          th.textContent = htxt;
          trh.appendChild(th);
        });
        thead.appendChild(trh);
        tbl.appendChild(thead);
        var tbody = document.createElement('tbody');
        i += 2;
        while (i < lines.length && /^\|.*\|/.test(lines[i].trim())) {
          var cells = lines[i].trim().split('|').slice(1, -1).map(function(c) { return c.trim(); });
          var tr = document.createElement('tr');
          cells.forEach(function(ctxt) {
            var td = document.createElement('td');
            td.textContent = ctxt;
            tr.appendChild(td);
          });
          tbody.appendChild(tr);
          i++;
        }
        tbl.appendChild(tbody);
        parent.appendChild(tbl);
        continue;
      }
      var bulletRe = /^(?:[-•]|\(\d+\))\s+/;
      if (bulletRe.test(trimmed)) {
        var ul = document.createElement('ul');
        ul.className = 'ask-md-list';
        while (i < lines.length && bulletRe.test(lines[i].trim())) {
          var li = document.createElement('li');
          li.textContent = lines[i].trim().replace(bulletRe, '');
          ul.appendChild(li);
          i++;
        }
        parent.appendChild(ul);
        continue;
      }
      var p = document.createElement('div');
      p.className = 'ask-md-p';
      p.textContent = trimmed;
      parent.appendChild(p);
      i++;
    }
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

    function renderSources(assistantNode, sources, answerText) {
      if (!sources || !sources.length) return;
      var mentioned = extractArticleRefs(answerText || '');
      // Sort: sources whose title contains a mentioned ref come first (preserving mention order).
      var scored = sources.map(function(s) {
        var title = s.title || '';
        var priority = 99;
        for (var idx = 0; idx < mentioned.length; idx++) {
          if (title.indexOf(mentioned[idx]) !== -1) { priority = idx; break; }
        }
        return { s: s, priority: priority };
      });
      scored.sort(function(a, b) { return a.priority - b.priority; });

      var wrap = el('div', 'ask-sources');
      // Panel container appended AFTER the chip strip so expanded content
      // shows below all chips rather than splitting the row.
      var panelHost = el('div', 'ask-source-panel-host');
      var openState = { chip: null, panel: null };
      var seen = {};
      var rendered = 0;
      scored.forEach(function(entry) {
        if (rendered >= 5) return;
        var s = entry.s;
        if (!s.title || seen[s.title]) return;
        seen[s.title] = true;
        var cls = entry.priority < 99 ? 'ask-source-chip primary' : 'ask-source-chip';
        var chip = el('button', cls, s.title);
        chip.addEventListener('click', function() {
          // Toggle: if this chip is already open, collapse it.
          if (openState.chip === chip) {
            openState.chip.classList.remove('open');
            if (openState.panel && openState.panel.parentNode) {
              openState.panel.parentNode.removeChild(openState.panel);
            }
            openState.chip = null;
            openState.panel = null;
            return;
          }
          // Close previous open panel.
          if (openState.chip) openState.chip.classList.remove('open');
          if (openState.panel && openState.panel.parentNode) {
            openState.panel.parentNode.removeChild(openState.panel);
          }
          // Build new panel with structured article content.
          var panel = buildSourcePanel(s);
          panelHost.appendChild(panel);
          chip.classList.add('open');
          openState.chip = chip;
          openState.panel = panel;
          msgs.scrollTop = msgs.scrollHeight;
        });
        wrap.appendChild(chip);
        rendered++;
      });
      assistantNode.appendChild(wrap);
      assistantNode.appendChild(panelHost);
    }

    function buildSourcePanel(source) {
      var panel = el('div', 'ask-source-panel');
      var art = source.article;

      // Header: chapter + title
      if (art && art.chapter) {
        panel.appendChild(el('div', 'ask-src-chapter', art.chapter));
      }
      var h = document.createElement('h4');
      h.textContent = (art && art.title) || source.title || '';
      panel.appendChild(h);

      if (!art) {
        // Fallback when server didn't return structured data.
        panel.appendChild(el('div', 'ask-md-p', '원문 데이터를 불러올 수 없습니다.'));
        return panel;
      }

      // content paragraph
      if (art.content && art.content.trim()) {
        panel.appendChild(el('div', 'ask-md-p', art.content));
      }

      // clauses as bullet list
      if (Array.isArray(art.clauses) && art.clauses.length) {
        var ul = document.createElement('ul');
        ul.className = 'ask-md-list';
        art.clauses.forEach(function(c) {
          ul.appendChild(el('li', null, c));
        });
        panel.appendChild(ul);
      }

      // tables
      if (Array.isArray(art.tables) && art.tables.length) {
        art.tables.forEach(function(t) {
          if (t.title) panel.appendChild(el('div', 'ask-src-section', t.title));
          var tbl = document.createElement('table');
          tbl.className = 'ask-md-table';
          var thead = document.createElement('thead');
          var trh = document.createElement('tr');
          (t.headers || []).forEach(function(h) {
            var th = document.createElement('th');
            th.textContent = h;
            trh.appendChild(th);
          });
          thead.appendChild(trh);
          tbl.appendChild(thead);
          var tbody = document.createElement('tbody');
          (t.rows || []).forEach(function(row) {
            var tr = document.createElement('tr');
            row.forEach(function(cell) {
              var td = document.createElement('td');
              td.textContent = cell;
              tr.appendChild(td);
            });
            tbody.appendChild(tr);
          });
          tbl.appendChild(tbody);
          panel.appendChild(tbl);
        });
      }

      // related_agreements (side_agreement 혹은 article 의 부속 합의)
      if (Array.isArray(art.related_agreements) && art.related_agreements.length) {
        panel.appendChild(el('div', 'ask-src-section', '관련 합의'));
        var ragUl = document.createElement('ul');
        ragUl.className = 'ask-md-list';
        art.related_agreements.forEach(function(ra) {
          var li = document.createElement('li');
          var b = document.createElement('strong');
          b.textContent = '[' + (ra.date || '') + '] ' + (ra.title || '');
          li.appendChild(b);
          if (ra.content) {
            li.appendChild(document.createElement('br'));
            li.appendChild(document.createTextNode(ra.content));
          }
          ragUl.appendChild(li);
        });
        panel.appendChild(ragUl);
      }

      return panel;
    }

    function handleSend(articleHint) {
      var q = input.value.trim();
      if (!q || inflight) return;
      inflight = true;
      sendBtn.disabled = true;
      appendUser(q);
      input.value = '';
      var assistantNode = appendAssistant();

      fetch(apiBase() + '/rag/chat', {
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
        var rawAnswer = '';
        function pump() {
          return reader.read().then(function(chunk) {
            if (chunk.done) {
              if (serverError) {
                msgs.appendChild(el('div', 'ask-error', serverError));
              } else {
                // Replace streamed plain text with rendered markdown.
                renderMarkdown(assistantNode, rawAnswer);
                assistantNode.classList.add('rendered');
                renderSources(assistantNode, sources, rawAnswer);
                msgs.scrollTop = msgs.scrollHeight;
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
                  rawAnswer += ev.text;
                  assistantNode.textContent = rawAnswer;
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
