// Водичка — the cats and the glass bowl, drawn as SVG strings.
'use strict';

let artId = 0;

function catLook(cat, o = {}) {
  const l = cat === 'krosh'
    ? { fur: '#fdfdfb', shade: '#e1e5ef', edge: '#c9cfdc', ear: '#f6c1cc', iris: '#9fd6f2', pupil: '#1d2a3a', nose: '#f2a3b3', wh: '#aab3c2', long: false, spots: false, spot: '#2c2f36', belly: false }
    : { fur: '#a9adb4', shade: '#8d9199', edge: null, ear: '#e8b4bd', iris: '#2a4fa8', pupil: '#0f1523', nose: '#d98c9a', wh: '#3f434b', long: true, spots: true, spot: '#2c2f36', belly: true };
  if (o.fur === 'ginger') Object.assign(l, { fur: '#f2b06a', shade: '#dc9450', edge: cat === 'krosh' ? '#c98443' : null, spot: '#c06a32', wh: '#8a5a33' });
  if (o.fur === 'black') Object.assign(l, { fur: '#3b3a40', shade: '#2b2a30', edge: null, spot: '#1d1c21', wh: '#d5d5dc', ear: '#d79aa7' });
  if (o.eyes === 'amber') l.iris = '#f2b33d';
  if (o.eyes === 'green') l.iris = '#7cc36a';
  return l;
}

const CAT = {
  body: 'M58 216 C48 168 66 118 110 114 C154 118 172 168 162 216 Z',
  tail: 'M156 206 C204 212 214 160 190 138 C182 131 171 137 178 147 C194 166 188 196 152 194 Z',
  tailL: 'M64 206 C16 212 6 160 30 138 C38 131 49 137 42 147 C26 166 32 196 68 194 Z',
  earL: 'M60 78 L63 26 Q65 19 71 23 L104 52 Z', earR: 'M160 78 L157 26 Q155 19 149 23 L116 52 Z',
  inL: 'M70 64 L71 37 L94 54 Z', inR: 'M150 64 L149 37 L126 54 Z',
  spots: [[80, 150, 9, 6], [132, 142, 8, 5], [146, 176, 7, 10], [72, 190, 8, 6], [120, 198, 6, 5], [96, 135, 5, 4], [150, 200, 6, 5]],
  stripes: ['M99 46 l3 15', 'M110 44 v17', 'M121 46 l-3 15', 'M55 96 q10 2 16 -2', 'M165 96 q-10 2 -16 -2', 'M57 108 q9 2 14 -1', 'M163 108 q-9 2 -14 -1']
};

/** cat: 'krosh' | 'rysik'. o: {mood, head, flip, outfit, still} */
function catSVG(cat, o = {}) {
  const out = o.outfit || {}, l = catLook(cat, out), p = 'k' + (artId++), mood = o.mood || 'normal';
  const st = l.edge ? `stroke="${l.edge}" stroke-width="2" stroke-linejoin="round"` : '';
  const acc = out.accessory;
  const tail = o.flip ? CAT.tailL : CAT.tail, piv = o.flip ? '64px 206px' : '156px 206px';
  let s = `<svg viewBox="${o.head ? '38 14 144 130' : '0 0 220 240'}" class="cat ${cat}${o.still ? ' still' : ''}" role="img" aria-label="${CATS[cat]}">`;
  s += `<defs><clipPath id="${p}b"><path d="${CAT.body}"/></clipPath><clipPath id="${p}h"><ellipse cx="110" cy="92" rx="56" ry="48"/></clipPath><clipPath id="${p}t"><path d="${tail}"/></clipPath></defs>`;
  if (!o.head) s += `<ellipse cx="112" cy="226" rx="74" ry="8" fill="#0000001a"/>`;
  // tail
  s += `<g class="tail${o.flip ? ' l' : ''}" style="transform-origin:${piv}"><path d="${tail}" fill="${l.fur}" ${st}/>`;
  if (l.spots) s += `<g clip-path="url(#${p}t)" fill="${l.spot}"><rect x="${o.flip ? 4 : 186}" y="150" width="30" height="7" transform="rotate(${o.flip ? -25 : 25} ${o.flip ? 20 : 200} 150)"/><rect x="${o.flip ? 14 : 176}" y="178" width="30" height="7" transform="rotate(${o.flip ? 10 : -10} ${o.flip ? 30 : 190} 180)"/></g>`;
  s += `</g>`;
  // body
  s += `<path d="${CAT.body}" fill="${l.fur}" ${st}/><g clip-path="url(#${p}b)"><path d="M130 110 C172 132 170 196 164 222 L210 222 L210 100Z" fill="${l.shade}"/>`;
  if (l.spots) s += CAT.spots.map(([x, y, a, b]) => `<ellipse cx="${x}" cy="${y}" rx="${a}" ry="${b}" fill="${l.spot}"/>`).join('');
  s += `</g>`;
  if (l.belly) s += `<ellipse cx="110" cy="182" rx="27" ry="36" fill="#fafafa"/>`;
  if (acc === 'scarf') s += `<path d="M70 128 Q110 150 150 128 L152 142 Q110 164 68 142 Z" fill="#ff7f66"/><path d="M126 144 l10 34 l-14 -2 z" fill="#ff7f66"/><path d="M74 134 Q110 154 148 134" stroke="#fff" stroke-width="3" fill="none" stroke-dasharray="6 6" opacity=".7"/>`;
  if (acc === 'space') s += `<path d="M66 132 Q110 156 154 132 L158 150 Q110 176 62 150 Z" fill="#dfe6f0"/><circle cx="110" cy="160" r="7" fill="#ff7f66"/>`;
  const paw = l.belly ? '#fafafa' : l.fur;
  s += `<ellipse cx="92" cy="215" rx="15" ry="9" fill="${paw}" ${st}/><ellipse cx="128" cy="215" rx="15" ry="9" fill="${paw}" ${st}/>`;
  // ears and head
  s += `<path d="${CAT.earL}" fill="${l.fur}" ${st}/><path d="${CAT.earR}" fill="${l.fur}" ${st}/><path d="${CAT.inL}" fill="${l.ear}"/><path d="${CAT.inR}" fill="${l.ear}"/>`;
  s += `<ellipse cx="110" cy="92" rx="56" ry="48" fill="${l.fur}" ${st}/><g clip-path="url(#${p}h)"><ellipse cx="172" cy="104" rx="30" ry="60" fill="${l.shade}" opacity=".5"/></g><path d="M66 82 Q74 54 104 46" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="3" stroke-linecap="round"/>`;
  if (l.spots) s += `<g clip-path="url(#${p}h)" stroke="${l.spot}" stroke-width="5" stroke-linecap="round" fill="none">${CAT.stripes.map(d => `<path d="${d}"/>`).join('')}</g><ellipse cx="110" cy="114" rx="24" ry="15" fill="#fafafa"/>`;
  if (acc === 'bow') s += `<g transform="translate(66 40) rotate(-20)"><path d="M0 0 L-16 -10 L-16 10 Z M0 0 L16 -10 L16 10 Z" fill="#ff8fb1" stroke="#e86f95" stroke-width="2" stroke-linejoin="round"/><circle r="5" fill="#e86f95"/></g>`;
  if (acc === 'crown') s += `<path d="M84 52 L87 26 L99 40 L110 20 L121 40 L133 26 L136 52 Z" fill="#f5c84c" stroke="#d9a62a" stroke-width="2" stroke-linejoin="round"/><circle cx="110" cy="42" r="4" fill="#ff7f66"/><circle cx="96" cy="46" r="3" fill="#4fb3c1"/><circle cx="124" cy="46" r="3" fill="#4fb3c1"/>`;
  // eyes
  if (mood === 'happy') s += [88, 132].map(x => `<path d="M${x - 10} 92 Q${x} 81 ${x + 10} 92" fill="none" stroke="${l.pupil}" stroke-width="3.2" stroke-linecap="round"/>`).join('');
  else if (mood === 'sleepy') s += [88, 132].map(x => `<path d="M${x - 10} 90 Q${x} 96 ${x + 10} 90" fill="none" stroke="${l.pupil}" stroke-width="3" stroke-linecap="round"/>`).join('');
  else s += [88, 132].map(x => `<g class="eye"><ellipse cx="${x}" cy="90" rx="11" ry="12.6" fill="${l.iris}"/><ellipse cx="${x}" cy="91" rx="4" ry="10" fill="${l.pupil}"/><circle cx="${x - 3.9}" cy="85" r="3.1" fill="#fff"/></g>`).join('');
  if (mood === 'angry') s += `<path d="M76 74 l22 8 M144 74 l-22 8" stroke="${l.pupil}" stroke-width="4" stroke-linecap="round"/>`;
  if (mood === 'happy') s += `<ellipse cx="74" cy="108" rx="8" ry="4.5" fill="#ff9fbd" opacity=".6"/><ellipse cx="146" cy="108" rx="8" ry="4.5" fill="#ff9fbd" opacity=".6"/>`;
  // nose, mouth, whiskers
  s += `<path d="M104 106 L116 106 L110 113 Z" fill="${l.nose}"/>`;
  s += mood === 'meow' || mood === 'angry'
    ? `<ellipse cx="110" cy="122" rx="7" ry="8" fill="#7a3d4a"/><ellipse cx="110" cy="126" rx="4" ry="3" fill="#f2a3b3"/>`
    : `<path d="M110 113 q-5 8 -12 3 M110 113 q5 8 12 3" fill="none" stroke="#6b6470" stroke-width="1.8" stroke-linecap="round"/>`;
  const L = l.long ? 80 : 46;
  for (const [x0, dir] of [[90, -1], [130, 1]]) {
    s += [-10, 2, 14].map((d, i) => { const y0 = 110 + i * 5; return `<path d="M${x0} ${y0} Q${x0 + dir * L * 0.5} ${y0 + d - 4 - i * 5} ${x0 + dir * L} ${y0 + d - i}" fill="none" stroke="${l.wh}" stroke-width="${l.long ? 1.8 : 1.5}" stroke-linecap="round"/>`; }).join('');
  }
  if (acc === 'space') s += `<ellipse cx="110" cy="88" rx="74" ry="66" fill="#bfe9f1" fill-opacity=".18" stroke="#bfe9f1" stroke-width="4"/><path d="M110 22 L110 8" stroke="#9aa3ad" stroke-width="3" stroke-linecap="round"/><circle cx="110" cy="6" r="5" fill="#ff7f66"/><path d="M70 54 Q80 40 96 34" fill="none" stroke="#fff" stroke-opacity=".8" stroke-width="4" stroke-linecap="round"/>`;
  return s + '</svg>';
}

/** The glass bowl, 300×200. level 0…1 of the goal; from = level to animate up from. */
function bowlSVG(level, o = {}) {
  const id = 'b' + (artId++), top = 74, bot = 178, H = bot - top;
  const f = Math.min(Math.max(level, 0), 1), milk = !!o.milk, style = o.style || null;
  const off = v => (H * (1 - Math.min(Math.max(v, 0), 1))).toFixed(1);
  const start = o.from != null ? off(o.from) : off(f);
  const surface = bot - H * f;
  const liq = milk ? '#fde9c8' : '#7fd0db', wave = milk ? '#fff3e0' : '#aee6ec';
  const rim = style === 'gold' ? '#e9b949' : '#ff7f66';
  const inner = 'M27 74 Q34 180 150 182 Q266 180 273 74 Z';
  let s = `<svg viewBox="0 0 300 200" class="bowl" role="img" aria-label="Миска заполнена на ${Math.round(f * 100)}%"><defs><clipPath id="${id}"><path d="${inner}"/></clipPath><pattern id="${id}p" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="9" height="9" fill="#f3fbfc"/><line x1="0" y1="0" x2="0" y2="9" stroke="#d6eff3" stroke-width="3.5"/></pattern></defs>`;
  s += `<ellipse cx="150" cy="192" rx="122" ry="7" fill="#0000001c"/><ellipse cx="150" cy="74" rx="124" ry="11" fill="#e4f4f6"/><path d="${inner}" fill="url(#${id}p)"/>`;
  if (f > 0.001) {
    let wavePath = `M-64 ${top} `;
    for (let i = 0; i < 13; i++) wavePath += 'q16 -6 32 0 ';
    wavePath += `v8 h-416 z`;
    s += `<g clip-path="url(#${id})"><g class="liq"${o.from != null ? ` data-to="${off(f)}"` : ''} style="transform:translateY(${start}px)">`;
    s += `<rect x="20" y="${top}" width="260" height="${H + 30}" fill="${liq}"/><g class="wave"><path d="${wavePath}" fill="${wave}"/></g>`;
    if (milk) s += `<path d="M150 ${top + 22} c-8 -11 -22 0 0 14 c22 -14 8 -25 0 -14z" fill="#ffb3c4"/>`;
    s += `</g>`;
    if (!o.small && bot - surface > 24) {
      const rise = Math.max(bot - surface - 14, 8);
      s += [0, 1, 2, 3].map(i => `<circle class="bub" cx="${70 + i * 48}" cy="${bot - 6}" r="${3 + (i % 2)}" fill="#ffffff" style="--rise:-${rise}px;animation-delay:${(i * 0.77).toFixed(2)}s"/>`).join('');
    }
    s += `</g>`;
  }
  if (!o.small && !milk) {
    const g = o.goal || 2000;
    [0.25, 0.5, 0.75].forEach(t => {
      const y = bot - H * t;
      s += `<line x1="96" y1="${y}" x2="110" y2="${y}" stroke="#3b8e9b" stroke-width="2.5" stroke-linecap="round" opacity=".55"/><text x="116" y="${y + 4.5}" font-family="Nunito, system-ui" font-weight="800" font-size="13" fill="#2b6f7a" opacity=".85">${Fmt.num(g * t / 1000)}</text>`;
    });
    const rem = Math.max(g - (o.total || 0), 0);
    if (rem > 0 && surface - top > 26) {
      const y = (top + Math.max(surface, top + 26)) / 2 + 3;
      s += `<rect x="158" y="${y - 13}" width="100" height="24" rx="12" fill="#fff" stroke="#ff7f66" stroke-width="1.5"/><text x="208" y="${y + 4.5}" text-anchor="middle" font-family="Nunito, system-ui" font-weight="900" font-size="13.5" fill="#e0573d">ещё ${Fmt.amount(rem)}</text>`;
    }
  }
  s += `<path d="M27 74 Q34 180 150 182 Q266 180 273 74" fill="none" stroke="${rim}" stroke-width="6" stroke-linecap="round"/><ellipse cx="150" cy="74" rx="124" ry="11" fill="none" stroke="${rim}" stroke-width="6"/><path d="M48 96 Q54 150 104 166" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" opacity=".75"/>`;
  if (style === 'polka') for (let i = 0; i < 14; i++) { const a = i / 14 * 2 * Math.PI; s += `<circle cx="${(150 + 124 * Math.cos(a)).toFixed(1)}" cy="${(74 + 11 * Math.sin(a)).toFixed(1)}" r="2.2" fill="#fff"/>`; }
  if (style === 'gold') s += `<path class="twinkle" d="M246 92 l3 8 l8 3 l-8 3 l-3 8 l-3 -8 l-8 -3 l8 -3 z" fill="#fff"/>`;
  return s + '</svg>';
}

/** Backdrops for the scene behind the cats. */
function sceneBackdrop(bg) {
  if (bg === 'window') {
    return `<svg class="backdrop" viewBox="0 0 600 300" preserveAspectRatio="xMidYMin slice" aria-hidden="true"><defs><linearGradient id="skyw" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#bfe6ff"/><stop offset="1" stop-color="#fdf6e3"/></linearGradient></defs><rect x="190" y="18" width="220" height="150" rx="8" fill="#fff"/><rect x="198" y="26" width="99" height="64" rx="4" fill="url(#skyw)"/><rect x="303" y="26" width="99" height="64" rx="4" fill="url(#skyw)"/><rect x="198" y="96" width="99" height="64" rx="4" fill="url(#skyw)"/><rect x="303" y="96" width="99" height="64" rx="4" fill="url(#skyw)"/><circle cx="370" cy="52" r="12" fill="#ffe49a"/><rect x="176" y="166" width="248" height="10" rx="4" fill="#fff"/></svg>`;
  }
  if (bg === 'night') {
    let seed = 7, st = '';
    const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
    for (let i = 0; i < 44; i++) st += `<circle cx="${(rnd() * 600).toFixed(0)}" cy="${(rnd() * 200).toFixed(0)}" r="${(0.8 + rnd() * 1.6).toFixed(1)}" fill="#fff" opacity="${(0.5 + rnd() * 0.5).toFixed(2)}" class="${i % 4 === 0 ? 'star' : ''}" style="animation-delay:${(rnd() * 3).toFixed(1)}s"/>`;
    return `<svg class="backdrop" viewBox="0 0 600 300" preserveAspectRatio="xMidYMin slice" aria-hidden="true">${st}<circle cx="540" cy="52" r="20" fill="#fff1b8"/><circle cx="548" cy="46" r="18" fill="#1f2a55"/></svg>`;
  }
  return '';
}

/** Dock icon for the installed app: the bowl with Крош peeking over it. */
function drawAppIcon(size = 256) {
  return new Promise(resolve => {
    try {
      const c = document.createElement('canvas');
      c.width = c.height = size;
      const g = c.getContext('2d');
      const r = size * 0.22;
      g.fillStyle = '#e8f7f9';
      g.beginPath(); g.roundRect(size * 0.04, size * 0.04, size * 0.92, size * 0.92, r); g.fill();
      const head = new Image(), bowl = new Image();
      let n = 0;
      const done = () => {
        if (++n < 2) return;
        g.drawImage(head, size * 0.2, size * 0.08, size * 0.6, size * 0.54);
        g.drawImage(bowl, size * 0.1, size * 0.36, size * 0.8, size * 0.53);
        resolve(c.toDataURL('image/png'));
      };
      head.onload = bowl.onload = done;
      head.onerror = bowl.onerror = () => resolve(null);
      const enc = s => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(s.replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" '));
      head.src = enc(catSVG('krosh', { head: true, mood: 'happy', outfit: { accessory: 'bow' }, still: true }));
      bowl.src = enc(bowlSVG(0.6, { small: true }));
    } catch (e) { resolve(null); }
  });
}
