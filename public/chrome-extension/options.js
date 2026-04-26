/**
 * SNUH Mate Companion — Options page
 */
(function () {
  'use strict';

  var DEFAULTS = {
    domain: 'snuhmate.com',
    debugMode: false
  };

  function load() {
    chrome.storage.local.get('options', function (data) {
      var opts = data.options || DEFAULTS;
      document.getElementById('domain').value = opts.domain || DEFAULTS.domain;
      document.getElementById('debugMode').checked = !!opts.debugMode;
    });
  }

  function save() {
    var opts = {
      domain: document.getElementById('domain').value.trim() || DEFAULTS.domain,
      debugMode: document.getElementById('debugMode').checked
    };
    chrome.storage.local.set({ options: opts }, function () {
      var status = document.getElementById('status');
      status.textContent = '저장 완료';
      setTimeout(function () { status.textContent = ''; }, 2000);
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    load();
    document.getElementById('saveBtn').addEventListener('click', save);
  });
})();
