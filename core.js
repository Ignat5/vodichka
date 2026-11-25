// Водичка — data, rules and words. No DOM here.
'use strict';

/* ---------- dates: a tracking day is a 'YYYY-MM-DD' key ---------- */
const pad = n => String(n).padStart(2, '0');
const keyOf = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
const fromKey = k => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };
const addDays = (k, n) => { const d = fromKey(k); d.setDate(d.getDate() + n); return keyOf(d); };
const minutesOf = t => { const d = new Date(t); return d.getHours() * 60 + d.getMinutes(); };
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

/* ---------- formatting ---------- */
const MONTHS = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
const Fmt = {
  num: v => v.toLocaleString('ru-RU', { maximumFractionDigits: 2 }),
  liters: ml => Fmt.num(ml / 1000) + ' л',
  amount: ml => ml >= 1000 ? Fmt.liters(ml) : ml + ' мл',
  time: t => { const d = new Date(t); return pad(d.getHours()) + ':' + pad(d.getMinutes()); },
  minutes: m => pad(Math.floor(m / 60)) + ':' + pad(m % 60),
  day: k => { const s = fromKey(k).toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' }); return s[0].toUpperCase() + s.slice(1); },
  month: (y, m) => MONTHS[m] + ' ' + y,
  plural(n, one, few, many) {
    const a = n % 10, b = n % 100;
    if (a === 1 && b !== 11) return one;
    if (a >= 2 && a <= 4 && !(b >= 12 && b <= 14)) return few;
    return many;
  },
  days: n => n + ' ' + Fmt.plural(n, 'день', 'дня', 'дней'),
  parseLiters(s) {
    const v = parseFloat(String(s).trim().replace(',', '.'));
    if (!(v > 0) || v > 10) return null;
    return Math.round(v * 1000);
  },
  parseTime(s) {
    const m = /^(\d{1,2})[:.,\s]?(\d{2})$/.exec(String(s).trim());
    if (!m) return null;
    const h = +m[1], mi = +m[2];
    return h < 24 && mi < 60 ? h * 60 + mi : null;
  }
};

/* ---------- words ---------- */
const Copy = {
  pick: (list, seed) => list[((seed % list.length) + list.length) % list.length],
  greeting(pct, hour, seed) {
    if (pct >= 1) return Copy.pick(['Мурррр! Миска полная 😻', 'Лена — чемпионка! 🏆', 'Мы сыты и счастливы 😽'], seed);
    if (pct >= 0.5) return Copy.pick(['Мрр, больше половины! 😸', 'Так держать, Лена! 💪', 'Мяу! Ты молодец 😺'], seed);
    if (pct > 0) return Copy.pick(['Мяу, Лена! 😺', 'Ещё по глоточку? 💧', 'Мур-мур, продолжаем 🐾'], seed);
    if (hour < 12) return Copy.pick(['Доброе утро, Лена! ☀️', 'Мяу! Новая миска ждёт 💧'], seed);
    return Copy.pick(['Мяу? Миска пустая 🥺', 'Фрр… мы немножко пересохли 🥺'], seed);
  },
  gentle: ['Мяу! 😺 Лена, пора попить водички 💧', 'Мрр-мяу! 🐾 Глоточек водички, Лена? 💦', 'Лена, мяу! 😽 Водичка ждёт тебя! 💧', 'Мяу-мяу! 🥤 Время буль-буль, Лена!'],
  second: ['Мяу-мяу! 🙀 Лена, я всё ещё жду… Водичка сама себя не выпьет!', 'Мяяу? 😿 Лена, ну хоть глоточек! 💧', 'Мрр… 🐾 Миска грустит без водички, Лена!'],
  third: ['МЯЯЯУ!!! 😾 Фррр! Я уже уронил ручку со стола… Попей, пожалуйста! 🥺💧', 'ФРРР! 😾 Лена, это уже серьёзно! Срочно водичку! 💦', 'МЯУ-МЯУ-МЯУ!!! 🙀 Я сяду на клавиатуру, если не попьёшь! ⌨️💧'],
  insistent: ['Мяу-мяу-мяу! 🐾 Лена, стоп-стоп! Сначала водичка, потом работа 💦', 'Тук-тук! 😼 Котик-контролёр: пора пить водичку! 💧', 'Мрр! 🐾 Не пущу работать, пока не попьёшь! 💦'],
  reminder(level, insistent, seed) {
    if (level >= 2) return Copy.pick(Copy.third, seed);
    if (level === 1) return Copy.pick(Copy.second, seed);
    return Copy.pick(insistent ? Copy.insistent : Copy.gentle, seed);
  },
  goalDone: 'Мурррр! 🎉 Лена, миска полная! Ты умничка 😻 Сегодня больше не мяукаем 🤫',
  toast: (ml, seed) => Copy.pick(['Буль-буль! +' + ml + ' мл 💧', 'Мрр! +' + ml + ' мл 😽', 'Лакаем! +' + ml + ' мл 👅'], seed),
  streakTitle: d => d === 1 ? 'Первый день! 🎉' : Fmt.days(d) + ' подряд! 🔥'
};

const DRINKS = [{ k: 'water', e: '💧', n: 'Вода' }, { k: 'tea', e: '🍵', n: 'Чай' }, { k: 'coffee', e: '☕', n: 'Кофе' }];
const drinkOf = k => DRINKS.find(d => d.k === k) || DRINKS[0];
const CATS = { krosh: 'Крош', rysik: 'Рысик' };

/* ---------- gifts (streak milestones) ---------- */
const GIFTS = [
  { day: 1, e: '🎀', n: 'Бантик для Кроша', kind: 'accessory', cat: 'krosh', opts: [['bow', '🎀', 'Бантик']] },
  { day: 3, e: '🥣', n: 'Миска в горошек', kind: 'bowl', opts: [['polka', '🥣', 'Миска в горошек']] },
  { day: 7, e: '😸', n: 'Анимация «Потягушки»', kind: 'animation', opts: [['stretch', '😸', 'Потягушки']] },
  { day: 10, e: '🧶', n: 'Клубок для игры', kind: 'toy', opts: [['yarn', '🧶', 'Клубок']] },
  { day: 14, e: '🧣', n: 'Шарфик для Рысика', kind: 'accessory', cat: 'rysik', opts: [['scarf', '🧣', 'Шарфик']] },
  { day: 18, e: '🪟', n: 'Фон «Подоконник»', kind: 'background', opts: [['window', '🪟', 'Подоконник']] },
  { day: 21, e: '🔴', n: 'Анимация «Лазерная точка»', kind: 'animation', opts: [['laser', '🔴', 'Лазерная точка']] },
  { day: 30, e: '📦', n: 'Коробка, в которой можно сидеть', kind: 'toy', opts: [['box', '📦', 'Коробка']] },
  { day: 40, e: '🎨', n: 'Новые окрасы шерсти', kind: 'fur', opts: [['ginger', '🧡', 'Рыжий окрас'], ['black', '🖤', 'Чёрный окрас']] },
  { day: 50, e: '👀', n: 'Новые цвета глаз', kind: 'eyes', opts: [['amber', '🟡', 'Янтарные глазки'], ['green', '🟢', 'Зелёные глазки']] },
  { day: 60, e: '🌙', n: 'Фон «Звёздная ночь»', kind: 'background', opts: [['night', '🌙', 'Звёздная ночь']] },
  { day: 70, e: '👑', n: 'Короны для обоих', kind: 'accessory', opts: [['crown', '👑', 'Корона']] },
  { day: 80, e: '🤸', n: 'Анимация «Кувырок»', kind: 'animation', opts: [['flip', '🤸', 'Кувырок']] },
  { day: 90, e: '🏆', n: 'Золотая миска', kind: 'bowl', opts: [['gold', '🏆', 'Золотая миска']] },
  { day: 100, e: '🚀', n: 'Костюмы «Космокоты» и праздник', kind: 'accessory', opts: [['space', '🚀', 'Космокот']] }
];
const MILESTONES = GIFTS.map(g => g.day);
const giftOf = d => GIFTS.find(g => g.day === d);

/* ---------- settings ---------- */
function defaultSettings() {
  return {
    onboarded: false, goalMode: 'fixed', goalML: 2000, weightKg: 60, activeDay: false, goalScope: 'day',
    cups: [{ id: 'c1', emoji: '🍶', name: 'Бутылка', ml: 450 }, { id: 'c2', emoji: '☕', name: 'Кружка', ml: 300 }, { id: 'c3', emoji: '🥛', name: 'Стакан', ml: 250 }],
    quickCup: 'c1', lastDrink: 'water',
    remDays: [1, 2, 3, 4, 5], startMin: 600, endMin: 1140, style: 'gentle', snoozeMin: 10,
    thresholdPct: 80, weekend: 'noBreak', resetMin: 0,
    soundPour: true, soundPurr: true, soundMeow: true, notify: true,
    outfits: { krosh: { accessory: 'bow' }, rysik: {} }, background: null, bowlStyle: null, toy: null
  };
}
const calcGoal = (w, active) => Math.max(1000, Math.round((w * 30 + (active ? 400 : 0)) / 50) * 50);

/* ---------- the store ---------- */
const Store = {
  S: null,
  streak: { current: 0, freezes: 0, met: new Set(), frozen: new Set(), next: MILESTONES[0] },
  totals: {},
  listeners: {},
  on(ev, fn) { (this.listeners[ev] = this.listeners[ev] || []).push(fn); },
  emit(ev, a) { (this.listeners[ev] || []).forEach(fn => { try { fn(a); } catch (e) { console.error(e); } }); },

  blank() {
    return { v: 1, settings: defaultSettings(), entries: [], unlocked: [], seen: [], celebrated: [], firstDay: null, dayGoals: {}, pausedUntil: null, updatedAt: 0 };
  },
  // Tolerant: anything missing falls back to defaults, unknown keys are kept out.
  normalize(raw) {
    const b = this.blank();
    if (!raw || typeof raw !== 'object') return b;
    const s = Object.assign(defaultSettings(), raw.settings || {});
    if (!Array.isArray(s.cups) || !s.cups.length) s.cups = defaultSettings().cups;
    s.cups = s.cups.filter(c => c && c.ml > 0).map(c => ({ id: String(c.id || uid()), emoji: String(c.emoji || '🥤'), name: String(c.name || 'Кружка'), ml: Math.round(+c.ml) }));
    if (!Array.isArray(s.remDays)) s.remDays = [1, 2, 3, 4, 5];
    s.outfits = Object.assign({ krosh: {}, rysik: {} }, s.outfits || {});
    b.settings = s;
    b.entries = (Array.isArray(raw.entries) ? raw.entries : [])
      .filter(e => e && +e.t > 0 && +e.ml > 0)
      .map(e => ({ id: String(e.id || uid()), t: +e.t, ml: Math.round(+e.ml), kind: drinkOf(e.kind).k }));
    for (const k of ['unlocked', 'seen', 'celebrated']) b[k] = Array.isArray(raw[k]) ? raw[k].slice() : [];
    b.firstDay = typeof raw.firstDay === 'string' ? raw.firstDay : null;
    b.dayGoals = raw.dayGoals && typeof raw.dayGoals === 'object' ? Object.assign({}, raw.dayGoals) : {};
    b.pausedUntil = +raw.pausedUntil || null;
    b.updatedAt = +raw.updatedAt || 0;
    return b;
  },
  load(raw) { this.S = this.normalize(raw); this.recompute(true); },

  get set() { return this.S.settings; },
  dayOf(t) { return keyOf(new Date(t - this.set.resetMin * 60000)); },
  today() { return this.dayOf(Date.now()); },
  goal() { return this.set.goalMode === 'fixed' ? this.set.goalML : calcGoal(this.set.weightKg, this.set.activeDay); },
  goalFor(k) { return k === this.today() ? this.goal() : (this.S.dayGoals[k] || this.goal()); },
  counts(e) {
    if (this.set.goalScope !== 'work') return true;
    const m = minutesOf(e.t);
    return m >= this.set.startMin && m < this.set.endMin;
  },
  entriesOn(k) { return this.S.entries.filter(e => this.dayOf(e.t) === k).sort((a, b) => a.t - b.t); },
  total(k) { return this.totals[k] || 0; },
  pct(k) { const g = this.goalFor(k); return g > 0 ? this.total(k) / g : 0; },
  todayTotal() { return this.total(this.today()); },
  todayPct() { return this.pct(this.today()); },
  remaining() { return Math.max(this.goal() - this.todayTotal(), 0); },
  goalReached() { return this.todayTotal() >= this.goal(); },
  isPaused() { return (this.S.pausedUntil || 0) > Date.now(); },
  isWeekend(k) { const w = fromKey(k).getDay(); return w === 0 || w === 6; },
  canEdit(k) { const t = this.today(); return k <= t && k > addDays(t, -7); },
  lastDrinkToday() { const l = this.entriesOn(this.today()).filter(e => e.t <= Date.now()); return l.length ? l[l.length - 1].t : null; },
  quickCup() { return this.set.cups.find(c => c.id === this.set.quickCup) || this.set.cups[0]; },
  outfit(cat) { return this.set.outfits[cat] || {}; },

  changed() { this.recompute(); this.emit('save'); this.emit('change'); },
  update(fn) { fn(this.set); this.changed(); },

  add(ml, kind, t = Date.now()) {
    ml = Math.round(ml);
    if (!(ml > 0 && ml <= 5000)) return false;
    const wasDone = this.goalReached();
    this.S.entries.push({ id: uid(), t, ml, kind });
    this.changed();
    this.emit('drink', { ml, kind });
    const k = this.today();
    if (!wasDone && this.goalReached() && this.dayOf(t) === k && !this.S.celebrated.includes(k)) {
      this.S.celebrated.push(k);
      this.emit('save');
      this.emit('goal');
    }
    return true;
  },
  remove(id) { this.S.entries = this.S.entries.filter(e => e.id !== id); this.changed(); },
  edit(id, patch) { const e = this.S.entries.find(x => x.id === id); if (e) { Object.assign(e, patch); this.changed(); } },
  undoLast() {
    const l = this.entriesOn(this.today());
    if (!l.length) return null;
    const last = l[l.length - 1];
    this.remove(last.id);
    return last;
  },
  completeOnboarding() {
    if (!this.S.firstDay) this.S.firstDay = this.today();
    this.set.onboarded = true;
    this.changed();
  },
  pause(min) {
    this.S.pausedUntil = min ? Date.now() + min * 60000 : fromKey(addDays(this.today(), 1)).getTime() + this.set.resetMin * 60000;
    this.emit('save'); this.emit('change');
  },
  resume() { this.S.pausedUntil = null; this.emit('save'); this.emit('change'); },
  markSeen(d) { if (!this.S.seen.includes(d)) this.S.seen.push(d); this.emit('save'); },
  pendingGift() { return GIFTS.find(g => this.S.unlocked.includes(g.day) && !this.S.seen.includes(g.day)) || null; },
  isUnlocked(d) { return this.S.unlocked.includes(d); },

  isEquipped(kind, v, cat) {
    const o = this.outfit(cat), s = this.set;
    if (kind === 'toy') return s.toy === v;
    if (kind === 'background') return s.background === v;
    if (kind === 'bowl') return s.bowlStyle === v;
    return o[kind] === v;
  },
  toggleEquip(kind, v, cat) {
    const on = this.isEquipped(kind, v, cat), nv = on ? null : v, s = this.set;
    if (kind === 'toy') s.toy = nv;
    else if (kind === 'background') s.background = nv;
    else if (kind === 'bowl') s.bowlStyle = nv;
    else { s.outfits[cat] = Object.assign({}, s.outfits[cat], { [kind]: nv }); }
    this.changed();
  },

  // Deterministic: totals, streak, freezes and unlocks from the whole history.
  recompute(quiet) {
    const S = this.S, set = S.settings;
    const totals = {};
    for (const e of S.entries) if (this.counts(e)) { const k = this.dayOf(e.t); totals[k] = (totals[k] || 0) + e.ml; }
    this.totals = totals;
    const t = this.today(), g = this.goal();
    if (S.dayGoals[t] !== g) { S.dayGoals[t] = g; if (!quiet) this.emit('save'); }

    let start = S.firstDay;
    for (const e of S.entries) { const k = this.dayOf(e.t); if (!start || k < start) start = k; }
    if (!start) { this.streak = { current: 0, freezes: 0, met: new Set(), frozen: new Set(), next: MILESTONES[0] }; return; }

    let s = 0, freezes = 0, guard = 0;
    const met = new Set(), frozen = new Set(), reached = new Set(S.unlocked), th = set.thresholdPct;
    for (let d = start; d < t && guard < 20000; d = addDays(d, 1), guard++) {
      const wk = this.isWeekend(d);
      const ok = (totals[d] || 0) * 100 >= this.goalFor(d) * th;
      if (wk && set.weekend === 'skip') continue;
      if (ok) {
        s++; met.add(d);
        if (s % 7 === 0) freezes = Math.min(2, freezes + 1);
        if (MILESTONES.includes(s)) reached.add(s);
      } else if (wk && set.weekend === 'noBreak') {
        // a missed weekend neither breaks nor extends the streak
      } else if (freezes > 0) { freezes--; frozen.add(d); }
      else s = 0;
    }
    let current = s;
    const todayOK = (totals[t] || 0) * 100 >= g * th;
    if (todayOK && !(this.isWeekend(t) && set.weekend === 'skip')) {
      current++; met.add(t);
      if (MILESTONES.includes(current)) reached.add(current);
    }
    this.streak = { current, freezes, met, frozen, next: MILESTONES.find(m => m > current) || null };

    if (reached.size !== S.unlocked.length) {
      const fresh = [...reached].filter(d => !S.unlocked.includes(d));
      S.unlocked = [...reached].sort((a, b) => a - b);
      if (!quiet) {
        this.emit('save');
        const newest = Math.max(...fresh);
        if (fresh.length && !S.seen.includes(newest)) this.emit('gift', newest);
      }
    }
  },

  lastDay: null,
  // Called by the clock: the automatic daily reset.
  tick() {
    const k = this.today();
    if (this.lastDay && k !== this.lastDay) { this.lastDay = k; this.recompute(); this.emit('change'); this.emit('newday'); }
    this.lastDay = k;
  }
};

/* ---------- saving: this browser, plus the Claude account when available ---------- */
const Persist = {
  KEY: 'vodichka:v1',
  mode: 'memory',   // 'cloud' | 'local' | 'memory'
  db: null, col: null,
  written: {},      // doc id → JSON last written
  chain: Promise.resolve(),
  timer: null,
  localOK: false,

  readLocal() {
    try { const s = localStorage.getItem(this.KEY); this.localOK = true; return s ? JSON.parse(s) : null; }
    catch (e) { this.localOK = false; return null; }
  },
  writeLocal(S) {
    try { localStorage.setItem(this.KEY, JSON.stringify(S)); this.localOK = true; }
    catch (e) { this.localOK = false; }
  },
  save() {
    Store.S.updatedAt = Date.now();
    this.writeLocal(Store.S);
    if (this.mode === 'cloud') { clearTimeout(this.timer); this.timer = setTimeout(() => this.push(), 900); }
  },
  docs(S) {
    const out = {}, rest = Object.assign({}, S);
    delete rest.entries;
    out.state = rest;
    for (const e of S.entries) {
      const m = 'm-' + Store.dayOf(e.t).slice(0, 7);
      (out[m] = out[m] || { entries: [] }).entries.push(e);
    }
    for (const id in this.written) if (id.startsWith('m-') && !out[id]) out[id] = { entries: [] };
    return out;
  },
  push() {
    const docs = this.docs(Store.S);
    for (const id in docs) {
      const json = JSON.stringify(docs[id]);
      if (this.written[id] === json) continue;
      const body = JSON.parse(json);
      this.chain = this.chain.then(() => this.col.doc(id).set(body)).then(() => { this.written[id] = json; })
        .catch(err => {
          console.warn('cloud save failed', err);
          if (err && (err.code === 'invalid_argument' || err.code === 'revoked' || err.code === 'not_granted')) { this.mode = this.localOK ? 'local' : 'memory'; Store.emit('change'); }
        });
    }
  },
  // Called once at start, after the page has drawn from the local copy.
  async connect() {
    const use = window.claude && window.claude.use;
    if (!use) return false;
    try {
      const [db, user] = await Promise.all([use('db'), use('user')]);
      if (!db || !user) return false;
      const id = await user.id();
      if (!id) return false;
      const can = user.can ? await user.can('data.write') : null;
      if (can === false) return false;
      this.db = db;
      this.col = db.collection('data/users/' + id);
      const snap = await Promise.race([this.col.get(), new Promise((_, r) => setTimeout(() => r(new Error('timeout')), 10000))]);
      let remote = null; const entries = [];
      for (const d of snap.docs) {
        const body = d.data();
        if (!body) continue;
        this.written[d.id] = JSON.stringify(body);
        if (d.id === 'state') remote = body;
        else if (d.id.startsWith('m-') && Array.isArray(body.entries)) entries.push(...body.entries);
      }
      this.mode = 'cloud';
      const local = Store.S;
      if (remote && ((+remote.updatedAt || 0) > (local.updatedAt || 0) || !local.settings.onboarded)) {
        remote.entries = entries;
        return { adopt: remote };
      }
      this.written = {};          // push everything we have
      this.push();
      return true;
    } catch (e) {
      console.warn('cloud unavailable', e);
      return false;
    }
  }
};
