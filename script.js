/* =============================================
   RDS-OS · TERMINAL CONTROLLER
   ============================================= */

'use strict';

/* ---- Element refs ---- */
const $ = sel => document.querySelector(sel);
const $$ = sel => Array.from(document.querySelectorAll(sel));

const els = {
  boot:        $('#boot'),
  bootLog:     $('#bootLog'),
  terminal:    $('#terminal'),
  sysPath:     $('#sysPath'),
  promptPath:  $('#promptPath'),
  uptime:      $('#uptime'),
  output:      $('#output'),
  cmdInput:    $('#cmdInput'),
  cmdMirror:   $('#cmdMirror'),
  cmdHint:     $('#cmdHint'),
  cmdResponse: $('#cmdResponse'),
};

/* ---- Page registry ---- */
const PAGES = {
  home:              { id: 'page-home',         path: '~' },
  work:              { id: 'page-work',          path: '~/work' },
  about:             { id: 'page-about',         path: '~/about' },
  talks:             { id: 'page-talks',         path: '~/talks' },
  contact:           { id: 'page-contact',       path: '~/contact' },
  help:              { id: 'page-help',          path: '~/help' },
  'onehq-comhub':    { id: 'page-com-hub',       path: '~/work/onehq-comhub' },
  'onehq-reports':   { id: 'page-reports',       path: '~/work/onehq-reports' },
  'onehq-workflow':  { id: 'page-workflow',      path: '~/work/onehq-workflow' },
};

/* ---- Preview / deep-link mode ----
   Path-based (clean URLs via 404.html → ?p= redirect):
     /work              → work list
     /cat/onehq-workflow → case study
   Query-param fallback (still supported):
     ?preview           → unlocks work, stays on home
     ?work              → work list
     ?cat=X             → case study
---------------------------------------------------- */
const _params   = new URLSearchParams(window.location.search);
// ?p= is set by 404.html when GitHub Pages catches an unknown path
const _pParam   = _params.get('p');
const _pPath    = _pParam ? _pParam.replace(/^\//, '').split('/') : [];
const _path     = window.location.pathname.replace(/^\//, '').split('/');
const _keyFrom  = seg => (seg[0] === 'cat' ? seg[1] : seg[0] === 'work' ? 'work' : seg[0] === 'talks' ? 'talks' : null);
const _pathKey  = _keyFrom(_pPath) || _keyFrom(_path);
const DEEPLINK  = _pathKey
               || (_params.has('work') ? 'work' : null)
               || (_params.has('cat')  ? _params.get('cat') : null);
// talks is a public page — deep-linking to it should not unlock the work chips
const PREVIEW   = (!!DEEPLINK && DEEPLINK !== 'talks') || _params.has('preview');

/* ---- State ---- */
const state = {
  history: [],
  histIdx: -1,
  current: 'home',
};

/* =============================================
   BOOT SEQUENCE
   ============================================= */
const BOOT_LINES = [
  { t: '✻ rds-os v1.0  ·  starting session',                    c: 'claude' },
  { t: '',                                                       c: 'dim'    },
  { t: '  loading /work ..................... [ OK ]',           c: 'ok'     },
  { t: '  loading /brisaola .................. [ OK ]',           c: 'ok'     },
  { t: '  starting ux-daemon ................ [ OK ]',           c: 'ok'     },
  { t: '  syncing design-system ............. [ OK ]',           c: 'ok'     },
  { t: '  auth: yo@ricardo2s.me .............. [ OK ]',           c: 'ok'     },
  { t: '',                                                       c: 'dim'    },
  { t: '  tip: type /help to see commands.',                     c: 'dim'    },
];

function runBoot() {
  let i = 0;
  function step() {
    if (i >= BOOT_LINES.length) {
      setTimeout(finishBoot, 300);
      return;
    }
    const line = BOOT_LINES[i];
    const span = document.createElement('span');
    span.className = line.c;
    span.textContent = line.t + '\n';
    els.bootLog.appendChild(span);
    i++;
    setTimeout(step, 80 + Math.random() * 90);
  }
  step();
}

function finishBoot() {
  els.boot.style.transition = 'opacity 250ms ease';
  els.boot.style.opacity = '0';
  setTimeout(() => {
    els.boot.style.display = 'none';
    els.terminal.hidden = false;
    if (DEEPLINK && PAGES[DEEPLINK]) {
      navigate(DEEPLINK);
    } else {
      els.cmdInput.focus();
      setActiveNav('home');
    }
  }, 250);
}

/* =============================================
   KERNEL PANIC
   ============================================= */
function kernelPanic() {
  const term = els.terminal;
  const GLITCH = '░▒▓█▄▀■□▪▫◆●○⊕⊗▮▯⚡✖⚠';

  /* ---- scramble + resolve effect ---- */
  function scramble(el, final, duration) {
    let frame = 0;
    const frames = 10;
    const iv = duration / frames;
    (function tick() {
      if (frame >= frames) { el.textContent = final; return; }
      const p = frame / frames;
      el.textContent = final.split('').map(c =>
        c === ' ' ? ' ' : Math.random() < p ? c : GLITCH[Math.floor(Math.random() * GLITCH.length)]
      ).join('');
      frame++;
      setTimeout(tick, iv);
    })();
  }

  /* ---- glitch header path briefly ---- */
  const origPath = els.sysPath.textContent;
  let hframe = 0;
  const hiv = setInterval(() => {
    els.sysPath.textContent = origPath.split('').map(c =>
      Math.random() < 0.4 ? GLITCH[Math.floor(Math.random() * GLITCH.length)] : c
    ).join('');
    if (++hframe > 6) { clearInterval(hiv); els.sysPath.textContent = origPath; }
  }, 60);

  /* ---- shake + flash the terminal ---- */
  term.classList.add('is-panicking');
  setTimeout(() => term.classList.remove('is-panicking'), 900);

  /* ---- multi-scanline overlay ---- */
  const overlay = document.createElement('div');
  overlay.className = 'panic-overlay';

  const flash = document.createElement('div');
  flash.className = 'panic-flash-layer';
  overlay.appendChild(flash);

  [[0.3, 0], [0.45, 120], [0.25, 220]].forEach(([dur, delay]) => {
    setTimeout(() => {
      const sl = document.createElement('div');
      sl.className = 'panic-scanline';
      sl.style.animationDuration = `${dur}s`;
      overlay.appendChild(sl);
      setTimeout(() => sl.remove(), dur * 1000 + 50);
    }, delay);
  });

  document.body.appendChild(overlay);
  setTimeout(() => overlay.remove(), 800);

  /* ---- fake hex dump lines ---- */
  function hexLine() {
    const addr = (Math.random() * 0xfffff | 0).toString(16).padStart(8,'0');
    const bytes = Array.from({length:8}, () =>
      (Math.random()*0xff|0).toString(16).padStart(2,'0')).join(' ');
    return `0xffff${addr}: ${bytes}  ??`;
  }

  const LINES = [
    { t: 'KERNEL PANIC — not syncing',                            cls: 'panic-line' },
    { t: '/work/case-files: segmentation fault (core dumped)',    cls: 'panic-line' },
    { t: '',                                                      cls: '' },
    { t: hexLine(),                                               cls: 'panic-line hex' },
    { t: hexLine(),                                               cls: 'panic-line hex' },
    { t: hexLine(),                                               cls: 'panic-line hex' },
    { t: '',                                                      cls: '' },
    { t: 'CPU: 0 PID: 1337  Comm: rds-os  Tainted: P',           cls: 'panic-line dim' },
    { t: 'RIP: 0010:navigate_work+0x00/0xff  [rds-os]',          cls: 'panic-line dim' },
    { t: 'RSP: 0000:ffffc900  EFLAGS: 00010246',                  cls: 'panic-line dim' },
    { t: 'Call Trace:',                                           cls: 'panic-line dim' },
    { t: '  <TASK>  open_case_files+0x42/0x80',                  cls: 'panic-line dim' },
    { t: '  <TASK>  execute_command+0x1f/0x40',                  cls: 'panic-line dim' },
    { t: '  <TASK>  handle_portfolio_request+0x8/0x10',          cls: 'panic-line dim' },
    { t: '',                                                      cls: '' },
    { t: '!! PERMISSION DENIED  —  /work is classified !!',      cls: 'panic-line' },
    { t: '!! HALTING EXECUTION !!',                              cls: 'panic-line' },
    { t: '',                                                      cls: '' },
    { t: '__BANNER__',                                           cls: '__banner__' },
    { t: '// case files loading. check back soon.',              cls: 'panic-note' },
  ];

  let delay = 60;
  LINES.forEach(line => {
    setTimeout(() => {
      if (line.cls === '__banner__') {
        const div = document.createElement('div');
        div.className = 'result-line';
        const wrap = document.createElement('span');
        wrap.className = 'panic-banner-wrap';

        const ghost = document.createElement('span');
        ghost.className = 'panic-banner-ghost';
        ghost.textContent = 'ACCESS DENIED';

        const banner = document.createElement('span');
        banner.className = 'panic-banner';
        banner.textContent = '▓▒░▓▒░▓▒░▓▒░▒';

        wrap.appendChild(ghost);
        wrap.appendChild(banner);
        div.appendChild(wrap);
        els.cmdResponse.appendChild(div);
        els.cmdResponse.hidden = false;
        scramble(banner, 'ACCESS DENIED', 500);
      } else {
        const div = document.createElement('div');
        div.className = `result-line ${line.cls}`;
        div.textContent = line.t;
        els.cmdResponse.appendChild(div);
        els.cmdResponse.hidden = false;
      }
      scrollResponse();
    }, delay);
    delay += line.t ? 42 + Math.random() * 30 : 18;
  });
}

/* =============================================
   COMMAND ROUTER
   ============================================= */
function navigate(pageKey) {
  const page = PAGES[pageKey];
  if (!page) return false;

  $$('.page').forEach(p => p.classList.remove('is-active'));
  const el = document.getElementById(page.id);
  if (!el) return false;
  el.classList.add('is-active');
  els.sysPath.textContent = page.path;
  if (els.promptPath) els.promptPath.textContent = page.path;
  state.current = pageKey;
  els.output.scrollTop = 0;
  setActiveNav(pageKey);

  // clear any panic / response output on navigation
  els.cmdResponse.innerHTML = '';
  els.cmdResponse.hidden = true;

  return true;
}

function setActiveNav(key) {
  $$('.quick-nav .cmd-chip').forEach(b => {
    b.classList.toggle('is-active', b.dataset.cmd === key);
  });
}

const COMMANDS = {

  // navigation
  home:    () => { navigate('home');    return null; },
  work:    () => { kernelPanic(); return null; },
  about:   () => { navigate('about');   return null; },
  talks:   () => { navigate('talks');   return null; },
  contact: () => { navigate('contact'); return null; },
  help:    () => { navigate('help');    return null; },

  // open case file
  cat: (name) => {
    if (!name) return { err: 'usage: cat <file>. try `cat onehq-comhub`' };
    kernelPanic(); return null;
    // (buttons bypass this handler and call navigate() directly)
    const key = name.replace(/\.case$/, '').toLowerCase();
    if (PAGES[key] && key.startsWith('onehq-')) {
      navigate(key);
      return null;
    }
    return { err: `cat: ${name}: no such file. type 'work' to list.` };
  },

  // listing
  ls: () => {
    return [
      'drwxr-xr-x  work/      // selected case files',
      'drwxr-xr-x  about/     // whoami',
      'drwxr-xr-x  talks/     // talks & press',
      'drwxr-xr-x  contact/   // say hi',
      '-rw-r--r--  README     // type "help" for commands',
    ].join('\n');
  },

  pwd: () => PAGES[state.current]?.path || '~',

  whoami: () => 'ricardo dos santos · product & ux designer · sondrio,IT · @ onehq (5y)',

  // contact shortcuts
  schedule: () => {
    const url = 'https://calendar.notion.so/meet/ricardodossantos/quick-talk';
    window.open(url, '_blank');
    return { ok: 'opening schedule link…' };
  },

  email: () => ({ err: 'no public email. use `schedule` to book a quick call.' }),

  links: () => [
    'schedule  · calendar.notion.so/meet/ricardodossantos/quick-talk',
    'linkedin  · linkedin.com/in/dsmartinucci',
    'dribbble  · dribbble.com/dsmartinucci',
  ].join('\n'),

  social: () => COMMANDS.links(),

  // utilities
  date: () => new Date().toString(),
  uptime: () => `up since page-load · ${$('#uptime').textContent}`,

  clear: () => {
    els.cmdResponse.innerHTML = '';
    els.cmdResponse.hidden = true;
    return null;
  },

  theme: () => {
    const cur = document.documentElement.dataset.theme;
    const next = cur === 'amber' ? '' : 'amber';
    if (next) document.documentElement.dataset.theme = next;
    else document.documentElement.removeAttribute('data-theme');
    return { ok: `theme → ${next || 'green'}` };
  },

  // playful
  '?': () => 'try `coffee`, `vim`, `sudo …`, `ricardo`, or `theme`.',

  sudo: (...args) => ({ err: `sudo: ${args.join(' ') || '<empty>'}: permission denied. (this is a portfolio.)` }),

  rm: () => ({ err: 'nope.' }),

  vim: () => 'use `cat` instead. you\'ll thank me later.',

  ricardo: () => 'you found me.',

  hello: () => 'hi 👋. type `work` to see what i\'ve been shipping.',
  hi:    () => COMMANDS.hello(),
  hey:   () => COMMANDS.hello(),

  coffee: () => `      ( (
       ) )
    .________.
    |        |]
    \\       /
     \`-----'
    ~ always ~`,

  exit: () => ({ err: 'cannot exit. you\'re part of the portfolio now.' }),

  // modern tooling (subtle): these feel native if you live in agentic CLIs
  stack: () => [
    'design     · Figma · Figma AI · design systems · prototyping · motion',
    'research   · interviews · usability · synthesis · Perplexity',
    'building   · HTML/CSS/TS · light React · v0 · bolt.new',
    'ai tooling · Claude Code · Cursor · MCP · agents · skills · hooks',
  ].join('\n'),

  '/help':   () => COMMANDS.help(),
  '/agents': () => 'I prototype with them daily. See `stack`.',
  '/mcp':    () => [
    'mcp://figma     · ready',
    'mcp://notion    · ready',
    'mcp://calendar  · ready',
    '// fictional, but the workflow is real.',
  ].join('\n'),
  '/skills': () => COMMANDS.stack(),
  '/init':   () => 'already initialized. welcome.',
};

/* ---- Aliases ---- */
COMMANDS['ls -la']      = COMMANDS.ls;
COMMANDS['ls -la /']    = COMMANDS.ls;
COMMANDS.h              = COMMANDS.help;
COMMANDS.who            = COMMANDS.whoami;
COMMANDS.tools          = COMMANDS.stack;

/* =============================================
   COMMAND EXECUTION
   ============================================= */
function execute(line) {
  const trimmed = line.trim();
  if (!trimmed) return;

  // history
  state.history.push(trimmed);
  state.histIdx = state.history.length;

  // parse
  const parts = trimmed.split(/\s+/);
  const cmd = parts[0].toLowerCase();
  const args = parts.slice(1);

  const fn = COMMANDS[cmd];
  let result;

  if (fn) {
    try {
      result = fn(...args);
    } catch (e) {
      result = { err: `error: ${e.message}` };
    }
  } else {
    result = { err: `command not found: ${cmd}. try \`help\`` };
  }

  if (result === null) {
    // page navigation, no echo needed unless desired
    appendEcho(trimmed);
  } else {
    appendEcho(trimmed);
    appendResult(result);
  }
}

function appendEcho(cmd) {
  const div = document.createElement('div');
  div.className = 'echo';
  div.innerHTML = `<span class="chev">&gt;</span> ${escapeHtml(cmd)}`;
  els.cmdResponse.appendChild(div);
  els.cmdResponse.hidden = false;
  scrollResponse();
}

function appendResult(result) {
  const div = document.createElement('div');
  div.classList.add('result-line');

  if (result == null) return;

  if (typeof result === 'string') {
    if (result.includes('\n')) {
      const pre = document.createElement('pre');
      pre.textContent = result;
      div.appendChild(pre);
    } else {
      div.textContent = result;
    }
  } else if (result.err) {
    div.classList.add('err');
    div.textContent = result.err;
  } else if (result.ok) {
    div.classList.add('ok');
    div.textContent = result.ok;
  }

  els.cmdResponse.appendChild(div);
  scrollResponse();
}

function scrollResponse() {
  els.cmdResponse.scrollTop = els.cmdResponse.scrollHeight;
}

function escapeHtml(s) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/* =============================================
   INPUT MIRROR (display typed text + cursor)
   ============================================= */
function syncMirror() {
  const v = els.cmdInput.value;
  els.cmdMirror.textContent = v;
  if (els.cmdHint) els.cmdHint.classList.toggle('is-hidden', v.length > 0);
}

/* =============================================
   INPUT EVENTS
   ============================================= */
function onKeyDown(e) {
  if (e.key === 'Enter') {
    const v = els.cmdInput.value;
    els.cmdInput.value = '';
    syncMirror();
    execute(v);
    return;
  }
  if (e.key === 'ArrowUp') {
    if (state.histIdx > 0) {
      state.histIdx--;
      els.cmdInput.value = state.history[state.histIdx];
      syncMirror();
      requestAnimationFrame(() => els.cmdInput.setSelectionRange(els.cmdInput.value.length, els.cmdInput.value.length));
    }
    e.preventDefault();
    return;
  }
  if (e.key === 'ArrowDown') {
    if (state.histIdx < state.history.length - 1) {
      state.histIdx++;
      els.cmdInput.value = state.history[state.histIdx];
    } else {
      state.histIdx = state.history.length;
      els.cmdInput.value = '';
    }
    syncMirror();
    e.preventDefault();
    return;
  }
  if (e.key === 'Tab') {
    e.preventDefault();
    autocomplete();
  }
  if (e.key === 'l' && (e.ctrlKey || e.metaKey)) {
    // Ctrl+L → clear
    e.preventDefault();
    COMMANDS.clear();
  }
}

function autocomplete() {
  const v = els.cmdInput.value.trim().toLowerCase();
  if (!v) return;
  const matches = Object.keys(COMMANDS).filter(c => c.startsWith(v) && !c.includes(' '));
  if (matches.length === 1) {
    els.cmdInput.value = matches[0];
    syncMirror();
  } else if (matches.length > 1) {
    appendEcho(v);
    appendResult(matches.join('   '));
  }
}

/* =============================================
   QUICK NAV CHIPS
   ============================================= */
function bindChips() {
  $$('[data-cmd]').forEach(btn => {
    btn.addEventListener('click', () => {
      const cmd = btn.dataset.cmd;
      // Case file buttons bypass the terminal and navigate directly
      if (cmd.startsWith('cat onehq-')) {
        const key = cmd.replace('cat ', '');
        if (PAGES[key]) { navigate(key); return; }
      }
      execute(cmd);
      els.cmdInput.focus();
    });
  });
}

/* =============================================
   FILE ROW NAVIGATION (work page)
   ============================================= */
function bindFileRows() {
  $$('.file:not(.file-locked)').forEach(file => {
    file.addEventListener('click', (e) => {
      // ignore if user clicked on the [open] button (already bound via data-cmd)
      if (e.target.closest('[data-cmd]')) return;
      const targetId = file.dataset.target;
      if (!targetId) return;
      const key = Object.keys(PAGES).find(k => PAGES[k].id === targetId);
      if (key) {
        // Case files navigate directly; other keys go through terminal
        if (key.startsWith('onehq-')) navigate(key);
        else execute(key);
      }
    });
  });
}

/* =============================================
   CASE IMAGE ZOOM (click → open full-size)
   ============================================= */
function bindCaseImages() {
  document.addEventListener('click', (e) => {
    const img = e.target.closest('.case-img img');
    if (!img) return;
    window.open(img.src, '_blank', 'noopener');
  });
}

/* =============================================
   UPTIME COUNTER
   ============================================= */
function startUptime() {
  const start = Date.now();
  function tick() {
    const s = Math.floor((Date.now() - start) / 1000);
    const h = String(Math.floor(s / 3600)).padStart(2, '0');
    const m = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
    const ss = String(s % 60).padStart(2, '0');
    els.uptime.textContent = `${h}:${m}:${ss}`;
  }
  tick();
  setInterval(tick, 1000);
}

/* =============================================
   FOCUS HELPERS
   ============================================= */
function bindFocus() {
  // Click anywhere → focus input (unless clicking link/button/input)
  document.addEventListener('click', (e) => {
    if (e.target.closest('a, button, input, .file')) return;
    els.cmdInput.focus();
  });

  // Any keystroke (when not focused on input) → focus input
  document.addEventListener('keydown', (e) => {
    if (document.activeElement === els.cmdInput) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.key.length === 1 || e.key === 'Backspace') {
      els.cmdInput.focus();
    }
  });
}

/* =============================================
   BOOT
   ============================================= */
document.addEventListener('DOMContentLoaded', () => {
  startUptime();

  // preview mode: show work chips hidden by default
  if (PREVIEW) {
    $$('[data-cmd="work"]').forEach(el => el.style.display = '');
  }

  bindChips();
  bindFileRows();
  bindFocus();
  bindCaseImages();
  els.cmdInput.addEventListener('keydown', onKeyDown);
  els.cmdInput.addEventListener('input', syncMirror);
  syncMirror();

  runBoot();
});
