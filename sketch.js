// Air, Land & Sea (Critters / Critters at War / War themes) — p5.js front end.
//
// Accessibility approach: p5 draws the board on a canvas (hidden from
// assistive tech), and a layer of real <button> elements is positioned
// exactly over every card, habitat and target on the canvas. Those buttons
// carry full text labels, are reachable by keyboard and screen reader, and
// handle all pointer/touch input. Every choice is also listed as a large
// button in the action bar. Game events are announced through a live region.

/* global ALS, BOT, ART, CARD_DEFS, THEATRE_LABEL, TYPE_LABEL, COMMANDERS, THEMES, CURRENT_THEME, applyTheme, vocab, rulesHTML */

let G = null;            // engine state
const UI = {
  viewer: 0,             // whose perspective is at the bottom
  revealed: true,        // hotseat: is the viewer's hand showing?
  hide: true,            // hotseat: pass-the-device screens
  selected: null,        // selected hand card id
  face: true,            // play face up?
  speed: 'normal',
  L: null,               // layout
  lastLogN: 0,
  botTimer: null,
  resultShownFor: null,
  reduceMotion: false
};
const IMG = {};
const ASSET = 'assets/cards/';
const BACK_ALT = 'Face-down card back: the number 2 and the word Unknown above a pair of glowing orange eyes in the dark.';
const $ = (id) => document.getElementById(id);

// ------------------------------------------------------------------ p5
function preload() {
  for (const d of CARD_DEFS) IMG[d.slug] = loadImage(ASSET + d.slug + '.jpg');
  IMG.back = loadImage(ASSET + 'back.jpg');
  for (const t of ['air', 'land', 'sea']) IMG['theatre-' + t] = loadImage(ASSET + 'theatre-' + t + '.jpg');
}

// ---- theme-aware art lookups (photo files for Critters, p5-drawn for the others)
const drawnTheme = () => CURRENT_THEME.art === 'drawn';
function cardImg(id) { return drawnTheme() ? ART.get(CURRENT_THEME.key, 'card', id) : IMG[def(id).slug]; }
function backImg() { return drawnTheme() ? ART.get(CURRENT_THEME.key, 'back', 0) : IMG.back; }
function theatreImg(t) { return drawnTheme() ? ART.get(CURRENT_THEME.key, 'banner', t) : IMG['theatre-' + t]; }
function cardURL(id) { return drawnTheme() ? ART.dataURL(CURRENT_THEME.key, 'card', id) : ASSET + def(id).slug + '.jpg'; }
function backURL() { return drawnTheme() ? ART.dataURL(CURRENT_THEME.key, 'back', 0) : ASSET + 'back.jpg'; }
function backAlt() {
  if (CURRENT_THEME.key === 'war') return 'Face-down card back: strength 2, the word Unknown, and a large question mark over green camouflage.';
  if (CURRENT_THEME.key === 'critterswar') return 'Face-down card back: strength 2, the word Unknown, and three pairs of eyes peeking out of dark green bushes.';
  return BACK_ALT;
}

function setTitle() {
  const th = CURRENT_THEME;
  const base = th.key === 'war' ? 'Air, Land &amp; Sea' : 'Air, Land &amp; Sea:';
  document.querySelector('.title').innerHTML = th.key === 'war'
    ? `Air, Land &amp; Sea <span>(War)</span>` : `${base} <span>${th.titleAccent}</span>`;
  document.title = th.title;
  $('rules-content').innerHTML = vocab(rulesHTML());
}

function setup() {
  const holder = $('canvas-holder');
  const c = createCanvas(Math.max(200, holder.clientWidth), Math.max(200, holder.clientHeight));
  c.parent(holder);
  c.elt.setAttribute('aria-hidden', 'true');
  c.elt.setAttribute('tabindex', '-1');
  textFont('sans-serif');
  noLoop();
  UI.reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  new ResizeObserver(() => {
    const w = Math.max(200, holder.clientWidth), h = Math.max(200, holder.clientHeight);
    if (w !== width || h !== height) { resizeCanvas(w, h); refresh(true); }
  }).observe(holder);

  wireDOM();
  refresh();
  openDialog('dlg-setup');
}

function draw() {
  background('#13202d');
  if (!G) { drawSplash(); return; }
  const L = UI.L || computeLayout();
  drawBoard(L);
}

// ------------------------------------------------------------------ helpers
const isBotMode = () => G && G.opts.mode === 'bot';
const V = () => (isBotMode() ? 0 : UI.viewer);           // bottom player
const T = () => 1 - V();                                   // top player
const handVisible = () => G && (isBotMode() || UI.revealed);
const def = (id) => CARD_DEFS[id];
const NK = (key) => CARD_DEFS.find(d => d.key === key).name;
const hab = (pos) => THEATRE_LABEL[G.order[pos]];

function possessive(p) {
  const n = G.names[p];
  return n === 'You' ? 'Your' : n + "'s";
}
function nm(p) { return G.names[p]; }

function humanTurnFor(p) {
  return G && G.phase === 'play' && G.pending && G.pending.player === p && p !== G.bot;
}
function myPending() { // pending decision the viewer can act on now
  if (!G || G.phase !== 'play' || !G.pending) return null;
  const pd = G.pending;
  if (pd.player === G.bot) return null;
  if (!isBotMode() && (pd.player !== UI.viewer || !UI.revealed)) return null;
  return pd;
}

// ------------------------------------------------------------------ layout
function computeLayout() {
  const W = width, H = height;
  const g = constrain(W * 0.015, 6, 14);
  const info = 26, handLabel = 26;
  let k = 3;
  if (G) for (let pos = 0; pos < 3; pos++) for (let p = 0; p < 2; p++) k = Math.max(k, G.board[pos][p].length);
  const o = 0.27, ar = 1.4, bannerF = 0.42;
  const sideF = ar * (1 + o * (k - 1));
  let L = null;

  if (W > H * 1.2 && W >= 640) {
    let cw = Math.min(260, (H - info - 4 * g) / (2 * sideF + bannerF));
    const boardW = 3 * cw + 4 * g;
    let hw = Math.min(cw, (W - boardW - 3 * g) / 2, (H - info - handLabel - 4 * g) / (3 * ar));
    if (hw >= 64) {
      const total = boardW + 2 * hw + 3 * g;
      const bx = Math.max(0, (W - total) / 2);
      L = { mode: 'landscape', g, cw, ch: cw * ar, hw, hh: hw * ar, bx, k, info, handLabel,
        handX: bx + boardW + g, handY: info + handLabel + g };
    }
  }
  if (!L) {
    let hw = Math.min((W - 7 * g) / 6, 120), hh = hw * ar;
    if (hh > H * 0.2) { hh = H * 0.2; hw = hh / ar; }
    const cw = Math.min((W - 4 * g) / 3, (H - info - handLabel - hh - 4 * g) / (2 * sideF + bannerF), 210);
    const boardW = 3 * cw + 4 * g;
    L = { mode: 'portrait', g, cw, ch: cw * ar, hw, hh, bx: (W - boardW) / 2, k, info, handLabel };
  }
  L.off = L.ch * o;
  L.sideH = L.ch + (k - 1) * L.off;
  L.bh = L.cw * bannerF;
  const boardH = L.info + 2 * L.sideH + L.bh + 2 * L.g;
  let used = boardH + (L.mode === 'portrait' ? L.handLabel + L.hh + 2 * L.g : 0);
  const y0 = Math.max(0, (H - used) / 2);
  L.top = y0 + L.info;
  L.bannerY = L.top + L.sideH + L.g;
  L.myTop = L.bannerY + L.bh + L.g;
  L.colX = (pos) => L.bx + L.g + pos * (L.cw + L.g);
  L.infoY = y0;
  if (L.mode === 'portrait') {
    L.handLabelY = L.myTop + L.sideH + L.g;
    L.handY = L.handLabelY + L.handLabel;
  } else {
    L.handLabelY = L.top;
    L.handY = L.top + L.handLabel;
  }
  return L;
}

// Card rectangle on the board. side: 'top' | 'bottom'
function boardRect(L, pos, side, i, n) {
  const x = L.colX(pos);
  const y = (side === 'top' ? L.top : L.myTop) + i * L.off;
  const covered = i < n - 1;
  return { x, y, w: L.cw, h: L.ch, hitH: covered ? L.off : L.ch };
}

function handRects(L, n) {
  const rects = [];
  if (L.mode === 'portrait') {
    const total = n * L.hw + (n - 1) * L.g;
    const sx = (width - total) / 2;
    for (let i = 0; i < n; i++) rects.push({ x: sx + i * (L.hw + L.g), y: L.handY, w: L.hw, h: L.hh });
  } else {
    for (let i = 0; i < n; i++) {
      const c = i % 2, r = Math.floor(i / 2);
      rects.push({ x: L.handX + c * (L.hw + L.g), y: L.handY + r * (L.hh + L.g), w: L.hw, h: L.hh });
    }
  }
  return rects;
}

function zoneRect(L, pos, side) {
  return { x: L.colX(pos) - 3, y: (side === 'top' ? L.top : L.myTop) - 3, w: L.cw + 6, h: L.sideH + 6 };
}

// ------------------------------------------------------------------ targets
// Positions where the selected card can be played with the current face.
function playTargets() {
  if (!G || UI.selected === null) return [];
  const p = V();
  if (!humanTurnFor(p) || G.pending.kind !== 'turn') return [];
  return ALS.legalPlays(G, p, UI.selected).filter(m => m.faceUp === UI.face).map(m => m.pos);
}

function decisionCardTargets() {
  const pd = myPending();
  if (!pd || pd.kind === 'turn') return [];
  if (['flip', 'transportCard', 'redeploy'].includes(pd.kind)) return pd.options;
  return [];
}
function decisionPosTargets() {
  const pd = myPending();
  if (!pd || pd.kind === 'turn') return [];
  if (['reinforce', 'transportDest'].includes(pd.kind)) return pd.options;
  return [];
}

// ------------------------------------------------------------------ drawing
function roundedClip(x, y, w, h, r, fn) {
  const ctx = drawingContext;
  ctx.save();
  if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.clip(); }
  fn();
  ctx.restore();
}

function dashed(on) { drawingContext.setLineDash(on ? [9, 6] : []); }

function drawCard(id, faceUp, r, o) {
  o = o || {};
  const rad = Math.max(4, r.w * 0.05);
  const img = faceUp ? cardImg(id) : backImg();
  roundedClip(r.x, r.y, r.w, r.h, rad, () => image(img, r.x, r.y, r.w, r.h));
  noFill(); stroke(0, 0, 0, 150); strokeWeight(1); rect(r.x, r.y, r.w, r.h, rad);

  const band = r.h * 0.27;
  if (o.peek && !faceUp) {
    // Private reminder of your own face-down card (only on your view).
    const pw = r.w * 0.62, ph = Math.max(14, band * 0.5);
    noStroke(); fill(10, 18, 26, 225);
    rect(r.x + r.w - pw - r.w * 0.04, r.y + band * 0.3, pw, ph, 4);
    fill('#ffd23f'); textAlign(CENTER, CENTER); textStyle(BOLD);
    const peekTxt = `${def(id).name} ${def(id).str}`;
    let ts = Math.max(9, Math.min(ph * 0.62, r.w * 0.12));
    textSize(ts);
    while (textWidth(peekTxt) > pw - 6 && ts > 8) { ts -= 0.5; textSize(ts); }
    text(peekTxt, r.x + r.w - pw / 2 - r.w * 0.04, r.y + band * 0.3 + ph / 2 + 1);
  }
  if (o.eff !== undefined && o.eff !== null) {
    const printed = faceUp ? def(id).str : 2;
    if (o.eff !== printed) {
      const d = Math.max(20, r.w * 0.22);
      const cx = r.x + r.w * 0.42, cy = r.y + band * 0.62;
      stroke('#13202d'); strokeWeight(2); fill('#ffd23f'); circle(cx, cy, d);
      noStroke(); fill('#13202d'); textAlign(CENTER, CENTER); textStyle(BOLD); textSize(d * 0.5);
      text('=' + o.eff, cx, cy + 1);
    }
  }
  if (o.selected) {
    dashed(false); noFill(); stroke('#ffd23f'); strokeWeight(4); rect(r.x - 3, r.y - 3, r.w + 6, r.h + 6, rad + 2);
    stroke('#000'); strokeWeight(1.5); rect(r.x - 6, r.y - 6, r.w + 12, r.h + 12, rad + 4);
  }
  if (o.target) {
    const hh = o.hitH || r.h;
    dashed(true); noFill(); stroke('#000'); strokeWeight(7); rect(r.x - 2, r.y - 2, r.w + 4, hh + 4, rad);
    stroke('#ffd23f'); strokeWeight(4); rect(r.x - 2, r.y - 2, r.w + 4, hh + 4, rad);
    dashed(false);
  }
  if (o.isNew) {
    noStroke(); fill('#ffd23f');
    const s = Math.max(16, r.w * 0.16);
    triangle(r.x + r.w, r.y + r.h - s, r.x + r.w, r.y + r.h, r.x + r.w - s, r.y + r.h);
  }
}

function pill(txt, cx, cy, h, lead) {
  textSize(h * 0.62); textStyle(BOLD);
  const w = textWidth(txt) + h * 0.8;
  stroke(lead ? '#13202d' : '#ffffff'); strokeWeight(2);
  fill(lead ? '#ffd23f' : '#13202d');
  rect(cx - w / 2, cy - h / 2, w, h, h / 2);
  noStroke(); fill(lead ? '#13202d' : '#ffffff'); textAlign(CENTER, CENTER);
  text(txt, cx, cy + 1);
}

function drawBanner(L, pos) {
  const x = L.colX(pos), y = L.bannerY, w = L.cw, h = L.bh;
  const img = theatreImg(G.order[pos]);
  const sh = img.width * h / w;
  roundedClip(x, y, w, h, 8, () => image(img, x, y, w, h, 0, (img.height - sh) / 2, img.width, sh));
  noFill(); stroke(255, 255, 255, 140); strokeWeight(1); rect(x, y, w, h, 8);
  const ctrl = ALS.controller(G, pos);
  const ph = Math.max(20, Math.min(30, L.cw * 0.2));
  const tv = ALS.strength(G, pos, T()), bv = ALS.strength(G, pos, V());
  pill((ctrl === T() ? '★ ' : '') + tv, x + w - ph * 0.9, y + 2, ph, ctrl === T());
  pill((ctrl === V() ? '★ ' : '') + bv, x + w - ph * 0.9, y + h - 2, ph, ctrl === V());
}

function drawSide(L, pos, p, side) {
  const st = G.board[pos][p];
  const eff = ALS.cardStrengths(G, pos, p);
  const tg = decisionCardTargets();
  st.forEach((c, i) => {
    const r = boardRect(L, pos, side, i, st.length);
    drawCard(c.id, c.faceUp, r, {
      peek: handVisible() && p === V(),
      eff: eff[i],
      target: tg.includes(c.id),
      hitH: r.hitH,
      isNew: G.lastPlayed === c.id
    });
  });
  // play / position zones
  const zones = side === 'bottom' ? playTargets().concat(decisionPosTargets()) : [];
  if (zones.includes(pos)) {
    const z = zoneRect(L, pos, side);
    const ny = (side === 'top' ? L.top : L.myTop) + st.length * L.off;
    noStroke(); fill(255, 210, 63, 40); rect(z.x, z.y, z.w, z.h, 10);
    dashed(true); noFill(); stroke('#000'); strokeWeight(7); rect(L.colX(pos), ny, L.cw, L.ch, 8);
    stroke('#ffd23f'); strokeWeight(4); rect(L.colX(pos), ny, L.cw, L.ch, 8); dashed(false);
    const lbl = myPending() && myPending().kind !== 'turn' ? 'Choose' : 'Play here';
    pill(lbl, L.colX(pos) + L.cw / 2, Math.min(ny + L.ch / 2, height - 20), Math.max(22, L.cw * 0.2), true);
  }
}

function drawBoard(L) {
  // info row
  noStroke(); fill('#c9d7e4'); textStyle(NORMAL); textAlign(LEFT, CENTER);
  textSize(Math.min(14, Math.max(11, width * 0.03)));
  const t = T();
  const role = (p) => (p === G.first ? '1st player' : '2nd player');
  text(`${nm(t)} · ${role(t)} · ${G.hands[t].length} in hand`, L.bx + L.g, L.infoY + L.info / 2);
  textAlign(RIGHT, CENTER);
  text(`Deck ${G.deck.length}`, L.bx + 3 * L.cw + 3 * L.g, L.infoY + L.info / 2);

  for (let pos = 0; pos < 3; pos++) {
    drawSide(L, pos, T(), 'top');
    drawBanner(L, pos);
    drawSide(L, pos, V(), 'bottom');
  }

  // hand
  const v = V();
  const hand = G.hands[v];
  noStroke(); fill('#ffffff'); textStyle(BOLD); textAlign(LEFT, CENTER); textSize(Math.min(14, Math.max(11, width * 0.03)));
  const hx = L.mode === 'portrait' ? (width - (6 * L.hw + 5 * L.g)) / 2 : L.handX;
  text(`${possessive(v)} hand · ${role(v)}${isBotMode() || UI.revealed ? '' : ' (hidden)'}`, Math.max(L.g, hx), L.handLabelY + L.handLabel / 2 - 4);
  const rects = handRects(L, hand.length);
  hand.forEach((id, i) => {
    const r = Object.assign({}, rects[i]);
    const sel = UI.selected === id;
    if (sel) r.y -= Math.min(5, r.h * 0.05);
    drawCard(id, handVisible(), r, { selected: sel && handVisible() });
  });
}

function drawSplash() {
  const w = Math.min(width * 0.28, 220), h = w * 0.42, g = 10;
  const x0 = (width - (3 * w + 2 * g)) / 2, y = height / 2 - h - 20;
  ['air', 'land', 'sea'].forEach((t, i) => {
    const img = theatreImg(t);
    const sh = img.width * h / w;
    roundedClip(x0 + i * (w + g), y, w, h, 8, () => image(img, x0 + i * (w + g), y, w, h, 0, (img.height - sh) / 2, img.width, sh));
  });
  noStroke(); fill('#ffffff'); textAlign(CENTER, CENTER); textStyle(BOLD); textSize(Math.min(28, width * 0.06));
  text(CURRENT_THEME.title, width / 2, y + h + 40);
  textStyle(NORMAL); fill('#c9d7e4'); textSize(Math.min(16, width * 0.04));
  text('Press “New game” to start.', width / 2, y + h + 76);
}

// ------------------------------------------------------------------ labels
function strengthNote(pos, p, i) {
  const c = G.board[pos][p][i];
  const eff = ALS.cardStrengths(G, pos, p)[i];
  const printed = c.faceUp ? def(c.id).str : 2;
  if (eff === printed) return `strength ${eff}`;
  return `strength ${eff} (printed ${printed})`;
}

function boardCardLabel(pos, p, i) {
  const st = G.board[pos][p];
  const c = st[i];
  const covered = i < st.length - 1;
  const owner = possessive(p);
  const seeIt = c.faceUp || (p === V() && handVisible());
  let s;
  if (c.faceUp) {
    const d = def(c.id);
    s = `${owner} ${d.name}, face up, ${strengthNote(pos, p, i)}`;
    if (d.type !== 'none') s += `. ${TYPE_LABEL[d.type]}: ${d.text.replace(/\.$/, '')}`;
  } else if (seeIt) {
    s = `${owner} face-down animal (only you can see it is ${def(c.id).name} ${def(c.id).str}), ${strengthNote(pos, p, i)}`;
  } else {
    s = `${owner} face-down animal, ${strengthNote(pos, p, i)}`;
  }
  s += `. In ${hab(pos)}, ${covered ? 'covered' : 'uncovered'}, card ${i + 1} of ${st.length}.`;
  return s;
}

function bannerLabel(pos) {
  const ctrl = ALS.controller(G, pos);
  const a = ALS.strength(G, pos, V()), b = ALS.strength(G, pos, T());
  const tie = a === b ? ' (tie goes to the 1st player)' : '';
  return `${hab(pos)} habitat, position ${pos + 1} of 3. ${nm(V())} ${a}, ${nm(T())} ${b}. ${nm(ctrl)} ${nm(ctrl) === 'You' ? 'control' : 'controls'} it${tie}. Open board as text.`;
}

function handCardLabel(id) {
  const d = def(id);
  let s = `${d.name}, ${THEATRE_LABEL[d.theatre]}, strength ${d.str}`;
  s += d.type === 'none' ? ', no ability' : `. ${TYPE_LABEL[d.type]}: ${d.text}`;
  return s;
}

function optionLabel(pd, v) {
  if (v === null) return 'Skip';
  if (['reinforce', 'transportDest'].includes(pd.kind)) return `${hab(v)}`;
  const f = ALS.find(G, v);
  if (!f) return String(v);
  const owner = possessive(f.player);
  const seeIt = f.card.faceUp || (f.player === V() && handVisible());
  const name = f.card.faceUp ? `${def(v).name} (face up, ${def(v).str})` : seeIt ? `face-down ${def(v).name}` : 'face-down animal';
  return `${owner} ${name} in ${hab(f.pos)}${f.covered ? ', covered' : ''}`;
}

// ------------------------------------------------------------------ DOM: overlay
function mkHit(r, label, key, onClick, extraClass) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'hit' + (extraClass ? ' ' + extraClass : '');
  b.style.left = r.x + 'px'; b.style.top = r.y + 'px';
  b.style.width = r.w + 'px'; b.style.height = (r.hitH || r.h) + 'px';
  b.setAttribute('aria-label', vocab(label));
  b.dataset.key = key;
  b.addEventListener('click', onClick);
  return b;
}

function buildOverlay() {
  const ov = $('overlay');
  ov.innerHTML = '';
  if (!G) return;
  const L = UI.L;
  const tgCards = decisionCardTargets();
  const zones = playTargets().concat(decisionPosTargets());
  const frag = document.createDocumentFragment();

  const addSide = (pos, p, side) => {
    const st = G.board[pos][p];
    const zoneOn = side === 'bottom' && zones.includes(pos);
    st.forEach((c, i) => {
      const r = boardRect(L, pos, side, i, st.length);
      const isT = tgCards.includes(c.id);
      const lbl = (isT ? 'Choose: ' : '') + boardCardLabel(pos, p, i);
      const b = mkHit(r, lbl, `card-${c.id}`, () => onBoardCard(c.id));
      if (zoneOn) { b.tabIndex = -1; b.style.pointerEvents = 'none'; b.setAttribute('aria-hidden', 'true'); }
      frag.appendChild(b);
    });
    if (zoneOn) {
      const z = zoneRect(L, pos, side);
      const pd = myPending();
      let lbl;
      if (pd && pd.kind !== 'turn') lbl = `Choose ${hab(pos)}`;
      else lbl = `Play ${def(UI.selected).name} face ${UI.face ? 'up' : 'down'} to ${hab(pos)}`;
      frag.appendChild(mkHit(z, lbl, `zone-${pos}`, () => onZone(pos), 'zone'));
    }
  };

  // Logical reading order: opponent side, habitats, your side, hand.
  for (let pos = 0; pos < 3; pos++) addSide(pos, T(), 'top');
  for (let pos = 0; pos < 3; pos++) {
    const r = { x: L.colX(pos), y: L.bannerY, w: L.cw, h: L.bh };
    frag.appendChild(mkHit(r, bannerLabel(pos), `banner-${pos}`, () => openTextBoard()));
  }
  for (let pos = 0; pos < 3; pos++) addSide(pos, V(), 'bottom');

  const hand = G.hands[V()];
  const rects = handRects(L, hand.length);
  const myTurn = humanTurnFor(V()) && G.pending.kind === 'turn' && handVisible();
  hand.forEach((id, i) => {
    const r = rects[i];
    let lbl;
    if (!handVisible()) lbl = `Hidden card ${i + 1} in ${possessive(V()).toLowerCase()} hand`;
    else lbl = `Hand card ${i + 1} of ${hand.length}: ${handCardLabel(id)}`;
    const b = mkHit(r, lbl, `hand-${id}`, () => onHandCard(id));
    if (myTurn) b.setAttribute('aria-pressed', UI.selected === id ? 'true' : 'false');
    if (!handVisible()) b.setAttribute('aria-disabled', 'true');
    frag.appendChild(b);
  });
  ov.appendChild(frag);
}

// ------------------------------------------------------------------ DOM: action bar
function btn(label, onClick, o) {
  o = o || {};
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'btn' + (o.cls ? ' ' + o.cls : '');
  b.innerHTML = vocab(label) + (o.sub ? `<span class="sub">${vocab(o.sub)}</span>` : '');
  if (o.pressed !== undefined) b.setAttribute('aria-pressed', o.pressed ? 'true' : 'false');
  if (o.disabled) b.disabled = true;
  if (o.aria) b.setAttribute('aria-label', vocab(o.aria));
  b.dataset.key = o.key || ('act-' + label.replace(/<[^>]+>/g, ''));
  b.addEventListener('click', onClick);
  return b;
}

function group(label, children) {
  const g = document.createElement('div');
  g.className = 'group';
  g.setAttribute('role', 'group');
  g.setAttribute('aria-label', label);
  const s = document.createElement('span');
  s.className = 'group-label'; s.textContent = label; s.setAttribute('aria-hidden', 'true');
  g.appendChild(s);
  children.forEach(c => g.appendChild(c));
  return g;
}

function setPrompt(main, detail) {
  $('prompt').innerHTML = vocab(main) + (detail ? `<span class="detail">${vocab(detail)}</span>` : '');
}

function renderActions() {
  const box = $('action-buttons');
  box.innerHTML = '';
  if (!G) {
    setPrompt('Welcome! Start a new game to play.');
    box.appendChild(btn('New game', () => openDialog('dlg-setup'), { cls: 'btn-primary' }));
    return;
  }
  if (G.phase !== 'play') {
    const r = G.result;
    setPrompt(G.phase === 'gameOver' ? `${nm(r.winner)} ${nm(r.winner) === 'You' ? 'win' : 'wins'} the game!` : `Battle ${G.battle} is over.`);
    box.appendChild(btn('Show results', () => showBattleDialog(true), { cls: 'btn-primary' }));
    return;
  }
  const pd = G.pending;
  if (pd.player === G.bot) {
    if (UI.speed === 'step') {
      setPrompt('The Bot is ready to act.', describeBotPending());
      box.appendChild(btn('Continue', () => botAct(), { cls: 'btn-primary', key: 'act-continue' }));
    } else {
      setPrompt('The Bot is thinking…', describeBotPending());
    }
    return;
  }
  if (!isBotMode() && UI.hide && (!UI.revealed || pd.player !== UI.viewer)) {
    setPrompt(`Pass the device to ${nm(pd.player)}.`);
    box.appendChild(btn(`Show ${nm(pd.player)}’s view`, () => showPass(), { cls: 'btn-primary' }));
    return;
  }
  const p = pd.player;
  if (pd.kind === 'turn') {
    const extras = [];
    if (G.airdropActive[p]) extras.push(`${NK('airdrop')}: this turn you may play face up to any habitat.`);
    if (ALS.hasFaceUp(G, p, 'aerodrome')) extras.push(`${NK('aerodrome')}: animals of strength 3 or less may be played face up to any habitat.`);
    if (ALS.anyFaceUp(G, 'containment')) extras.push(`${NK('containment')} is face up: any animal played face down is discarded.`);
    if (UI.selected === null) {
      setPrompt(`${isBotMode() ? 'Your' : nm(p) + ', your'} turn: choose an animal from your hand.`, extras.join(' '));
      if (G.opts.length !== 'beginner') {
        const pts = ALS.withdrawPoints(G, p);
        box.appendChild(btn('Withdraw', () => confirmWithdraw(), { sub: `${nm(1 - p)} would score ${pts}`, key: 'act-withdraw' }));
      }
      return;
    }
    const id = UI.selected, d = def(id);
    const moves = ALS.legalPlays(G, p, id);
    const upOK = moves.some(m => m.faceUp);
    if (!upOK && UI.face) UI.face = false;
    setPrompt(`${d.name} · ${THEATRE_LABEL[d.theatre]} · strength ${d.str}`,
      (d.type === 'none' ? 'No ability.' : `${TYPE_LABEL[d.type]}: ${d.text}`) + (extras.length ? ' ' + extras.join(' ') : ''));
    box.appendChild(group('Play', [
      btn('Face up', () => { UI.face = true; refresh(); }, { pressed: UI.face, disabled: !upOK, key: 'act-faceup' }),
      btn('Face down', () => { UI.face = false; refresh(); }, { pressed: !UI.face, key: 'act-facedown' })
    ]));
    const pos = moves.filter(m => m.faceUp === UI.face).map(m => m.pos);
    box.appendChild(group('to', pos.map(q => btn(hab(q), () => doPlay(q), {
      cls: 'btn-primary', aria: `Play ${d.name} face ${UI.face ? 'up' : 'down'} to ${hab(q)}`, key: 'act-pos-' + q }))));
    box.appendChild(btn('Card details', () => openCardDetail(id, null), { key: 'act-details' }));
    box.appendChild(btn('Cancel', () => { UI.selected = null; refresh(); }, { key: 'act-cancel' }));
    return;
  }
  // ability decision
  let detail = '';
  if (pd.kind === 'reinforce' && pd.peek !== undefined) {
    const d = def(pd.peek);
    detail = `Top animal of the deck: ${d.name} (${THEATRE_LABEL[d.theatre]}, ${d.str}). It would be played face down.`;
  }
  if (pd.kind === 'transportDest') detail = `Moving: ${optionLabel({ kind: 'x' }, pd.card)}.`;
  if (pd.kind === 'flip' && pd.player !== ALS.find(G, pd.src)?.player) detail = `${possessive(1 - pd.player)} ${NK('disrupt')} makes you flip first.`;
  setPrompt((isBotMode() ? '' : nm(p) + ': ') + pd.prompt, detail);
  const opts = pd.options.map(v => btn(optionLabel(pd, v), () => doResolve(v), { cls: 'btn-primary', key: 'opt-' + v }));
  box.appendChild(group('Options', opts));
  if (pd.optional) box.appendChild(btn('Skip', () => doResolve(null), { key: 'opt-skip' }));
  if (pd.kind === 'reinforce' && pd.peek !== undefined) box.appendChild(btn('View top animal', () => openCardDetail(pd.peek, null), { key: 'act-peek' }));
}

function describeBotPending() {
  const pd = G.pending;
  if (pd.kind === 'turn') return `The Bot has ${G.hands[G.bot].length} cards and plays the top one face up.`;
  return pd.prompt.replace(/^(\w+): .*/, '$1 ability resolving.');
}

// ------------------------------------------------------------------ DOM: score, log
function renderScore() {
  const sb = $('scoreboard');
  if (!G) { sb.innerHTML = ''; return; }
  const beginner = G.opts.length === 'beginner';
  const val = (p) => beginner ? `${G.battleWins[p]} battle${G.battleWins[p] === 1 ? '' : 's'} won` : `${G.scores[p]} pts`;
  const goal = beginner ? 'first to 3 battles' : `first to ${ALS.target(G)}`;
  sb.innerHTML = `
    <span><strong>${nm(0)}</strong> ${val(0)}</span>
    <span><strong>${nm(1)}</strong> ${val(1)}</span>
    <span class="tag">Battle ${G.battle} · ${goal}</span>
    <span class="tag">1st player: ${nm(G.first)}</span>`;
}

function renderLog() {
  if (!G) { $('log').innerHTML = ''; UI.lastLogN = 0; return; }
  const ol = $('log');
  if (UI.lastLogN > G.log.length) { ol.innerHTML = ''; UI.lastLogN = 0; }
  const fresh = G.log.slice(UI.lastLogN);
  for (const e of fresh) {
    const li = document.createElement('li');
    li.textContent = vocab(e.text);
    if (e.tag) li.className = e.tag;
    ol.appendChild(li);
  }
  if (fresh.length) {
    ol.scrollTop = ol.scrollHeight;
    let msg = fresh.map(e => e.text).join(' ');
    const pd = myPending();
    if (pd && pd.kind === 'turn') msg += isBotMode() ? ' Your turn.' : ` ${nm(pd.player)}'s turn.`;
    else if (pd && pd.kind !== 'turn') msg += ' ' + pd.prompt;
    announce(msg);
  }
  UI.lastLogN = G.log.length;
}

function announce(msg) {
  const live = $('live');
  live.textContent = '';
  setTimeout(() => { live.textContent = vocab(msg); }, 60);
}

// ------------------------------------------------------------------ refresh
function refresh(layoutOnly) {
  const active = document.activeElement;
  const hadFocusKey = active && active.dataset ? active.dataset.key : null;
  const focusInGame = active && ($('overlay').contains(active) || $('action-buttons').contains(active));

  UI.L = computeLayout();
  redraw();
  buildOverlay();
  if (!layoutOnly) {
    renderActions();
    renderScore();
    renderLog();
  }
  // Restore focus to the same control if it still exists.
  if (focusInGame && hadFocusKey) {
    const same = document.querySelector(`[data-key="${CSS.escape(hadFocusKey)}"]`);
    if (same && !same.disabled && same.tabIndex !== -1) same.focus({ preventScroll: true });
    else if (!anyDialogOpen()) $('actions').focus({ preventScroll: true });
  }
  if (!layoutOnly) afterChange();
}

function anyDialogOpen() { return !!document.querySelector('dialog[open]'); }

function afterChange() {
  if (!G) return;
  if (G.phase !== 'play') {
    clearTimeout(UI.botTimer); UI.botTimer = null;
    showBattleDialog(false);
    return;
  }
  const pd = G.pending;
  if (pd.player === G.bot) {
    if (UI.speed !== 'step' && !UI.botTimer) {
      const ms = { fast: 350, normal: 900, slow: 1800 }[UI.speed] || 900;
      UI.botTimer = setTimeout(() => { UI.botTimer = null; botAct(); }, ms);
    }
    return;
  }
  if (!isBotMode()) {
    if (UI.hide) {
      if (pd.player !== UI.viewer || !UI.revealed) {
        if (UI.revealed) {
          UI.revealed = false; UI.selected = null;
          UI.L = computeLayout(); redraw(); buildOverlay(); renderActions();
        }
        if (!anyDialogOpen()) showPass();
      }
    } else if (pd.player !== UI.viewer) {
      UI.viewer = pd.player; UI.selected = null;
      refresh();
    }
  }
}

function botAct() {
  if (!G || G.phase !== 'play' || !G.pending || G.pending.player !== G.bot) return;
  BOT.step(G);
  refresh();
}

// ------------------------------------------------------------------ input handlers
function onHandCard(id) {
  if (!handVisible()) return;
  const p = V();
  if (humanTurnFor(p) && G.pending.kind === 'turn') {
    if (UI.selected === id) { UI.selected = null; }
    else {
      UI.selected = id;
      UI.face = ALS.legalPlays(G, p, id).some(m => m.faceUp);
    }
    refresh();
  } else {
    openCardDetail(id, null);
  }
}

function onBoardCard(id) {
  const pd = myPending();
  if (pd && decisionCardTargets().includes(id)) { doResolve(id); return; }
  openCardDetail(id, ALS.find(G, id));
}

function onZone(pos) {
  const pd = myPending();
  if (!pd) return;
  if (pd.kind === 'turn') doPlay(pos);
  else doResolve(pos);
}

function doPlay(pos) {
  const id = UI.selected;
  UI.selected = null;
  ALS.playCard(G, id, pos, UI.face);
  UI.face = true;
  refresh();
}

function doResolve(v) {
  ALS.resolve(G, v);
  refresh();
}

function confirmWithdraw() {
  const p = G.pending.player;
  const pts = ALS.withdrawPoints(G, p);
  $('confirm-title').textContent = 'Withdraw from this battle?';
  $('confirm-text').textContent = `You have ${G.hands[p].length} card${G.hands[p].length === 1 ? '' : 's'} in hand, so ${nm(1 - p)} will score ${pts} points. The battle ends now.`;
  const yes = $('btn-confirm-yes');
  yes.textContent = 'Withdraw';
  yes.onclick = () => {
    closeDialog('dlg-confirm');
    UI.selected = null;
    ALS.withdraw(G, p);
    refresh();
  };
  openDialog('dlg-confirm');
}

// ------------------------------------------------------------------ dialogs
let lastFocus = null;
function openDialog(id) {
  const d = $(id);
  if (d.open) return;
  if (!anyDialogOpen()) lastFocus = document.activeElement;
  d.showModal();
}
function closeDialog(id) {
  const d = $(id);
  if (d.open) d.close();
}

function showPass() {
  const p = G.pending.player;
  $('pass-title').textContent = `${nm(p)}’s turn`;
  $('pass-text').textContent = vocab(G.pending.kind === 'turn'
    ? `Pass the device to ${nm(p)}. ${nm(p)}, press the button when only you can see the screen.`
    : `${nm(p)} needs to make a choice: ${G.pending.prompt} Pass the device to ${nm(p)}.`);
  $('btn-pass-ok').textContent = `I’m ${nm(p)} — show my hand`;
  $('btn-pass-ok').onclick = () => {
    UI.viewer = p; UI.revealed = true; UI.selected = null;
    closeDialog('dlg-pass');
    refresh();
    $('actions').focus({ preventScroll: true });
  };
  openDialog('dlg-pass');
}

function showBattleDialog(force) {
  if (!force && UI.resultShownFor === G.battle) return;
  UI.resultShownFor = G.battle;
  const r = G.result;
  const over = G.phase === 'gameOver';
  $('battle-title').textContent = over ? `${nm(r.winner)} ${nm(r.winner) === 'You' ? 'win' : 'wins'} the game!` : `${nm(r.winner)} ${nm(r.winner) === 'You' ? 'win' : 'wins'} battle ${G.battle}`;
  const beginner = G.opts.length === 'beginner';
  let how;
  const vb = (p, w) => (nm(p) === 'You' ? w : w + 's');
  if (r.reason === 'withdraw') how = `${r.why ? r.why : nm(r.withdrawer) + ' withdrew.'} ${nm(r.winner)} ${beginner ? vb(r.winner, 'win') + ' the battle' : vb(r.winner, 'score') + ' ' + r.points + ' points'}.`;
  else how = `All animals have been played. ${nm(r.winner)} ${vb(r.winner, 'control')} ${r.control.filter(c => c === r.winner).length} habitats${beginner ? '' : ' and ' + vb(r.winner, 'score') + ' 6 points'}.`;
  if (r.enhancement && r.enhancement.length) how += ` Difficulty enhancement added: ${r.enhancement.map(id => def(id).name).join(', ')}.`;
  const rows = [0, 1, 2].map(pos => `<tr><th scope="row">${hab(pos)}</th><td>${r.totals[pos][0]}</td><td>${r.totals[pos][1]}</td><td>${nm(r.control[pos])}</td></tr>`).join('');
  const score = beginner
    ? `${nm(0)}: ${G.battleWins[0]} battles won · ${nm(1)}: ${G.battleWins[1]} battles won (first to 3).`
    : `${nm(0)}: ${G.scores[0]} points · ${nm(1)}: ${G.scores[1]} points (first to ${ALS.target(G)}).`;
  $('battle-content').innerHTML = vocab(`<p>${how}</p>
    <div class="table-scroll" tabindex="0"><table><caption>Final strength in each habitat</caption>
    <thead><tr><th scope="col">Habitat</th><th scope="col">${nm(0)}</th><th scope="col">${nm(1)}</th><th scope="col">Controlled by</th></tr></thead>
    <tbody>${rows}</tbody></table></div>
    <p><strong>Score:</strong> ${score}</p>
    ${over ? '' : '<p>Next battle: the habitats rotate one place' + (isBotMode() ? ' and the Bot stays 1st player.' : ' and players swap 1st and 2nd player.') + '</p>'}`);
  const act = $('battle-actions');
  act.innerHTML = '';
  if (over) {
    act.appendChild(btn('Play again', () => { closeDialog('dlg-battle'); startGame(UI.lastOpts); }, { cls: 'btn-primary' }));
    act.appendChild(btn('Change settings', () => { closeDialog('dlg-battle'); openDialog('dlg-setup'); }));
  } else {
    act.appendChild(btn('Next battle', () => {
      closeDialog('dlg-battle');
      ALS.nextBattle(G);
      UI.selected = null;
      if (!isBotMode()) UI.revealed = false;
      refresh();
    }, { cls: 'btn-primary' }));
  }
  act.appendChild(btn('Review board', () => closeDialog('dlg-battle')));
  openDialog('dlg-battle');
}

function openCardDetail(id, loc) {
  const hidden = loc && !loc.card.faceUp && !(loc.player === V() && handVisible());
  const d = def(id);
  const img = $('card-img');
  const text = $('card-text');
  if (hidden) {
    $('card-title').textContent = vocab(`${possessive(loc.player)} face-down animal`);
    img.src = backURL();
    img.alt = backAlt();
    text.innerHTML = `<dl><dt>Strength</dt><dd>${ALS.cardStrengths(G, loc.pos, loc.player)[loc.index]}</dd>
      <dt>Habitat</dt><dd>${hab(loc.pos)}, ${loc.covered ? 'covered' : 'uncovered'}</dd>
      <dt>Ability</dt><dd>None while face down. Its identity is hidden.</dd></dl>`;
  } else {
    $('card-title').textContent = d.name;
    img.src = cardURL(id);
    img.alt = `${d.name} card. ${drawnTheme() ? 'Illustration' : 'Photo'}: ${d.photo} Printed: ${d.str}, ${d.name}${d.type === 'none' ? '' : ', ' + d.text}`;
    let extra = '';
    if (loc) {
      const eff = ALS.cardStrengths(G, loc.pos, loc.player)[loc.index];
      extra = `<dt>On the board</dt><dd>${possessive(loc.player)} side of ${hab(loc.pos)}, face ${loc.card.faceUp ? 'up' : 'down'}, ${loc.covered ? 'covered' : 'uncovered'}. Current strength ${eff}.</dd>`;
    }
    text.innerHTML = `<dl><dt>Habitat</dt><dd>${THEATRE_LABEL[d.theatre]}</dd><dt>Strength</dt><dd>${d.str}</dd>
      <dt>Type</dt><dd>${TYPE_LABEL[d.type]}</dd><dt>Ability</dt><dd>${d.text || 'None'}</dd>${extra}</dl>`;
  }
  text.innerHTML = vocab(text.innerHTML);
  openDialog('dlg-card');
}

function openTextBoard() {
  if (!G) return;
  const v = V(), t = T();
  const sideList = (pos, p) => {
    const st = G.board[pos][p];
    if (!st.length) return 'No animals';
    const eff = ALS.cardStrengths(G, pos, p);
    return '<ol>' + st.map((c, i) => {
      const see = c.faceUp || (p === v && handVisible());
      const n = c.faceUp ? def(c.id).name : see ? `Face down (${def(c.id).name})` : 'Face down';
      return `<li>${n} — strength ${eff[i]}${i === st.length - 1 ? ' (uncovered)' : ''}</li>`;
    }).join('') + '</ol>';
  };
  const rows = [0, 1, 2].map(pos => {
    const sb = ALS.supportBonus(G, pos, t), sv = ALS.supportBonus(G, pos, v);
    return `<tr><th scope="row">${hab(pos)}</th>
      <td>${sideList(pos, t)}${sb ? `<p>${NK('support')} bonus +${sb}</p>` : ''}<p><strong>Total ${ALS.strength(G, pos, t)}</strong></p></td>
      <td>${sideList(pos, v)}${sv ? `<p>${NK('support')} bonus +${sv}</p>` : ''}<p><strong>Total ${ALS.strength(G, pos, v)}</strong></p></td>
      <td>${nm(ALS.controller(G, pos))}</td></tr>`;
  }).join('');
  const hand = handVisible() ? G.hands[v].map(id => `${def(id).name} (${THEATRE_LABEL[def(id).theatre]} ${def(id).str})`).join(', ') : 'Hidden';
  $('text-content').innerHTML = vocab(`
    <p>Habitats from left to right. Covered cards are listed first; the last card in each list is on top. Ties go to the 1st player, ${nm(G.first)}.</p>
    <div class="table-scroll" tabindex="0"><table><caption>Board, battle ${G.battle}</caption>
      <thead><tr><th scope="col">Habitat</th><th scope="col">${nm(t)}</th><th scope="col">${nm(v)}</th><th scope="col">Controlled by</th></tr></thead>
      <tbody>${rows}</tbody></table></div>
    <p><strong>${possessive(v)} hand:</strong> ${hand}</p>
    <p><strong>${possessive(t)} hand:</strong> ${G.hands[t].length} hidden cards. <strong>Deck:</strong> ${G.deck.length} cards.</p>`);
  openDialog('dlg-text');
}

// ------------------------------------------------------------------ game start
function startGame(opts) {
  applyTheme(opts.theme || 'critters');
  setTitle();
  UI.lastOpts = opts;
  clearTimeout(UI.botTimer); UI.botTimer = null;
  G = ALS.newGame(opts);
  UI.speed = opts.speed || 'normal';
  UI.hide = opts.mode === 'hotseat' ? opts.hide : false;
  UI.viewer = opts.mode === 'bot' ? 0 : G.first;
  UI.revealed = opts.mode === 'bot' || !UI.hide;
  UI.selected = null;
  UI.face = true;
  UI.lastLogN = 0;
  UI.resultShownFor = null;
  $('log').innerHTML = '';
  refresh();
  if (!anyDialogOpen()) $('actions').focus({ preventScroll: true });
}

function wireDOM() {
  setTitle();

  // Generic close buttons and dialog focus return.
  document.querySelectorAll('dialog').forEach(d => {
    d.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', () => d.close()));
    d.addEventListener('close', () => {
      if (!anyDialogOpen() && lastFocus && document.contains(lastFocus)) lastFocus.focus({ preventScroll: true });
      else if (!anyDialogOpen()) $('actions').focus({ preventScroll: true });
      if (d.id === 'dlg-pass' && G && !UI.revealed) renderActions();
    });
    // Click on the backdrop closes info dialogs.
    if (['dlg-rules', 'dlg-card', 'dlg-text'].includes(d.id)) {
      d.addEventListener('click', (e) => { if (e.target === d) d.close(); });
    }
  });
  // The pass screen must not be dismissed with Escape (would reveal nothing, but keep flow clear).
  $('dlg-pass').addEventListener('cancel', (e) => e.preventDefault());

  document.querySelectorAll('[data-open]').forEach(b => b.addEventListener('click', () => openDialog(b.dataset.open)));

  $('btn-rules').addEventListener('click', () => openDialog('dlg-rules'));
  $('btn-new').addEventListener('click', () => openDialog('dlg-setup'));
  $('btn-text-board').addEventListener('click', () => {
    if (G) openTextBoard(); else announce('No game in progress.');
  });
  const logBtn = $('btn-log');
  logBtn.addEventListener('click', () => {
    const open = $('logpanel').classList.toggle('open');
    logBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (open) $('btn-log-close').focus();
  });
  $('btn-log-close').addEventListener('click', () => {
    $('logpanel').classList.remove('open');
    logBtn.setAttribute('aria-expanded', 'false');
    logBtn.focus();
  });

  // Setup form
  const form = $('setup-form');
  const syncSetup = () => {
    const mode = form.elements.mode.value;
    $('fs-bot').hidden = mode !== 'bot';
    $('fs-names').hidden = mode !== 'hotseat';
  };
  form.addEventListener('change', syncSetup);
  syncSetup();
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const f = form.elements;
    const mode = f.mode.value;
    const clean = (v, d) => (v || '').trim().slice(0, 16) || d;
    let names = null;
    if (mode === 'hotseat') {
      names = [clean(f.name1.value, 'Player 1'), clean(f.name2.value, 'Player 2')];
      if (names[0] === names[1]) names[1] += ' (2)';
      if (names[0] === 'You') names[0] = 'You (P1)';
      if (names[1] === 'You') names[1] = 'You (P2)';
    }
    closeDialog('dlg-setup');
    startGame({
      mode,
      botLevel: f.botLevel.value,
      length: f.length.value,
      transportUncovered: f.transportUncovered.checked,
      speed: f.speed.value,
      theme: f.theme.value,
      hide: f.hide.checked,
      names
    });
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !anyDialogOpen() && G && UI.selected !== null) {
      UI.selected = null; refresh();
    }
  });

  // Expose a tiny hook for automated tests.
  window.__als = { get G() { return G; }, UI, refresh, startGame };
}
