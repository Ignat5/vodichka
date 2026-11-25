// Водичка — screens, reminders, sounds and celebrations.
'use strict';
{
const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const WEEK = [['Пн', 1], ['Вт', 2], ['Ср', 3], ['Чт', 4], ['Пт', 5], ['Сб', 6], ['Вс', 0]];

/* ================= sounds (synthesised, no files) ================= */
const Sound = {
  ctx: null,
  unlock() {
    try {
      if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      if (this.ctx.state === 'suspended') this.ctx.resume();
    } catch (e) { this.ctx = null; }
  },
  buffer(sec, fill) {
    const c = this.ctx, n = Math.floor(sec * c.sampleRate), b = c.createBuffer(1, n, c.sampleRate), ch = b.getChannelData(0);
    fill(ch, n, c.sampleRate);
    return b;
  },
  play(b) {
    if (!this.ctx || this.ctx.state !== 'running') return;
    const s = this.ctx.createBufferSource(); s.buffer = b; s.connect(this.ctx.destination); s.start();
  },
  pour() {
    if (!Store.set.soundPour || !this.ctx) return;
    this.pourB = this.pourB || this.buffer(0.62, (ch, n, sr) => {
      for (const [st, f] of [[0, 380], [0.09, 520], [0.17, 450], [0.26, 640], [0.34, 560], [0.43, 760]]) {
        const s0 = Math.floor(st * sr), len = Math.floor(0.08 * sr), k = f * 2.5 / 0.08;
        for (let j = 0; j < len && s0 + j < n; j++) {
          const t = j / sr;
          ch[s0 + j] += Math.sin(2 * Math.PI * (f * t + 0.5 * k * t * t)) * Math.exp(-t * 38) * Math.min(1, t * 400) * 0.32;
        }
      }
    });
    this.play(this.pourB);
  },
  meow() {
    if (!Store.set.soundMeow || !this.ctx) return;
    this.meowB = this.meowB || this.buffer(0.62, (ch, n, sr) => {
      const dur = 0.62; let ph = 0;
      for (let i = 0; i < n; i++) {
        const t = i / sr, x = t / dur;
        let f0 = x < 0.3 ? 560 + 280 * (x / 0.3) : 840 - 370 * Math.pow((x - 0.3) / 0.7, 0.8);
        f0 *= 1 + 0.02 * Math.sin(2 * Math.PI * 6 * t);
        ph += 2 * Math.PI * f0 / sr;
        const fm = x < 0.35 ? 2200 - 900 * (x / 0.35) : 1300 - 500 * ((x - 0.35) / 0.65);
        let s = 0;
        for (let h = 1; h <= 7; h++) { const fh = h * f0; s += (Math.exp(-Math.pow(fh - fm, 2) / (2 * 650 * 650)) + 0.35 / h) * Math.sin(h * ph); }
        ch[i] = s * Math.min(1, t / 0.05) * Math.max(0, Math.min(1, (dur - t) / 0.16)) * 0.14;
      }
    });
    this.play(this.meowB);
  },
  purr() {
    if (!Store.set.soundPurr || !this.ctx) return;
    this.purrB = this.purrB || this.buffer(1.5, (ch, n, sr) => {
      let lp = 0, lp2 = 0;
      for (let i = 0; i < n; i++) {
        const t = i / sr;
        lp += 0.06 * ((Math.random() * 2 - 1) - lp);
        lp2 += 0.08 * (lp - lp2);
        const am = Math.pow(0.5 + 0.5 * Math.sin(2 * Math.PI * 24 * t), 2.2);
        const breath = 0.6 + 0.4 * Math.sin(2 * Math.PI * 0.9 * t - 1.2);
        const env = Math.min(1, t / 0.15) * Math.min(1, (1.5 - t) / 0.3);
        ch[i] = (lp2 * 5 + 0.25 * Math.sin(2 * Math.PI * 48 * t)) * am * breath * env * 0.5;
      }
    });
    this.play(this.purrB);
  }
};
document.addEventListener('pointerdown', () => Sound.unlock(), { capture: true });
document.addEventListener('keydown', () => Sound.unlock(), { capture: true });

/* ================= the installed desktop app (optional) ================= */
const Desk = {
  d: null, inApp: false, install: 'unavailable', perms: {},
  async init() {
    const use = window.claude && window.claude.use;
    if (!use) return;
    try { this.d = await use('desktop'); } catch (e) { this.d = null; }
    const d = this.d;
    if (d && d.notification) {
      this.inApp = true;
      drawAppIcon().then(u => { if (u) d.app.dock.setIcon(u).catch(() => {}); });
      await this.readPerms();
      this.update();
    } else if (d && d.install) {
      try { this.install = await d.install.state(); } catch (e) { this.install = 'unavailable'; }
    }
    render();
  },
  async readPerms() { try { this.perms = await this.d.permissions.state(); } catch (e) { this.perms = {}; } },
  async request() {
    try { this.perms = await this.d.permissions.request(['notifications', 'menu-bar']); } catch (e) { /* refused or hidden */ }
    this.update(); render();
  },
  async doInstall() {
    try { this.install = (await this.d.install.request()) === 'installed' ? 'installed' : this.install; } catch (e) { /* needs a click */ }
    render();
  },
  update() {
    if (!this.inApp) return;
    const d = this.d, tot = Store.todayTotal();
    d.app.dock.setBadge(Store.set.onboarded && tot > 0 ? Fmt.liters(tot) : '').catch(() => {});
    if (this.perms['menu-bar'] !== 'granted') return;
    const cups = Store.set.cups.slice(0, 4).map(c => ({ label: `${c.emoji} ${c.name}, ${c.ml} мл`, click: () => UI.drink(c.ml, 'water') }));
    d.tray.set({
      title: '💧 ' + Fmt.liters(tot),
      toolTip: Store.goalReached() ? 'Миска полная! 😻' : 'Осталось ' + Fmt.amount(Store.remaining()),
      menu: [...cups, { type: 'separator' },
        { label: Store.isPaused() ? 'Разбудить котиков' : 'Пауза на 1 час', click: () => { Store.isPaused() ? Store.resume() : Store.pause(60); Rem.tick(); } },
        { label: 'Открыть Водичку', click: () => d.window.show().catch(() => {}) }]
    }).catch(() => {});
  },
  notify(text) {
    if (!this.inApp || !Store.set.notify || this.perms.notifications !== 'granted') return;
    this.d.notification.show({ body: text.slice(0, 300) }).catch(() => {});
  },
  front() { if (this.inApp) this.d.window.show().catch(() => {}); }
};

/* ================= on its own website: install, notifications, offline ================= */
const Web = {
  on: !(window.claude && window.claude.use) && /^https?:$/.test(location.protocol),
  installEvt: null, reg: null,
  installed: matchMedia('(display-mode: standalone)').matches || navigator.standalone === true,
  init() {
    if (!this.on) return;
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js').then(r => { this.reg = r; }).catch(() => {});
      navigator.serviceWorker.addEventListener('message', e => this.fromNotice(e.data && e.data.type));
    }
    addEventListener('beforeinstallprompt', e => { e.preventDefault(); this.installEvt = e; render(); });
    addEventListener('appinstalled', () => { this.installEvt = null; this.installed = true; render(); });
    const q = new URLSearchParams(location.search).get('act');
    if (q) { history.replaceState(null, '', location.pathname); setTimeout(() => this.fromNotice(q), 300); }
  },
  fromNotice(type) {
    if (type === 'drank') { const c = Store.quickCup(); Rem.close(); UI.drink(c.ml, 'water'); }
    else if (type === 'snooze') { if (Rem.showing && !Rem.showing.msg) Rem.snooze(); }
  },
  perm() { return 'Notification' in window ? Notification.permission : 'unsupported'; },
  async ask() { try { await Notification.requestPermission(); } catch (e) { /* refused */ } render(); },
  async install() {
    if (!this.installEvt) return;
    this.installEvt.prompt();
    try { await this.installEvt.userChoice; } catch (e) { /* closed */ }
    this.installEvt = null; render();
  },
  notify(text, actions) {
    if (!this.on || !Store.set.notify || this.perm() !== 'granted') return;
    if (document.visibilityState === 'visible' && document.hasFocus()) return; // the cat card is already on screen
    const opts = { body: text.replace(/\s+/g, ' '), icon: 'icons/icon-192.png', tag: 'vodichka', renotify: true, lang: 'ru' };
    if (actions) opts.actions = [{ action: 'drank', title: 'Выпила! 💧' }, { action: 'snooze', title: 'Через ' + Store.set.snoozeMin + ' мин ⏰' }];
    if (this.reg && this.reg.showNotification) { this.reg.showNotification('Водичка 🐾', opts).catch(() => {}); return; }
    try { delete opts.actions; const n = new Notification('Водичка 🐾', opts); n.onclick = () => { window.focus(); n.close(); }; } catch (e) { /* not allowed */ }
  },
  title() { if (this.on) document.title = Store.set.onboarded ? `${Fmt.liters(Store.todayTotal())} из ${Fmt.liters(Store.goal())} · Водичка` : 'Водичка'; }
};

/* ================= reminders ================= */
const Rem = {
  st: { day: '', snoozes: 0, lastShown: null, snoozeUntil: null },
  showing: null, nextAt: null, seed: Math.floor(Math.random() * 100), toggle: false, timer: null,
  load() { try { Object.assign(this.st, JSON.parse(localStorage.getItem('vodichka:rem')) || {}); } catch (e) { /* none */ } },
  keep() { try { localStorage.setItem('vodichka:rem', JSON.stringify(this.st)); } catch (e) { /* none */ } },
  window(now) {
    const s = Store.set, d = new Date(now);
    if (!s.remDays.includes(d.getDay())) return null;
    const sod = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const a = sod + s.startMin * 60000, b = sod + s.endMin * 60000;
    return b > a && now >= a && now < b ? [a, b] : null;
  },
  // ~60 min on pace, ~40 when more than a cup behind, ~80 when ahead.
  interval(now, a, b) {
    const f = Math.min(Math.max((now - a) / (b - a), 0), 1), diff = Store.todayTotal() - Store.goal() * f;
    return (diff < -300 ? 40 : diff > 300 ? 80 : 60) * 60000;
  },
  tick() {
    const now = Date.now(), k = Store.today();
    if (this.st.day !== k) { this.st = { day: k, snoozes: 0, lastShown: null, snoozeUntil: null }; this.keep(); }
    const w = this.window(now);
    if (!Store.set.onboarded || !w || Store.isPaused() || Store.goalReached()) { this.nextAt = null; UI.tools(); return; }
    const anchor = Math.max(w[0], Store.lastDrinkToday() || 0, this.st.lastShown || 0);
    this.nextAt = this.st.snoozeUntil || anchor + this.interval(now, w[0], w[1]);
    UI.tools();
    if (!this.showing && now >= this.nextAt) this.show(Math.min(this.st.snoozes, 2));
  },
  show(level, test) {
    this.toggle = !this.toggle; this.seed++;
    if (!test) { this.st.lastShown = Date.now(); this.st.snoozeUntil = null; this.keep(); }
    const cat = level >= 1 ? 'rysik' : (this.toggle ? 'krosh' : 'rysik');
    const insistent = Store.set.style === 'insistent';
    this.showing = { level, test: !!test, cat, insistent, text: Copy.reminder(level, insistent, this.seed) };
    Sound.meow();
    Desk.notify(this.showing.text.replace(/\s+/g, ' '));
    Web.notify(this.showing.text, true);
    Desk.front();
    clearTimeout(this.timer);
    if (!insistent) this.timer = setTimeout(() => this.snooze(), 150000);
    UI.renderRem();
  },
  close() { clearTimeout(this.timer); this.showing = null; UI.renderRem(); },
  snooze() {
    const r = this.showing; this.close();
    if (r && !r.test) { this.st.snoozes++; this.st.snoozeUntil = Date.now() + Store.set.snoozeMin * 60000; this.keep(); this.tick(); }
  },
  didDrink() {
    this.st.snoozes = 0; this.st.snoozeUntil = null; this.keep();
    if (this.showing && !this.showing.msg) this.close();
    this.tick();
  },
  message(o) { clearTimeout(this.timer); this.showing = Object.assign({ msg: true }, o); this.timer = setTimeout(() => this.close(), o.ms || 12000); UI.renderRem(); }
};

/* ================= UI state ================= */
const U = {
  screen: 'main', drawer: false, sheet: false, pauseMenu: false,
  editEntry: null, editDay: null, gift: null, giftOpened: false,
  month: null, chartMonth: false, wardCat: 'krosh', tab: 'goal',
  onb: { step: 0, goal: '', helper: false, weight: '', active: false, bottle: '450' },
  prevPct: null, happyUntil: 0, importData: null, note: ''
};

const cupLabel = c => `<span class="ce">${esc(c.emoji)}</span><b>${esc(c.name)}</b><span>${c.ml} мл</span>`;
const seg = (act, items, cur, cls = '') => `<div class="seg ${cls}" role="group">${items.map(([v, t]) => `<button type="button" data-act="${act}" data-v="${v}" class="${String(cur) === String(v) ? 'on' : ''}" aria-pressed="${String(cur) === String(v)}">${t}</button>`).join('')}</div>`;
const opt = (act, v, on, b, s) => `<button type="button" class="opt${on ? ' on' : ''}" data-act="${act}" data-v="${v}" aria-pressed="${on}"><i></i><span><b>${b}</b><span>${s}</span></span></button>`;
const fld = (label, hint, body) => `<div class="fld"><div class="lb">${label}</div>${hint ? `<div class="hi">${hint}</div>` : ''}${body}</div>`;
const tgl = (key, label, hint) => `<label class="fld inl"><span><span class="lb">${label}</span>${hint ? `<span class="hi">${hint}</span>` : ''}</span><input type="checkbox" class="tg" id="t-${key}" data-k="${key}" ${Store.set[key] ? 'checked' : ''}></label>`;

function catMood() {
  if (Date.now() < U.happyUntil || Store.goalReached()) return 'happy';
  if (new Date().getHours() >= 13 && Store.todayPct() < 0.3) return 'sleepy';
  return 'normal';
}

/* ---------- header ---------- */
const TITLES = { entries: 'Записи за сегодня 📝', history: 'История 📅', wardrobe: 'Гардероб 🎀', settings: 'Настройки ⚙️' };
function header(title, right = '') {
  return `<header class="hd"><button class="ib" data-act="drawer" aria-label="Меню">☰</button>${U.screen !== 'main' ? `<button class="back" data-act="go" data-v="main">‹ Главная</button>` : ''}<h1 class="ttl">${title}</h1>${right}</header>`;
}

/* ---------- main ---------- */
function scene() {
  const s = Store.set, mood = catMood(), bg = s.background;
  const from = U.prevPct; U.prevPct = null;
  return `<div class="scene${bg ? ' bg-' + bg : ''}">${sceneBackdrop(bg)}<div class="floor"></div>
  <div class="trio">
   <button class="catbtn" data-act="pet" data-v="krosh" aria-label="Погладить Кроша"><span class="catw" id="cw-krosh">${catSVG('krosh', { flip: true, mood, outfit: Store.outfit('krosh') })}</span></button>
   <div class="bw">${bowlSVG(Store.todayPct(), { from, goal: Store.goal(), total: Store.todayTotal(), milk: Store.goalReached(), style: s.bowlStyle })}</div>
   <button class="catbtn" data-act="pet" data-v="rysik" aria-label="Погладить Рысика"><span class="catw" id="cw-rysik">${catSVG('rysik', { mood, outfit: Store.outfit('rysik') })}</span></button>
  </div>${s.toy ? `<span class="toy ${s.toy}" aria-hidden="true">${s.toy === 'box' ? '📦' : '🧶'}</span>` : ''}<span class="laser" aria-hidden="true"></span></div>`;
}
function vMain() {
  const tot = Store.todayTotal(), g = Store.goal(), rem = Store.remaining();
  const seed = Math.floor(fromKey(Store.today()).getTime() / 864e5);
  return header(Copy.greeting(Store.todayPct(), new Date().getHours(), seed), `<span class="pill" title="Дней подряд">🔥 ${Fmt.days(Store.streak.current)}</span>`) + scene() +
  `<div class="stat"><div class="big">${Fmt.liters(tot)} <small>из ${Fmt.liters(g)}</small></div><div class="left">${rem > 0 ? `Осталось <b>${Fmt.amount(rem)}</b> — и миска полная! 💦` : 'Миска полная! Мурррр 🎉'}</div></div>
  <button class="fab" data-act="sheet" aria-keyshortcuts="N">＋ Записать водичку</button>
  <div class="tools" id="tools">${toolsHTML()}</div>`;
}
function toolsHTML() {
  let line;
  if (Store.isPaused()) line = `😴 Котики дремлют до ${Fmt.time(Store.S.pausedUntil)} <button class="lnk" data-act="resume">Разбудить</button>`;
  else if (Store.goalReached()) line = '🤫 Сегодня больше не мяукаем';
  else if (Rem.nextAt) line = `⏰ Следующее «мяу» примерно в ${Fmt.time(Rem.nextAt)}`;
  else line = '🌙 Сейчас котики не мяукают';
  const can = Store.entriesOn(Store.today()).length > 0;
  return `<span class="nx">${line}</span><span class="tb"><span class="pm"><button class="lnk" data-act="pausemenu" aria-expanded="${U.pauseMenu}">⏸ Пауза</button>${U.pauseMenu ? `<span class="menu" role="menu">${[[30, 'На 30 минут'], [60, 'На 1 час'], [120, 'На 2 часа'], [0, 'До конца дня']].map(([m, t]) => `<button role="menuitem" data-act="pause" data-v="${m}">${t}</button>`).join('')}${Store.isPaused() ? '<button role="menuitem" data-act="resume">Снять паузу</button>' : ''}</span>` : ''}</span><button class="lnk" data-act="undo" ${can ? '' : 'disabled'}>↩︎ Отменить</button></span>`;
}

/* ---------- entries ---------- */
function entryRow(e, act = true) {
  const d = drinkOf(e.kind);
  return `<div class="ent"><span class="tm">${Fmt.time(e.t)}</span><span class="em">${d.e}</span><span class="nm">${d.n}${Store.counts(e) ? '' : ' <small>вне рабочих часов</small>'}</span><span class="ml">${e.ml} мл</span><span class="ac">${act ? `<button class="x" data-act="edit" data-v="${e.id}" aria-label="Изменить">✏️</button>` : ''}<button class="x" data-act="del" data-v="${e.id}" aria-label="Удалить">🗑</button></span></div>`;
}
function vEntries() {
  const list = Store.entriesOn(Store.today()), tot = Store.todayTotal(), rem = Store.remaining();
  return header(TITLES.entries) + `<div class="list">${list.map(e => entryRow(e)).join('') || '<div class="empty"><span>🥺</span>Пока пусто… Мяу? Давай начнём с водички!</div>'}</div>
  <div class="sum"><span>Всего: ${Fmt.liters(tot)} из ${Fmt.liters(Store.goal())}${rem > 0 ? ` · осталось ${Fmt.amount(rem)}` : ' 🎉'}</span><button class="btn c big" data-act="sheet">＋ Записать</button></div>`;
}

/* ---------- history ---------- */
function bars(values, labels, th, goalLabel, dense) {
  const max = 1.3;
  return `<div class="bars${dense ? ' m' : ''}"><div class="goal" style="bottom:calc(16px + (100% - 16px) * ${(1 / max).toFixed(4)})"><span>${goalLabel}</span></div>${values.map((v, i) => `<div class="b"><i class="${v >= th ? 'ok' : ''}" style="height:calc((100% - 16px) * ${(Math.min(v, max) / max).toFixed(4)})"></i><span>${labels[i]}</span></div>`).join('')}</div>`;
}
function vHistory() {
  const t = Store.today(), tt = fromKey(t);
  if (!U.month) U.month = { y: tt.getFullYear(), m: tt.getMonth() };
  const { y, m } = U.month, n = new Date(y, m + 1, 0).getDate();
  const days = Array.from({ length: n }, (_, i) => keyOf(new Date(y, m, i + 1)));
  const past = days.filter(d => d <= t), counted = past.filter(d => Store.streak.met.has(d)).length;
  const totals = past.map(d => Store.total(d)), avg = past.length ? Math.round(totals.reduce((a, b) => a + b, 0) / past.length) : 0, best = totals.length ? Math.max(...totals) : 0;
  const lead = (new Date(y, m, 1).getDay() + 6) % 7;
  let cal = WEEK.map(([d]) => `<div class="h">${d}</div>`).join('') + '<div></div>'.repeat(lead);
  for (const d of days) {
    const fut = d > t, p = Math.min(Store.pct(d), 1), isT = d === t;
    const mark = isT ? '💧' : Store.streak.frozen.has(d) ? '🧊' : Store.streak.met.has(d) ? '🐾' : '';
    const can = Store.canEdit(d);
    cal += `<button class="d${isT ? ' today' : ''}${fut ? ' fut' : ''}${can ? ' can' : ''}" ${can ? `data-act="day" data-v="${d}"` : 'disabled'} aria-label="${Fmt.day(d)}: ${Fmt.liters(Store.total(d))}"><em style="height:${fut ? 0 : (p * 100).toFixed(0)}%"></em><span>${+d.slice(8)}</span><span class="mk">${mark}</span></button>`;
  }
  const th = Store.set.thresholdPct / 100, gl = Fmt.liters(Store.goal());
  let chart;
  if (U.chartMonth) chart = bars(days.map(d => d <= t ? Store.pct(d) : 0), days.map(d => { const x = +d.slice(8); return x === 1 || x % 5 === 0 ? x : ''; }), th, gl, true);
  else {
    const mon = addDays(t, -((tt.getDay() + 6) % 7)), wk = Array.from({ length: 7 }, (_, i) => addDays(mon, i));
    chart = bars(wk.map(d => d <= t ? Store.pct(d) : 0), WEEK.map(w => w[0]), th, gl, false);
  }
  const isNow = y === tt.getFullYear() && m === tt.getMonth();
  return header(TITLES.history) + `<div class="mnav"><button class="ib sm" data-act="month" data-v="-1" aria-label="Предыдущий месяц">‹</button><b>${Fmt.month(y, m)}</b><button class="ib sm" data-act="month" data-v="1" aria-label="Следующий месяц" ${isNow ? 'disabled' : ''}>›</button></div>
  <p class="sub">${counted} из ${past.length} ${Fmt.plural(past.length, 'дня', 'дней', 'дней')} в зачёт 🐾 · в среднем ${Fmt.liters(avg)} · рекорд ${Fmt.liters(best)} 🏆</p>
  <div class="two"><div class="card"><div class="cal">${cal}</div></div>
  <div class="card">${seg('chart', [['0', 'Неделя'], ['1', 'Месяц']], U.chartMonth ? '1' : '0', 'full')}${chart}</div></div>
  <p class="hint2">✏️ Последние 7 дней можно исправить: нажми на день</p>`;
}

/* ---------- wardrobe ---------- */
function vWardrobe() {
  const cat = U.wardCat, cur = Store.streak.current;
  const items = GIFTS.filter(g => !g.cat || g.cat === cat).flatMap(g => g.opts.map(([v, e, l]) => ({ g, v, e, l })));
  const grid = items.map(({ g, v, e, l }) => {
    const open = Store.isUnlocked(g.day), on = open && Store.isEquipped(g.kind, v, cat), left = g.day - cur;
    return `<button class="it${open ? '' : ' lock'}${on ? ' on' : ''}" ${open ? `data-act="equip" data-v="${g.day}:${v}"` : 'disabled'} aria-pressed="${on}" title="${open ? (on ? 'Снять' : 'Надеть') : esc(g.n)}"><span class="e">${open ? e : '🔒'}</span>${open ? l : (left > 0 ? 'через ' + Fmt.days(left) : Fmt.days(g.day) + ' подряд')}</button>`;
  }).join('');
  const nx = Store.streak.next, ng = nx && giftOf(nx);
  return header(TITLES.wardrobe) + seg('wcat', [['krosh', '😺 Крош'], ['rysik', '😼 Рысик']], cat, 'full') +
  `<div class="two wr"><div class="pv${Store.set.background ? ' bg-' + Store.set.background : ''}"><span class="catw" id="pv-cat">${catSVG(cat, { mood: 'happy', outfit: Store.outfit(cat) })}</span></div><div class="items">${grid}</div></div>
  <div class="card track-card"><h3>Дорожка подарков · сейчас 🔥 ${Fmt.days(cur)}</h3><div class="track">${MILESTONES.map(d => `<span class="${Store.isUnlocked(d) ? 'y' : d === nx ? 'nx' : ''}">${d}</span>`).join('')}</div>
  ${ng ? `<p>Следующий подарок через ${Fmt.days(nx - cur)}: ${ng.e} ${ng.n}</p>` : ''}<p>Все подарки остаются навсегда 💝 Нажми на котика на главном экране, чтобы он показал свою анимацию.</p></div>`;
}

/* ---------- settings ---------- */
function tabGoal() {
  const s = Store.set;
  let h = fld('Как задать цель', 'Можно ввести самой или попросить котиков посчитать', seg('gmode', [['fixed', 'Сама задам'], ['calc', 'Посчитай за меня 🧮']], s.goalMode));
  if (s.goalMode === 'fixed') h += fld('Цель на день', 'Сколько водички хочется выпить за день, в литрах', `<span class="row"><input id="i-goal" class="in" inputmode="decimal" value="${Fmt.num(s.goalML / 1000)}" aria-label="Цель в литрах"><b>л</b></span>`);
  else h += fld('Твой вес', 'Примерно 30 мл водички на каждый килограмм', `<span class="row"><input id="i-weight" class="in" inputmode="numeric" value="${s.weightKg}" aria-label="Вес в килограммах"><b>кг</b></span>`) +
    tgl('activeDay', 'Активный день 🏃‍♀️', 'Спорт или жара: ещё +400 мл') + `<p class="adv">Котики советуют: ${Fmt.liters(Store.goal())} в день 💧</p>`;
  h += fld('Что считать в цель', 'Какие записи наполняют миску', `<div class="opts h">${opt('scope', 'day', s.goalScope !== 'work', 'Весь день', 'Всё, что выпито за сутки')}${opt('scope', 'work', s.goalScope === 'work', 'Только рабочие часы', `С ${Fmt.minutes(s.startMin)} до ${Fmt.minutes(s.endMin)}`)}</div>`);
  const emojis = ['🍶', '☕', '🥛', '🍵', '🧃', '🥤', '🫖', '💧'];
  h += fld('Мои кружки', 'Появляются в окне «Записать водичку»', `<div class="cupl">${s.cups.map(c => `<div><select id="ce-${c.id}" data-cup="${c.id}" data-f="emoji" aria-label="Значок">${emojis.concat(emojis.includes(c.emoji) ? [] : [c.emoji]).map(e => `<option ${e === c.emoji ? 'selected' : ''}>${esc(e)}</option>`).join('')}</select><input id="cn-${c.id}" class="in name" data-cup="${c.id}" data-f="name" value="${esc(c.name)}" maxlength="24" aria-label="Название"><input id="cm-${c.id}" class="in ml" data-cup="${c.id}" data-f="ml" inputmode="numeric" value="${c.ml}" aria-label="Объём, мл"><em>мл</em><button class="x" data-act="cupdel" data-v="${c.id}" aria-label="Удалить кружку" ${s.cups.length <= 1 ? 'disabled' : ''}>🗑</button></div>`).join('')}</div><button class="btn g" data-act="cupadd" ${s.cups.length >= 8 ? 'disabled' : ''}>＋ Добавить кружку</button>`);
  h += fld('Кружка для кнопки «Выпила!»', 'Что записывается одним нажатием в напоминании', `<select id="i-quick" class="in wide">${s.cups.map(c => `<option value="${c.id}" ${c.id === Store.quickCup().id ? 'selected' : ''}>${esc(c.emoji + ' ' + c.name)}, ${c.ml} мл</option>`).join('')}</select>`);
  return h;
}
function tabRem() {
  const s = Store.set;
  return fld('Дни', 'В какие дни котики напоминают о водичке', `<div class="days">${WEEK.map(([n, d]) => `<button class="${s.remDays.includes(d) ? 'on' : ''}" data-act="rday" data-v="${d}" aria-pressed="${s.remDays.includes(d)}">${n}</button>`).join('')}</div>`) +
  fld('Часы', 'Вне этих часов — тишина', `<span class="row"><b>с</b><input type="text" inputmode="numeric" maxlength="5" placeholder="00:00" id="i-start" class="in" value="${Fmt.minutes(s.startMin)}" aria-label="Начало"><b>до</b><input type="text" inputmode="numeric" maxlength="5" placeholder="00:00" id="i-end" class="in" value="${Fmt.minutes(s.endMin)}" aria-label="Конец"></span>`) +
  fld('Как напоминать', 'Котики мяукают, пока эта страница открыта', `<div class="opts h">${opt('style', 'gentle', s.style === 'gentle', 'Мягко 😺', 'Котик в уголке окна, не мешает')}${opt('style', 'insistent', s.style === 'insistent', 'Настойчиво 😼', 'Котик садится посреди окна и ждёт')}</div>`) +
  fld('Отложить на', 'Кнопка «Через … мин» в напоминании', seg('snooze', [[5, '5 мин'], [10, '10 мин'], [15, '15 мин'], [30, '30 мин']], s.snoozeMin)) +
  fld('Проверка', 'Покажет напоминание прямо сейчас', `<button class="btn g" data-act="testrem">Показать напоминание 🐾</button>`);
}
function tabStreak() {
  const s = Store.set;
  return fld('День засчитывается от', 'Сколько процентов цели нужно выпить, чтобы серия продолжилась', `<span class="row sl"><input type="range" id="i-th" min="50" max="100" step="5" value="${s.thresholdPct}" aria-label="Порог в процентах"><b id="th-v">${s.thresholdPct}%</b></span>`) +
  fld('Выходные', 'Как считать субботу и воскресенье', `<div class="opts">${opt('wknd', 'normal', s.weekend === 'normal', 'Как будни', 'Обычные правила')}${opt('wknd', 'noBreak', s.weekend === 'noBreak', 'Не ломают серию', 'Записи считаются, но пропуск не страшен')}${opt('wknd', 'skip', s.weekend === 'skip', 'Не считать', 'Выходные вообще не входят в серию')}</div>`) +
  fld('Новый день начинается в', 'Миска сама опустеет в это время', `<input type="text" inputmode="numeric" maxlength="5" placeholder="00:00" id="i-reset" class="in" value="${Fmt.minutes(s.resetMin)}" aria-label="Время начала дня">`) +
  fld('Заморозки 🧊', 'Одна за каждые 7 дней подряд, максимум две. Спасают серию в пропущенный день', `<span class="pill">🧊 Сейчас: ${Store.streak.freezes}</span>`);
}
function tabSound() {
  return tgl('soundPour', 'Буль-буль при записи', 'Звук наливающейся водички') + tgl('soundPurr', 'Мурчание', 'Котики мурчат, когда ты пьёшь') + tgl('soundMeow', '«Мяу» в напоминаниях', 'Котик мяукает, когда пора попить') +
  fld('Послушать', 'Звуки играют после первого нажатия на странице', `<span class="row wrap"><button class="btn g" data-act="hear" data-v="pour">💧 Буль-буль</button><button class="btn g" data-act="hear" data-v="purr">😽 Мурр</button><button class="btn g" data-act="hear" data-v="meow">😺 Мяу</button></span>`);
}
function storageLine() {
  if (Persist.mode === 'cloud') return '☁️ Записи хранятся в твоём аккаунте Claude: их видно с любого компьютера';
  if (Persist.mode === 'local') return Web.on ? '💾 Записи хранятся на этом компьютере, в браузере. Без аккаунтов и интернета 🐾' : '💾 Записи хранятся только в этом браузере. Сохраняй копию время от времени';
  return '⚠️ Браузер не даёт ничего сохранить: после закрытия страницы записи пропадут. Сохрани копию!';
}
function tabData() {
  let h = fld('Где хранятся записи', storageLine(), '');
  h += fld('Копия', 'Файл со всеми записями, подарками и настройками', `<span class="row wrap"><button class="btn g" data-act="export">⬇ Сохранить копию</button><label class="btn g file">⬆ Загрузить копию<input type="file" id="i-import" accept=".json,application/json"></label></span>${U.importData ? `<div class="confirm">Заменить все записи этой копией (${U.importData.entries.length} записей)? <button class="btn c" data-act="import-yes">Да, заменить</button><button class="btn g" data-act="import-no">Отмена</button></div>` : ''}${U.note ? `<p class="note">${esc(U.note)}</p>` : ''}`);
  if (Web.on) {
    const pm = Web.perm();
    if (pm === 'granted') h += tgl('notify', 'Уведомления 🔔', 'Котики мяукнут уведомлением, даже если окно Водички спрятано за другими');
    else if (pm === 'default') h += fld('Уведомления 🔔', 'Чтобы котики мяукали, даже когда окно Водички спрятано за другими', `<button class="btn" data-act="web-notify">Разрешить уведомления</button>`);
    else if (pm === 'denied') h += fld('Уведомления 🔔', 'Браузер запретил уведомления. Их можно разрешить в настройках сайта в браузере', '');
    if (Web.installed) h += fld('Приложение', 'Водичка установлена как приложение ✓', '');
    else h += fld('Установить как приложение', 'Своё окно и значок в Dock. Котики мяукают, пока окно открыто (можно свернуть)', Web.installEvt ? `<button class="btn" data-act="web-install">Установить 🐾</button>` : `<p class="hi">В Safari: меню «Файл» → «Добавить в Dock». В Chrome: значок установки справа в адресной строке.</p>`);
  }
  if (Desk.inApp) {
    const p = Desk.perms, ok = p.notifications === 'granted' && p['menu-bar'] === 'granted';
    h += tgl('notify', 'Уведомления macOS', 'Мяуканье придёт уведомлением, даже если окно спрятано');
    h += fld('Значок в строке меню', ok ? 'Включён: миска и быстрые кружки всегда под рукой 🐾' : 'Миска в строке меню и уведомления. macOS спросит разрешение', ok ? '' : `<button class="btn" data-act="perms">Разрешить 🐾</button>`);
  } else if (Desk.install === 'available') {
    h += fld('Приложение на компьютер', 'Своё окно, значок в Dock, уведомления и миска в строке меню. Нужно приложение Claude', `<button class="btn" data-act="install">Установить как приложение 🐾</button>`);
  }
  return h;
}
const TABS = { goal: ['💧 Цель', tabGoal], rem: ['⏰ Напоминания', tabRem], streak: ['🔥 Серия', tabStreak], sound: ['🔊 Звуки', tabSound], data: ['💾 Данные', tabData] };
function vSettings() {
  return header(TITLES.settings) + `<div class="tabs" role="tablist">${Object.entries(TABS).map(([k, [t]]) => `<button role="tab" aria-selected="${U.tab === k}" class="${U.tab === k ? 'on' : ''}" data-act="tab" data-v="${k}">${t}</button>`).join('')}</div><div class="tabp">${TABS[U.tab][1]()}</div>`;
}

/* ---------- onboarding ---------- */
function vOnboarding() {
  const o = U.onb, s = Store.set;
  let body;
  if (o.step === 0) body = `<div class="duo">${catSVG('krosh', { head: true, mood: 'happy', outfit: { accessory: 'bow' } })}${catSVG('rysik', { head: true, mood: 'happy' })}</div><h1>Привет, Лена! Мяу! 👋</h1><p>Мы Крош и Рысик 😺😼 Теперь мы будем следить, чтобы ты пила водичку! 💧</p><button class="btn big" data-act="onb-next">Мрр, давай! 💙</button>`;
  else if (o.step === 1) {
    const typed = Fmt.parseLiters(o.goal), w = parseInt(o.weight, 10);
    const helperGoal = w >= 25 && w <= 250 ? calcGoal(w, o.active) : null;
    const ok = o.helper ? !!helperGoal : typed >= 300;
    body = `<div class="ob-bowl">${bowlSVG(0, { small: true })}</div><h1>Сколько водички в день? 🥛</h1>` +
    (o.helper
      ? `<span class="row c"><b>Мой вес</b><input id="o-weight" class="in" inputmode="numeric" placeholder="60" value="${esc(o.weight)}" aria-label="Вес"><b>кг</b></span><label class="row c chk"><input type="checkbox" class="tg" id="o-active" ${o.active ? 'checked' : ''}><b>Активный день 🏃‍♀️</b></label><p class="adv">${helperGoal ? `Котики советуют: ${Fmt.liters(helperGoal)} 💧` : 'Напиши свой вес, и котики посчитают 🐾'}</p><button class="lnk" data-act="onb-helper" data-v="0">✏️ Лучше введу сама</button>`
      : `<span class="goalin"><input id="o-goal" inputmode="decimal" placeholder="?" value="${esc(o.goal)}" aria-label="Цель в литрах"><b>л</b></span><button class="lnk" data-act="onb-helper" data-v="1">🧮 Не знаю — посчитай за меня</button>`) +
    `<span class="row c bottle"><span>Твоя бутылка:</span><input id="o-bottle" class="in" inputmode="numeric" value="${esc(o.bottle)}" aria-label="Объём бутылки, мл"><span>мл 🍶</span></span><button class="btn big" data-act="onb-next" ${ok ? '' : 'disabled'}>Дальше 🐾</button>`;
  } else body = `${catSVG('rysik', { head: true, mood: 'meow' })}<h1>Когда мяукать? ⏰</h1><p>По будням с ${Fmt.minutes(s.startMin)} до ${Fmt.minutes(s.endMin)}, пока эта страница открыта. Это можно поменять в настройках.</p><div class="opts">${opt('style', 'gentle', s.style === 'gentle', 'Мягко 😺', 'Котик в уголке окна')}${opt('style', 'insistent', s.style === 'insistent', 'Настойчиво 😼', 'Котик посреди окна, ждёт, пока попьёшь')}</div><button class="btn c big" data-act="onb-finish">Начинаем! 🎉</button>`;
  return `<div class="onb"><div class="onb-card">${body}<div class="dots">${[0, 1, 2].map(i => `<i class="${i === o.step ? 'on' : ''}"></i>`).join('')}</div></div></div>`;
}

/* ---------- layers: drawer, sheet, editors, gift ---------- */
function drawer() {
  const nav = [['main', '🏠', 'Главная'], ['entries', '📝', 'Записи за сегодня'], ['history', '📅', 'История'], ['wardrobe', '🎀', 'Гардероб'], ['settings', '⚙️', 'Настройки']];
  const st = Store.streak;
  return `<button class="shade" data-act="drawer" aria-label="Закрыть меню"></button><nav class="drawer" aria-label="Меню"><div class="dh"><span>Водичка 🐾</span><button class="ib" data-act="drawer" aria-label="Закрыть">✕</button></div>${nav.map(([k, e, n]) => `<button class="nv${U.screen === k ? ' on' : ''}" data-act="go" data-v="${k}"><span>${e}</span>${n}</button>`).join('')}
  <div class="info">🔥 ${Fmt.days(st.current)} подряд<br>🧊 Заморозок: ${st.freezes}${st.next ? `<br>🎁 Подарок через ${Fmt.days(st.next - st.current)}` : ''}</div>${Web.on && Web.perm() === 'default' ? `<button class="nv hintnv" data-act="go-data"><span>🔔</span>Включить уведомления</button>` : ''}<div class="store">${storageLine()}</div></nav>`;
}
function sheet() {
  const s = Store.set;
  return `<button class="shade" data-act="sheet" aria-label="Закрыть"></button><div class="sheet" role="dialog" aria-label="Что пьём?"><div class="sh-h"><b>Что пьём? 😋</b><button class="ib" data-act="sheet" aria-label="Закрыть">✕</button></div>
  ${seg('kind', DRINKS.map(d => [d.k, d.e + ' ' + d.n]), s.lastDrink, 'full')}
  <div class="cups">${s.cups.map(c => `<button class="cup" data-act="add" data-v="${c.ml}">${cupLabel(c)}</button>`).join('')}<form class="cup own" data-form="own"><span class="ce">✏️</span><b>Своё</b><span class="row"><input id="i-own" type="number" min="10" max="3000" placeholder="мл" aria-label="Своё количество, мл"><button class="btn sm">ОК</button></span></form></div>
  <div class="hint">Нажми на кружку — и сразу буль-буль! 💧</div></div>`;
}
function entryEditor() {
  const e = Store.S.entries.find(x => x.id === U.editEntry);
  if (!e) { U.editEntry = null; return ''; }
  return `<button class="shade" data-act="close-edit" aria-label="Закрыть"></button><form class="modal" data-form="edit" role="dialog" aria-label="Изменить запись"><h2>Изменить запись ✏️</h2>${seg('ekind', DRINKS.map(d => [d.k, d.e + ' ' + d.n]), U.ekind || e.kind, 'full')}
  <span class="row wrap"><b>Сколько:</b><input id="e-ml" class="in" inputmode="numeric" value="${e.ml}" aria-label="Сколько, мл"><b>мл</b><b>в</b><input id="e-time" type="text" inputmode="numeric" maxlength="5" placeholder="00:00" class="in" value="${Fmt.time(e.t)}" aria-label="Время"></span>
  <div class="mb"><button type="button" class="btn g big" data-act="close-edit">Отмена</button><button class="btn big">Сохранить</button></div></form>`;
}
function dayEditor() {
  const k = U.editDay, list = Store.entriesOn(k);
  return `<button class="shade" data-act="close-day" aria-label="Закрыть"></button><form class="modal" data-form="day" role="dialog" aria-label="Изменить день"><div class="sh-h"><h2>${Fmt.day(k)} ✏️</h2><button type="button" class="ib" data-act="close-day" aria-label="Закрыть">✕</button></div>
  <p class="sub">Выпито ${Fmt.liters(Store.total(k))} из ${Fmt.liters(Store.goalFor(k))}</p><div class="list sc">${list.map(e => entryRow(e, false)).join('') || '<div class="empty">В этот день записей нет 🥺</div>'}</div>
  <h3>Добавить забытую запись</h3>${seg('dkind', DRINKS.map(d => [d.k, d.e + ' ' + d.n]), U.dkind || 'water', 'full')}
  <span class="row wrap"><input id="d-ml" class="in" inputmode="numeric" value="250" aria-label="Сколько, мл"><b>мл</b><b>в</b><input id="d-time" type="text" inputmode="numeric" maxlength="5" placeholder="00:00" class="in" value="12:00" aria-label="Время"><button class="btn c big">Добавить</button></span></form>`;
}
function giftLayer() {
  const g = U.gift;
  if (!U.giftOpened) return `<div class="shade dim"></div><div class="modal gift" role="dialog" aria-label="Подарок"><button class="box" data-act="gift-open" aria-label="Открыть подарок">🎁</button><h2>Мяу-сюрприз! 🐾</h2><p class="sub">Нажми на коробку, чтобы открыть</p><button class="btn c big" data-act="gift-open">Открыть 🎁</button></div>`;
  return `<div class="shade dim"></div><div class="modal gift" role="dialog" aria-label="Подарок"><span class="box open">${g.e}</span><h2>${Copy.streakTitle(g.day)}</h2><p class="sub">Для тебя подарок: ${g.n}! Мрр-мрр 😽</p><div class="mb c"><button class="btn c big" data-act="gift-try">Примерить 😸</button><button class="btn g big" data-act="gift-later">Позже</button></div></div>`;
}

/* ---------- reminder cards ---------- */
function remHTML() {
  const r = Rem.showing;
  if (!r) return '';
  const head = (cat, mood) => catSVG(cat, { head: true, mood, outfit: Store.outfit(cat) });
  if (r.msg) return `<div class="rcard msg" role="status">${head(r.cat, 'happy')}<div><p>${r.text}</p><button class="btn c" data-act="${r.act || 'rem-close'}"${r.v != null ? ` data-v="${r.v}"` : ''}>${r.button}</button></div></div>`;
  const q = Store.quickCup(), mood = r.level >= 2 ? 'angry' : 'meow';
  const btns = big => `<button class="btn ${r.insistent ? 'c' : ''}${big ? ' big' : ''}" data-act="rem-drank">Выпила! 💧</button><button class="btn g${big ? ' big' : ''}" data-act="rem-choose">Выбрать кружку</button><button class="btn g${big ? ' big' : ''}" data-act="rem-snooze">Через ${Store.set.snoozeMin} мин ⏰</button>`;
  if (r.insistent) return `<div class="over" role="alertdialog" aria-label="Пора попить"><span class="tuk a">тук-тук 🐾</span><span class="tuk b">тук 🐾</span><div class="big-rem">${head(r.cat, mood)}<p>${r.text}</p><div class="bt">${btns(true)}</div><small>«Выпила!» запишет ${esc(q.emoji + ' ' + q.name)}, ${q.ml} мл</small></div></div>`;
  return `<div class="rcard lv${r.level}" role="alertdialog" aria-label="Пора попить">${head(r.cat, mood)}<div><p>${r.text}</p><div class="bt">${btns(false)}</div></div>${r.level >= 2 ? '<i class="pen"></i>' : ''}</div>`;
}

/* ================= rendering ================= */
const VIEWS = { main: vMain, entries: vEntries, history: vHistory, wardrobe: vWardrobe, settings: vSettings };
function render() {
  const app = $('#app');
  if (!app || !Store.S) return;
  const focusId = document.activeElement && document.activeElement.id;
  const sc = $('#screen');
  sc.innerHTML = Store.set.onboarded ? VIEWS[U.screen]() : vOnboarding();
  app.classList.toggle('is-onb', !Store.set.onboarded);
  renderLayer();
  if (focusId) { const el = document.getElementById(focusId); if (el && el !== document.activeElement) el.focus({ preventScroll: true }); }
  requestAnimationFrame(() => requestAnimationFrame(() => document.querySelectorAll('.liq[data-to]').forEach(g => { g.style.transform = `translateY(${g.dataset.to}px)`; g.removeAttribute('data-to'); })));
  Desk.update();
  Web.title();
}
function renderLayer() {
  let h = '';
  if (Store.set.onboarded) {
    if (U.drawer) h = drawer();
    else if (U.sheet) h = sheet();
    else if (U.editEntry) h = entryEditor();
    else if (U.editDay) h = dayEditor();
    if (U.gift) h = giftLayer();
  }
  $('#layer').innerHTML = h;
  document.body.classList.toggle('locked', !!h);
}
function renderRem() { $('#rem').innerHTML = remHTML(); }
function tools() { const t = $('#tools'); if (t) t.innerHTML = toolsHTML(); }

let toastT;
function toast(text) {
  const t = $('#toast');
  t.textContent = text; t.classList.remove('show'); void t.offsetWidth; t.classList.add('show');
  clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 1900);
}
function confetti() {
  if (reduced) return;
  const box = $('#confetti'), sy = ['💧', '🐾', '💙'];
  box.innerHTML = Array.from({ length: 34 }, (_, i) => `<span style="left:${(i * 73) % 100}%;animation-delay:${((i * 0.137) % 1.2).toFixed(2)}s;animation-duration:${(2.6 + (i % 5) * 0.35).toFixed(2)}s">${sy[i % 3]}</span>`).join('');
  setTimeout(() => { box.innerHTML = ''; }, 5200);
}
function play(el, cls, ms) {
  if (!el || reduced) return;
  el.classList.remove(cls); void el.getBoundingClientRect(); el.classList.add(cls);
  setTimeout(() => el.classList.remove(cls), ms);
}
function refreshCats() {
  if (U.screen !== 'main' || !Store.set.onboarded) return;
  const mood = catMood();
  for (const [c, flip] of [['krosh', true], ['rysik', false]]) { const w = document.getElementById('cw-' + c); if (w) w.innerHTML = catSVG(c, { flip, mood, outfit: Store.outfit(c) }); }
}
function happy() { U.happyUntil = Date.now() + 2500; refreshCats(); setTimeout(refreshCats, 2600); }

/* ================= actions ================= */
const UI = {
  renderRem, tools,
  drink(ml, kind) {
    U.prevPct = Store.todayPct();
    U.sheet = false;
    Store.set.lastDrink = kind;
    if (!Store.add(ml, kind)) { U.prevPct = null; render(); return; }
    toast(Copy.toast(ml, Math.floor(Math.random() * 9)));
    Sound.pour(); setTimeout(() => Sound.purr(), 700);
    happy();
    document.querySelectorAll('#screen .catw').forEach(w => play(w, Math.random() < 0.05 ? 'flip' : 'bounce', 900));
  }
};

function pet(cat) {
  const w = document.getElementById('cw-' + cat), a = Store.outfit(cat).animation;
  Sound.purr(); happy();
  const w2 = document.getElementById('cw-' + cat);
  if (a === 'stretch') play(w2, 'stretch', 1000);
  else if (a === 'flip') play(w2, 'flip', 900);
  else if (a === 'laser') { play(w2, 'hop', 2600); play($('.laser'), 'run', 2600); }
  else play(w2 || w, 'bounce', 600);
}

function closeGift() {
  Store.markSeen(U.gift.day); U.gift = null; renderLayer();
  const next = Store.pendingGift();
  if (next) setTimeout(() => { U.gift = next; U.giftOpened = false; renderLayer(); }, 400);
}

async function exportCopy() {
  const json = JSON.stringify(Store.S, null, 1), name = 'vodichka-' + Store.today() + '.json';
  try {
    const dl = window.claude && window.claude.use ? await window.claude.use('downloads') : null;
    if (dl) { await dl.save({ filename: name, data: new TextEncoder().encode(json) }); U.note = 'Копия сохранена в «Загрузки» 💾'; render(); return; }
  } catch (e) { /* fall through to clipboard */ }
  if (Web.on) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([json], { type: 'application/json' })); a.download = name;
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    U.note = 'Копия сохранена в «Загрузки» 💾'; render(); return;
  }
  try { await navigator.clipboard.writeText(json); U.note = 'Скачать файл здесь нельзя, поэтому копия скопирована в буфер обмена. Вставь её в любую заметку 📋'; }
  catch (e) { U.note = 'Не получилось сохранить копию 😿'; }
  render();
}

function act(a, v, el) {
  const s = Store.set;
  switch (a) {
    case 'drawer': U.drawer = !U.drawer; U.sheet = false; U.pauseMenu = false; renderLayer(); return;
    case 'go': U.screen = v; U.drawer = false; U.pauseMenu = false; break;
    case 'sheet': U.sheet = !U.sheet; U.drawer = false; if (U.sheet && U.screen !== 'main') U.screen = 'main'; break;
    case 'kind': s.lastDrink = v; Persist.save(); renderLayer(); return;
    case 'add': UI.drink(+v, s.lastDrink); return;
    case 'pet': pet(v); return;
    case 'pausemenu': U.pauseMenu = !U.pauseMenu; tools(); return;
    case 'pause': U.pauseMenu = false; Store.pause(+v || null); Rem.tick(); return;
    case 'resume': U.pauseMenu = false; Store.resume(); Rem.tick(); return;
    case 'undo': { const e = Store.undoLast(); if (e) toast('Отменили: ' + e.ml + ' мл ↩︎'); Rem.tick(); return; }
    case 'edit': U.editEntry = v; U.ekind = null; renderLayer(); return;
    case 'ekind': U.ekind = v; renderLayer(); return;
    case 'close-edit': U.editEntry = null; renderLayer(); return;
    case 'del': Store.remove(v); return;
    case 'day': U.editDay = v; U.dkind = null; renderLayer(); return;
    case 'dkind': U.dkind = v; renderLayer(); return;
    case 'close-day': U.editDay = null; renderLayer(); return;
    case 'month': { const d = new Date(U.month.y, U.month.m + +v, 1); U.month = { y: d.getFullYear(), m: d.getMonth() }; break; }
    case 'chart': U.chartMonth = v === '1'; break;
    case 'wcat': U.wardCat = v; break;
    case 'equip': { const [d, val] = v.split(':'), g = giftOf(+d); Store.toggleEquip(g.kind, val, U.wardCat); Sound.purr(); play($('#pv-cat'), 'wig', 500); return; }
    case 'tab': U.tab = v; U.note = ''; break;
    case 'gmode': Store.update(x => { x.goalMode = v; }); return;
    case 'scope': Store.update(x => { x.goalScope = v; }); return;
    case 'style': Store.update(x => { x.style = v; }); return;
    case 'snooze': Store.update(x => { x.snoozeMin = +v; }); return;
    case 'wknd': Store.update(x => { x.weekend = v; }); return;
    case 'rday': Store.update(x => { const d = +v; x.remDays = x.remDays.includes(d) ? x.remDays.filter(y => y !== d) : x.remDays.concat(d); }); Rem.tick(); return;
    case 'cupadd': Store.update(x => { x.cups.push({ id: uid(), emoji: '🥤', name: 'Новая кружка', ml: 200 }); }); return;
    case 'cupdel': Store.update(x => { if (x.cups.length > 1) x.cups = x.cups.filter(c => c.id !== v); }); return;
    case 'testrem': Rem.show(0, true); return;
    case 'hear': Sound.unlock(); setTimeout(() => ({ pour: () => Sound.pour(), purr: () => Sound.purr(), meow: () => Sound.meow() })[v](), 30); return;
    case 'export': exportCopy(); return;
    case 'import-yes': Store.load(U.importData); U.importData = null; U.note = 'Готово! Записи загружены из копии 🐾'; Persist.save(); Rem.tick(); break;
    case 'import-no': U.importData = null; break;
    case 'install': Desk.doInstall(); return;
    case 'perms': Desk.request(); return;
    case 'go-data': U.screen = 'settings'; U.tab = 'data'; U.drawer = false; break;
    case 'web-notify': Web.ask(); return;
    case 'web-install': Web.install(); return;
    case 'rem-drank': { const q = Store.quickCup(); Rem.close(); UI.drink(q.ml, 'water'); return; }
    case 'rem-choose': Rem.close(); U.screen = 'main'; U.drawer = false; U.sheet = true; break;
    case 'rem-snooze': Rem.snooze(); return;
    case 'rem-close': Rem.close(); return;
    case 'gift-show': Rem.close(); U.gift = giftOf(+v); U.giftOpened = false; renderLayer(); return;
    case 'gift-open': U.giftOpened = true; Sound.purr(); confetti(); renderLayer(); return;
    case 'gift-try': {
      const g = U.gift, val = g.opts[0][0];
      for (const c of g.cat ? [g.cat] : ['krosh', 'rysik']) if (!Store.isEquipped(g.kind, val, c)) Store.toggleEquip(g.kind, val, c);
      if (g.cat) U.wardCat = g.cat;
      U.screen = 'wardrobe'; closeGift(); break;
    }
    case 'gift-later': closeGift(); return;
    case 'onb-helper': U.onb.helper = v === '1'; break;
    case 'onb-next': {
      const o = U.onb;
      if (o.step === 1) {
        Store.update(x => {
          const w = parseInt(o.weight, 10), g = Fmt.parseLiters(o.goal), b = parseInt(o.bottle, 10);
          if (o.helper && w >= 25 && w <= 250) { x.goalMode = 'calc'; x.weightKg = w; x.activeDay = o.active; }
          else if (g >= 300) { x.goalMode = 'fixed'; x.goalML = g; }
          if (b > 0 && b <= 3000) x.cups[0].ml = b;
        });
      } else Sound.meow();
      o.step++; break;
    }
    case 'onb-finish': Store.completeOnboarding(); U.screen = 'main'; confetti(); Sound.purr(); Rem.tick(); break;
    default: return;
  }
  render();
}

/* ---------- events ---------- */
document.addEventListener('click', e => {
  const b = e.target.closest('[data-act]');
  if (!b) { if (U.pauseMenu && !e.target.closest('.pm')) { U.pauseMenu = false; tools(); } return; }
  if (b.disabled) return;
  act(b.dataset.act, b.dataset.v, b);
});

document.addEventListener('submit', e => {
  const f = e.target.closest('[data-form]');
  if (!f) return;
  e.preventDefault();
  const kind = f.dataset.form;
  if (kind === 'own') {
    const ml = Math.round(+$('#i-own').value);
    if (ml > 0 && ml <= 3000) UI.drink(ml, Store.set.lastDrink); else $('#i-own').focus();
  } else if (kind === 'edit') {
    const en = Store.S.entries.find(x => x.id === U.editEntry), ml = parseInt($('#e-ml').value, 10), tm = Fmt.parseTime($('#e-time').value);
    if (en) {
      const d = new Date(en.t);
      if (tm != null) d.setHours(Math.floor(tm / 60), tm % 60, 0, 0);
      Store.edit(en.id, { ml: ml > 0 && ml <= 5000 ? ml : en.ml, kind: U.ekind || en.kind, t: d.getTime() });
    }
    U.editEntry = null; renderLayer();
  } else if (kind === 'day') {
    const ml = parseInt($('#d-ml').value, 10), tm = Fmt.parseTime($('#d-time').value);
    if (!(ml > 0 && ml <= 5000) || tm == null) return;
    const base = fromKey(U.editDay);
    if (tm < Store.set.resetMin) base.setDate(base.getDate() + 1);
    base.setHours(Math.floor(tm / 60), tm % 60, 0, 0);
    Store.add(ml, U.dkind || 'water', base.getTime());
    Sound.pour(); renderLayer();
  }
});

document.addEventListener('input', e => {
  const t = e.target;
  if (t.id === 'i-th') { $('#th-v').textContent = t.value + '%'; return; }
  // onboarding fields keep their text; only the button state and helper line change
  if (t.id === 'o-goal') { U.onb.goal = t.value; syncOnb(); }
  if (t.id === 'o-weight') { U.onb.weight = t.value; syncOnb(); }
  if (t.id === 'o-bottle') U.onb.bottle = t.value;
});
function syncOnb() {
  const o = U.onb, w = parseInt(o.weight, 10), hg = w >= 25 && w <= 250 ? calcGoal(w, o.active) : null;
  const ok = o.helper ? !!hg : Fmt.parseLiters(o.goal) >= 300;
  const btn = document.querySelector('[data-act="onb-next"]'); if (btn) btn.disabled = !ok;
  const adv = document.querySelector('.onb .adv'); if (adv) adv.textContent = hg ? `Котики советуют: ${Fmt.liters(hg)} 💧` : 'Напиши свой вес, и котики посчитают 🐾';
}

document.addEventListener('change', e => {
  const t = e.target, id = t.id;
  if (t.dataset.k) { Store.update(x => { x[t.dataset.k] = t.checked; }); if (t.dataset.k === 'notify') Desk.update(); return; }
  if (t.dataset.cup) {
    Store.update(x => {
      const c = x.cups.find(c => c.id === t.dataset.cup); if (!c) return;
      if (t.dataset.f === 'ml') { const v = parseInt(t.value, 10); if (v > 0 && v <= 3000) c.ml = v; }
      else if (t.dataset.f === 'name') c.name = t.value.trim().slice(0, 24) || c.name;
      else c.emoji = t.value;
    });
    return;
  }
  switch (id) {
    case 'o-active': U.onb.active = t.checked; syncOnb(); return;
    case 'i-goal': { const ml = Fmt.parseLiters(t.value); Store.update(x => { if (ml >= 300) x.goalML = ml; }); Rem.tick(); return; }
    case 'i-weight': { const w = parseInt(t.value, 10); Store.update(x => { if (w >= 25 && w <= 250) x.weightKg = w; }); return; }
    case 'i-quick': Store.update(x => { x.quickCup = t.value; }); return;
    case 'i-start': case 'i-end': case 'i-reset': {
      const m = Fmt.parseTime(t.value);
      Store.update(x => { if (m != null) x[{ 'i-start': 'startMin', 'i-end': 'endMin', 'i-reset': 'resetMin' }[id]] = m; });
      Rem.tick(); return;
    }
    case 'i-th': Store.update(x => { x.thresholdPct = +t.value; }); return;
    case 'i-import': {
      const file = t.files && t.files[0]; if (!file) return;
      file.text().then(txt => {
        try { const raw = JSON.parse(txt); if (!raw || !raw.settings) throw new Error('bad'); U.importData = Store.normalize(raw); U.note = ''; }
        catch (err) { U.importData = null; U.note = 'Это не похоже на копию Водички 😿'; }
        render();
      });
      return;
    }
  }
});

document.addEventListener('keydown', e => {
  const typing = e.target.closest && e.target.closest('input, select, textarea');
  if (e.key === 'Escape') {
    if (Rem.showing && Rem.showing.msg) { Rem.close(); return; }
    if (U.pauseMenu) { U.pauseMenu = false; tools(); return; }
    if (U.drawer || U.sheet || U.editEntry || U.editDay) { U.drawer = U.sheet = false; U.editEntry = U.editDay = null; renderLayer(); }
    return;
  }
  if (typing || e.metaKey || e.ctrlKey || e.altKey || !Store.set.onboarded || U.gift || Rem.showing) return;
  if (['n', 'N', 'т', 'Т', '+', '='].includes(e.key)) { e.preventDefault(); act('sheet'); }
});

/* ================= events from the store ================= */
Store.on('save', () => Persist.save());
Store.on('change', () => { render(); });
Store.on('drink', () => Rem.didDrink());
Store.on('goal', () => {
  confetti(); setTimeout(() => Sound.purr(), 900);
  Rem.message({ cat: 'krosh', text: Copy.goalDone, button: 'Ура! 😻' });
  Desk.notify(Copy.goalDone);
  Web.notify(Copy.goalDone);
});
Store.on('gift', d => {
  const g = giftOf(d);
  if (!g || U.gift) return;
  if (document.visibilityState === 'visible') { U.gift = g; U.giftOpened = false; setTimeout(renderLayer, 900); }
  else Rem.message({ cat: 'rysik', text: `🎁 Мяу-сюрприз! ${Copy.streakTitle(d)} Для тебя подарок: ${g.n} ${g.e}`, button: 'Открыть подарок 🎁', act: 'gift-show', v: d, ms: 60000 });
});
Store.on('newday', () => { U.month = null; Rem.tick(); });

/* ================= start ================= */
function giftCheck() {
  const g = Store.set.onboarded && Store.pendingGift();
  if (g && !U.gift) { U.gift = g; U.giftOpened = false; renderLayer(); }
}
function start() {
  Store.load(Persist.readLocal());
  Persist.mode = Persist.localOK ? 'local' : 'memory';
  Store.lastDay = Store.today();
  Rem.load();
  // A new browser may still have her records in the account: wait for them before showing the welcome cards.
  let shown = false;
  const show = () => { if (shown) return; shown = true; render(); giftCheck(); Rem.tick(); };
  const fresh = !Store.S.updatedAt && window.claude && window.claude.use;
  if (fresh) setTimeout(show, 6000); else show();
  setInterval(() => { Store.tick(); Rem.tick(); }, 15000);
  document.addEventListener('visibilitychange', () => { Store.tick(); Rem.tick(); });
  Persist.connect().then(r => {
    if (r && r.adopt) { Store.load(r.adopt); Store.lastDay = Store.today(); Persist.writeLocal(Store.S); }
    shown = true; render(); giftCheck(); Rem.tick();
  });
  Desk.init();
  Web.init();
}
start();
}
