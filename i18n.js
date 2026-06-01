/* Already — i18n engine v1
   Auto-detects browser language (navigator.languages → localStorage → 'en').
   Translations live in /i18n/{lang}.json, fetched once per session and cached.
   Exposes window.__alSetLang(lang) for the nav selects. */
(function () {
  'use strict';

  var SUPPORTED = ['en', 'de', 'es', 'it', 'fr'];
  var _cache = {};
  var _current = 'en';

  function _detect() {
    var stored = localStorage.getItem('al-lang');
    if (stored && SUPPORTED.indexOf(stored) !== -1) return stored;
    var langs = Array.isArray(navigator.languages)
      ? navigator.languages
      : [navigator.language || 'en'];
    for (var i = 0; i < langs.length; i++) {
      var c = langs[i].split('-')[0].toLowerCase();
      if (SUPPORTED.indexOf(c) !== -1) return c;
    }
    return 'en';
  }

  function _syncSelects(lang) {
    var els = document.querySelectorAll('.lang-select');
    for (var i = 0; i < els.length; i++) els[i].value = lang;
  }

  function _apply(trans) {
    var els = document.querySelectorAll('[data-i18n]');
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      var key = el.getAttribute('data-i18n');
      if (trans[key] === undefined) continue;
      /* Cache original English markup once */
      if (!el.hasAttribute('data-i18n-orig')) {
        el.setAttribute('data-i18n-orig', el.innerHTML);
      }
      if (el.hasAttribute('data-i18n-html')) {
        el.innerHTML = trans[key];
      } else {
        el.textContent = trans[key];
      }
    }
    document.documentElement.setAttribute('lang', _current);
    _syncSelects(_current);
  }

  function _restore() {
    var els = document.querySelectorAll('[data-i18n-orig]');
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      if (el.hasAttribute('data-i18n-html')) {
        el.innerHTML = el.getAttribute('data-i18n-orig');
      } else {
        el.textContent = el.getAttribute('data-i18n-orig');
      }
    }
    document.documentElement.setAttribute('lang', 'en');
    _syncSelects('en');
  }

  window.__alSetLang = function (lang) {
    if (SUPPORTED.indexOf(lang) === -1) lang = 'en';
    _current = lang;
    localStorage.setItem('al-lang', lang);
    if (lang === 'en') { _restore(); return; }
    if (_cache[lang]) { _apply(_cache[lang]); return; }
    fetch('/i18n/' + lang + '.json')
      .then(function (r) { return r.json(); })
      .then(function (d) { _cache[lang] = d; _apply(d); })
      .catch(function () { _current = 'en'; _syncSelects('en'); });
  };

  function _init() {
    _current = _detect();
    _syncSelects(_current);
    if (_current !== 'en') window.__alSetLang(_current);
  }

  /* Handle both defer (readyState may already be interactive) and inline loading */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _init);
  } else {
    _init();
  }
})();
