// utils-lazy.js — 큰 CDN 라이브러리를 필요할 때만 로드
// 홈 진입 시 1.1MB 다운로드를 피해 초기 로딩을 단축한다.
(function () {
  'use strict';

  var XLSX_URL = 'https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js';
  var PDFJS_URL = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';

  var _promises = {};

  function loadScript(key, url, globalCheck) {
    if (globalCheck()) return Promise.resolve();
    if (_promises[key]) return _promises[key];
    _promises[key] = new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = url;
      s.onload = function () {
        if (globalCheck()) resolve();
        else reject(new Error(key + ' 로드 후에도 전역이 없음'));
      };
      s.onerror = function () { reject(new Error(key + ' 로드 실패')); };
      document.head.appendChild(s);
    });
    return _promises[key];
  }

  window.loadXLSX = function () {
    return loadScript('xlsx', XLSX_URL, function () { return typeof window.XLSX !== 'undefined'; });
  };
  window.loadPDFJS = function () {
    return loadScript('pdfjs', PDFJS_URL, function () { return typeof window.pdfjsLib !== 'undefined'; });
  };
})();
