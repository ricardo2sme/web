/* =============================================
   ROUTER
   Home is one page; each case study is its own view.
   Clean URLs are served by the SPA fallback in wrangler.toml,
   so every link also works as a plain full page load.
   ============================================= */

'use strict';

const $  = sel => document.querySelector(sel);
const $$ = sel => Array.from(document.querySelectorAll(sel));

const BASE_TITLE = 'Ricardo Dos Santos · Product & UX Designer';

const PAGES = {
  home:             { id: 'page-home',     url: '/',                   title: BASE_TITLE },
  'onehq-workflow': { id: 'page-workflow', url: '/cat/onehq-workflow', title: 'Workflow Automation Builder · Ricardo Dos Santos' },
  'onehq-comhub':   { id: 'page-com-hub',  url: '/cat/onehq-comhub',   title: 'Work & Communication Hub · Ricardo Dos Santos' },
  'onehq-reports':  { id: 'page-reports',  url: '/cat/onehq-reports',  title: 'Report Builder · Ricardo Dos Santos' },
};

// Old URLs still get shared — land them on home, at the right section.
const LEGACY = {
  work:    'work',
  talks:   'talks',
  about:   'experience',
  contact: 'contact',
  help:    null,
};

/* ---- Resolve the incoming URL ----------------------------------- */
const params = new URLSearchParams(location.search);
// ?p= is set by 404.html on hosts without an SPA fallback
const raw    = (params.get('p') || location.pathname).replace(/^\/+/, '').split('/');

function resolve(seg) {
  if (seg[0] === 'cat' && PAGES[seg[1]]) return { page: seg[1] };
  if (seg[0] in LEGACY)                  return { page: 'home', anchor: LEGACY[seg[0]] };
  if (params.has('cat') && PAGES[params.get('cat')]) return { page: params.get('cat') };
  if (params.has('work'))                return { page: 'home', anchor: 'work' };
  return { page: 'home' };
}

/* ---- Navigation -------------------------------------------------- */
function navigate(key, opts = {}) {
  const page = PAGES[key];
  if (!page) return false;

  $$('.page').forEach(p => p.classList.remove('is-active'));
  const el = document.getElementById(page.id);
  if (!el) return false;
  el.classList.add('is-active');

  // A hidden page has no layout, so its lazy images never enter the
  // viewport and never load. Promote them once the page is shown.
  el.querySelectorAll('img[loading="lazy"]').forEach(img => { img.loading = 'eager'; });

  document.title = page.title;

  if (opts.history !== false) {
    const method = opts.replace ? 'replaceState' : 'pushState';
    history[method]({ page: key }, '', page.url);
  }

  if (opts.anchor) {
    const target = document.getElementById(opts.anchor);
    if (target) { target.scrollIntoView(); return true; }
  }
  window.scrollTo(0, 0);
  return true;
}

window.addEventListener('popstate', e => {
  const key = (e.state && e.state.page) || resolve(location.pathname.replace(/^\/+/, '').split('/')).page;
  navigate(key, { history: false });
});

/* ---- Intercept internal links so navigation stays client-side ---- */
document.addEventListener('click', e => {
  const a = e.target.closest('a[href]');
  if (!a) return;
  if (a.target === '_blank' || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;

  const url = new URL(a.href, location.origin);
  if (url.origin !== location.origin) return;

  const { page, anchor } = resolve(url.pathname.replace(/^\/+/, '').split('/'));
  if (!PAGES[page]) return;

  e.preventDefault();
  navigate(page, { anchor });
});

/* ---- Copy to clipboard -------------------------------------------
   Three rungs, because the clipboard is never guaranteed: the async
   API (needs a secure context, a user gesture, and permission), then
   execCommand, and finally selecting the text so the reader can copy
   it by hand. Only the last rung tells them to press ⌘C — by then the
   text really is selected, so the instruction is true.
-------------------------------------------------------------------- */
async function copyText(text) {
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch { /* fall through */ }
  }

  const ta = document.createElement('textarea');
  ta.value = text;
  ta.setAttribute('readonly', '');
  ta.style.cssText = 'position:fixed;top:-1000px;opacity:0';
  document.body.appendChild(ta);
  ta.select();
  let ok = false;
  try { ok = document.execCommand('copy'); } catch { ok = false; }
  ta.remove();
  return ok;
}

function selectNode(el) {
  const range = document.createRange();
  range.selectNodeContents(el);
  const sel = window.getSelection();
  sel.removeAllRanges();
  sel.addRange(range);
}

document.addEventListener('click', async e => {
  const btn = e.target.closest('[data-copy]');
  if (!btn) return;

  if (!btn.dataset.idle) btn.dataset.idle = btn.textContent;

  if (await copyText(btn.dataset.copy)) {
    btn.textContent = 'copied';
  } else {
    // last resort: put it on screen, selected, and say so honestly
    const shown = btn.closest('.row')?.querySelector('.row-sub');
    if (shown) selectNode(shown);
    btn.textContent = 'press ⌘C';
  }

  btn.classList.add('is-done');
  clearTimeout(btn.resetTimer);
  btn.resetTimer = setTimeout(() => {
    btn.textContent = btn.dataset.idle;
    btn.classList.remove('is-done');
  }, 1600);
});

/* ---- Boot -------------------------------------------------------- */
const entry = resolve(raw);
navigate(entry.page, { replace: true, anchor: entry.anchor });
