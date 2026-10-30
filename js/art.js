// Original card art for the "War" and "Critters at War" themes, drawn with
// p5.js into off-screen graphics (450 × 630 cards, 700 × 500 habitat banners).
// Nothing here copies the official artwork.

/* global createGraphics, randomSeed, random, PI, TWO_PI, HALF_PI, CLOSE, LEFT, RIGHT, TOP, CENTER, BOLD, BASELINE, CARD_DEFS */

const ART = (() => {
  const CW = 450, CH = 630, BAND = 160;

  const PAL = {
    war: {
      air: { band: '#1d3349', num: '#9fd3ff', text: '#ffffff', edge: '#0d1b28', tag: '#9fd3ff' },
      land: { band: '#2c3519', num: '#e3d27e', text: '#ffffff', edge: '#151a0b', tag: '#e3d27e' },
      sea: { band: '#0f2c46', num: '#86dbe3', text: '#ffffff', edge: '#06141f', tag: '#86dbe3' }
    },
    critterswar: {
      air: { band: '#ffffff', num: '#1f6fd1', text: '#13202d', edge: '#6aa9e8', tag: '#1f6fd1' },
      land: { band: '#2f7f31', num: '#ffffff', text: '#ffffff', edge: '#1d5a1f', tag: '#ffe066' },
      sea: { band: '#1660ad', num: '#ffffff', text: '#ffffff', edge: '#0d3f74', tag: '#ffe066' }
    }
  };

  // ---------------------------------------------------------------- helpers
  function vgrad(g, x, y, w, h, c1, c2) {
    const a = g.color(c1), b = g.color(c2);
    for (let i = 0; i < h; i++) {
      g.stroke(g.lerpColor(a, b, i / h));
      g.line(x, y + i, x + w, y + i);
    }
    g.noStroke();
  }

  function cloud(g, x, y, s, a) {
    g.noStroke(); g.fill(255, 255, 255, a || 220);
    g.ellipse(x, y, 90 * s, 46 * s);
    g.ellipse(x - 34 * s, y + 8 * s, 60 * s, 34 * s);
    g.ellipse(x + 36 * s, y + 6 * s, 66 * s, 38 * s);
    g.ellipse(x + 6 * s, y - 16 * s, 56 * s, 40 * s);
  }

  function waves(g, y0, h, c1, c2, w) {
    vgrad(g, 0, y0, w, h, c1, c2);
    g.noFill(); g.stroke(255, 255, 255, 70); g.strokeWeight(3);
    for (let r = 0; r < 5; r++) {
      const y = y0 + 20 + r * (h / 5);
      for (let x = -20; x < w; x += 60) g.arc(x + (r % 2) * 30, y, 50, 14, PI, TWO_PI);
    }
    g.noStroke();
  }

  function scene(g, theme, t, x, y, w, h) {
    if (theme === 'war') {
      if (t === 'air') { vgrad(g, x, y, w, h, '#6f97bc', '#cddfeb'); cloud(g, x + w * 0.2, y + h * 0.25, 0.9, 150); cloud(g, x + w * 0.8, y + h * 0.7, 1.1, 150); }
      if (t === 'land') { vgrad(g, x, y, w, h * 0.55, '#a9b9c2', '#d8d6bd'); vgrad(g, x, y + h * 0.55, w, h * 0.45, '#7b7a43', '#4f4f26'); }
      if (t === 'sea') { vgrad(g, x, y, w, h * 0.5, '#93aec4', '#d3dde3'); waves(g, y + h * 0.5, h * 0.5, '#3b6a8e', '#1d3c56', x + w); }
    } else {
      if (t === 'air') { vgrad(g, x, y, w, h, '#9fd8ff', '#f1fbff'); cloud(g, x + w * 0.22, y + h * 0.22, 0.9); cloud(g, x + w * 0.82, y + h * 0.72, 1.1); }
      if (t === 'land') {
        vgrad(g, x, y, w, h * 0.6, '#bfe8ff', '#f6fbe8');
        g.fill('#7cc96b'); g.ellipse(x + w * 0.25, y + h * 0.75, w * 1.1, h * 0.55);
        g.fill('#5fb052'); g.ellipse(x + w * 0.85, y + h * 0.85, w * 1.0, h * 0.5);
        g.fill('#4f9a45'); g.rect(x, y + h * 0.8, w, h * 0.2);
      }
      if (t === 'sea') {
        vgrad(g, x, y, w, h, '#5cc3f0', '#1d78c2');
        g.noFill(); g.stroke(255, 255, 255, 150); g.strokeWeight(3);
        [[0.15, 0.3, 16], [0.85, 0.2, 12], [0.9, 0.55, 18], [0.1, 0.7, 10], [0.2, 0.85, 14]].forEach(b => g.circle(x + w * b[0], y + h * b[1], b[2]));
        g.noStroke(); g.fill('#f2d58a'); g.rect(x, y + h * 0.92, w, h * 0.08);
      }
    }
  }

  function lightning(g, x, y, s, c) {
    g.noStroke(); g.fill(c);
    g.beginShape();
    [[6, 0], [20, 0], [12, 14], [22, 14], [2, 40], [8, 20], [-2, 20]].forEach(p => g.vertex(x + p[0] * s, y + p[1] * s));
    g.endShape(CLOSE);
  }
  function infinity(g, x, y, s, c) {
    g.noFill(); g.stroke(c); g.strokeWeight(4 * s);
    g.ellipse(x + 8 * s, y + 10 * s, 16 * s, 12 * s);
    g.ellipse(x + 24 * s, y + 10 * s, 16 * s, 12 * s);
    g.noStroke();
  }

  function fitText(g, str, maxW, size, minSize) {
    let s = size;
    g.textSize(s);
    while (g.textWidth(str) > maxW && s > minSize) { s -= 1; g.textSize(s); }
    return s;
  }

  function frame(g, theme, t, numStr, name, type, text, P) {
    // band
    g.noStroke(); g.fill(P.band);
    g.beginShape(); g.vertex(0, 0); g.vertex(CW, 0); g.vertex(CW, BAND - 14); g.vertex(0, BAND + 14); g.endShape(CLOSE);
    // number
    g.fill(P.num); g.textStyle(BOLD); g.textAlign(LEFT, TOP); g.textSize(118);
    g.text(numStr, 20, 4);
    // icon
    if (type === 'instant') lightning(g, 104, 24, 1.1, P.num);
    if (type === 'ongoing') infinity(g, 98, 22, 1.2, P.num);
    // name
    g.fill(P.text); g.textAlign(RIGHT, TOP);
    const big = !text;
    fitText(g, name.toUpperCase(), big ? 290 : 280, big ? 46 : 32, 18);
    g.text(name.toUpperCase(), CW - 20, big ? 44 : 16);
    // ability
    if (text) {
      g.textStyle(BOLD); g.textSize(18); g.textLeading(21); g.textAlign(RIGHT, TOP);
      g.text(text, 138, 56, CW - 158, 100);
    }
    // bottom tag (habitat word so colour is not the only cue) + mirrored number
    g.fill(P.band); g.rect(0, CH - 44, CW, 44);
    g.fill(P.tag); g.textStyle(BOLD); g.textSize(22); g.textAlign(LEFT, CENTER);
    g.text(t.toUpperCase(), 20, CH - 22);
    g.textAlign(RIGHT, CENTER); g.text(numStr, CW - 20, CH - 22);
    // border
    g.noFill(); g.stroke(P.edge); g.strokeWeight(10); g.rect(0, 0, CW, CH, 22); g.noStroke();
  }

  // ---------------------------------------------------------------- WAR drawers
  const OD = '#3b4a2a', DARK = '#262e22', STEEL = '#4a5866', STEEL_D = '#2e3842';

  function planeTop(g, x, y, s, ang, kind) {
    g.push(); g.translate(x, y); g.rotate(ang || 0); g.scale(s);
    const big = kind === 'bomber';
    const wing = big ? 150 : 90;
    g.noStroke(); g.fill(big ? STEEL_D : '#3a4652');
    g.quad(-wing, 6, wing, 6, wing - 12, -16, -wing + 12, -16);         // wings
    g.quad(-36, 58, 36, 58, 30, 44, -30, 44);                             // tailplane
    g.ellipse(0, 4, big ? 34 : 24, big ? 140 : 120);                      // fuselage
    g.fill('#9fd3ff'); g.ellipse(0, -36, 10, 20);                         // canopy
    g.fill('#c8c8c8');
    const engines = big ? [-95, -50, 50, 95] : [0];
    engines.forEach(ex => { g.rect(ex - 5, -34, 10, 22, 3); g.fill(255, 255, 255, 90); g.ellipse(ex, -36, 34, 6); g.fill('#c8c8c8'); });
    g.fill('#d23b2f'); g.circle(-wing * 0.6, -4, 14); g.circle(wing * 0.6, -4, 14); // roundels
    g.fill('#ffffff'); g.circle(-wing * 0.6, -4, 6); g.circle(wing * 0.6, -4, 6);
    g.pop();
  }

  function parachute(g, x, y, s) {
    g.push(); g.translate(x, y); g.scale(s);
    g.fill('#e8dfc2'); g.stroke('#6d6446'); g.strokeWeight(2);
    g.arc(0, 0, 120, 90, PI, TWO_PI, CLOSE);
    g.line(-20, 0, -12, -44); g.line(20, 0, 12, -44);
    g.stroke(DARK); g.strokeWeight(1.5);
    [-60, -20, 20, 60].forEach(lx => g.line(lx, 0, 0, 72));
    g.noStroke(); g.fill('#7a5a2e'); g.rect(-16, 70, 32, 26, 3);
    g.stroke('#4e3a1e'); g.strokeWeight(2); g.line(-16, 83, 16, 83); g.noStroke();
    g.pop();
  }

  function tower(g, x, y, s) {
    g.push(); g.translate(x, y); g.scale(s);
    g.fill('#55603f'); g.rect(-200, 70, 400, 50);
    g.fill('#e8e4cf'); for (let i = -180; i < 200; i += 50) g.rect(i, 92, 26, 6);
    g.fill('#6f6a55'); g.rect(-40, -80, 80, 150);
    g.fill('#4a463a'); g.quad(-64, -80, 64, -80, 50, -130, -50, -130);
    g.fill('#9fd3ff'); for (let i = -40; i < 40; i += 22) g.rect(i, -122, 16, 34);
    g.fill('#d9d4b8'); for (let r = 0; r < 4; r++) for (let c = 0; c < 2; c++) g.rect(-26 + c * 32, -60 + r * 32, 18, 18);
    g.stroke(DARK); g.strokeWeight(4); g.line(110, 70, 110, -40); g.noStroke();
    g.fill('#e46b2c'); g.quad(110, -40, 170, -30, 170, -14, 110, -6);
    g.fill('#ffffff'); g.quad(130, -36, 145, -34, 145, -12, 130, -10);
    g.pop();
  }

  function searchlights(g, x, y, s) {
    g.push(); g.translate(x, y); g.scale(s);
    g.fill(255, 245, 190, 110);
    g.triangle(-80, 110, -200, -200, -100, -210);
    g.triangle(80, 110, 120, -210, 220, -190);
    planeTop(g, -140, -150, 0.35, 0.5);
    g.fill(DARK);
    [-80, 80].forEach(lx => {
      g.rect(lx - 24, 110, 48, 30, 4);
      g.push(); g.translate(lx, 110); g.rotate(lx < 0 ? -0.45 : 0.3);
      g.fill('#5a6a52'); g.rect(-22, -40, 44, 44, 8); g.fill('#fff7c2'); g.ellipse(0, -40, 40, 12);
      g.pop();
    });
    g.pop();
  }

  function soldier(g, x, y, s) {
    g.push(); g.translate(x, y); g.scale(s);
    g.fill(OD);
    g.rect(-14, 10, 12, 56, 4); g.rect(4, 10, 12, 56, 4);       // legs
    g.rect(-20, -50, 40, 66, 8);                                 // body
    g.fill('#8b6b4a'); g.circle(0, -66, 30);                     // face
    g.fill('#4b5a2e'); g.arc(0, -70, 46, 40, PI, TWO_PI, CLOSE); g.rect(-26, -72, 52, 6, 3); // helmet
    g.stroke('#2a2014'); g.strokeWeight(6); g.line(16, -40, 36, -100); g.noStroke(); // rifle
    g.fill('#2e3a20'); g.rect(-22, -6, 44, 8);                   // belt
    g.pop();
  }

  function bushes(g, x, y, s) {
    g.push(); g.translate(x, y); g.scale(s);
    soldier(g, -50, -10, 0.9); soldier(g, 60, -20, 0.9);
    g.fill('#3f6b2a'); [[-140, 40, 150], [-40, 50, 170], [80, 40, 160], [170, 60, 120]].forEach(b => g.circle(b[0], b[1], b[2]));
    g.fill('#55893a'); [[-110, 20, 80], [0, 20, 90], [110, 20, 80]].forEach(b => g.circle(b[0], b[1], b[2]));
    g.fill('#ffffff'); [[-60, -10], [-40, -10], [50, -20], [70, -20]].forEach(e => g.circle(e[0], e[1] + 26, 10));
    g.pop();
  }

  function jeep(g, x, y, s) {
    g.push(); g.translate(x, y); g.scale(s);
    g.stroke('#dcd6b4'); g.strokeWeight(5); [-30, -10, 10].forEach(l => g.line(-210, l, -150, l)); g.noStroke();
    g.fill('#4f5d31');
    g.beginShape(); g.vertex(-130, 20); g.vertex(140, 20); g.vertex(150, -20); g.vertex(60, -26); g.vertex(30, -60); g.vertex(20, -60); g.vertex(10, -26); g.vertex(-130, -30); g.endShape(CLOSE);
    g.fill('#9fd3ff'); g.quad(14, -30, 26, -56, 32, -56, 54, -28);
    g.fill('#ffffff'); g.textAlign(CENTER, CENTER); g.textSize(26); g.textStyle(BOLD); g.text('★', -60, -6);
    g.fill('#1c1c1c'); g.circle(-80, 24, 62); g.circle(95, 24, 62);
    g.fill('#8a8a7a'); g.circle(-80, 24, 26); g.circle(95, 24, 26);
    g.pop();
  }

  function artillery(g, x, y, s) {
    g.push(); g.translate(x, y); g.scale(s);
    g.fill(DARK); g.quad(-170, 70, -150, 80, 20, 20, 0, 10);
    g.push(); g.rotate(-0.55); g.fill('#3d4a2b'); g.rect(-10, -16, 230, 26, 6); g.rect(200, -20, 30, 34, 4); g.pop();
    g.fill('#4f5d31'); g.rect(-50, -50, 90, 80, 6);
    g.fill('#1c1c1c'); g.circle(-10, 50, 90); g.fill('#7a7a6a'); g.circle(-10, 50, 30);
    g.pop();
  }

  function radio(g, x, y, s) {
    g.push(); g.translate(x, y); g.scale(s);
    g.noFill(); g.stroke('#fff4b0'); g.strokeWeight(6);
    [60, 110, 160].forEach(r => g.arc(70, -150, r, r, -PI * 0.85, -PI * 0.15));
    g.stroke(DARK); g.strokeWeight(6); g.line(70, -30, 70, -150); g.noStroke();
    g.fill('#4f5d31'); g.rect(-120, -40, 220, 140, 10);
    g.fill('#2e3a20'); g.rect(-100, -20, 180, 60, 6);
    g.fill('#9fe39a'); g.rect(-90, -10, 100, 40, 4);
    g.stroke('#1d3a1a'); g.strokeWeight(3); g.noFill();
    g.beginShape(); for (let i = 0; i < 10; i++) g.vertex(-85 + i * 10, 10 + (i % 2 ? -12 : 12)); g.endShape(); g.noStroke();
    g.fill('#c8c8b0'); g.circle(50, 70, 34); g.circle(-60, 70, 34);
    g.fill(DARK); g.circle(50, 70, 10); g.circle(-60, 70, 10);
    g.pop();
  }

  function tank(g, x, y, s) {
    g.push(); g.translate(x, y); g.scale(s);
    g.fill('#1f241b'); g.rect(-170, 10, 340, 70, 35);
    g.fill('#6b6b55'); for (let i = -130; i <= 130; i += 52) g.circle(i, 45, 44);
    g.fill('#4f5d31'); g.quad(-180, 14, 180, 14, 150, -30, -160, -30);
    g.fill('#45522a'); g.rect(-80, -80, 140, 56, 16);
    g.fill('#3d4a2b'); g.rect(50, -64, 190, 20, 6); g.rect(230, -68, 24, 28, 4);
    g.fill('#ffffff'); g.textAlign(CENTER, CENTER); g.textSize(28); g.textStyle(BOLD); g.text('★', -10, -52);
    g.pop();
  }

  function shipHull(g, len, h, col) {
    g.fill(col);
    g.beginShape(); g.vertex(-len / 2, -h); g.vertex(len / 2 + 30, -h); g.vertex(len / 2, h * 0.6); g.vertex(-len / 2 + 14, h * 0.6); g.endShape(CLOSE);
  }
  function turret(g, x, y, dir) {
    g.fill(STEEL_D); g.rect(x - 22, y - 18, 44, 18, 6);
    g.rect(dir > 0 ? x + 10 : x - 70, y - 14, 60, 7, 3);
  }

  function battleship(g, x, y, s) {
    g.push(); g.translate(x, y); g.scale(s);
    shipHull(g, 360, 26, STEEL);
    g.fill('#5d6b78'); g.rect(-60, -80, 110, 56, 4); g.rect(-30, -120, 50, 42, 4);
    g.fill(STEEL_D); g.rect(60, -96, 30, 72, 4); g.rect(-6, -160, 6, 44);
    turret(g, -130, -26, -1); turret(g, -80, -26, -1); turret(g, 130, -26, 1);
    g.fill('#9fd3ff'); for (let i = -54; i < 40; i += 18) g.rect(i, -70, 10, 8);
    g.pop();
  }
  function destroyer(g, x, y, s) {
    g.push(); g.translate(x, y); g.scale(s);
    g.fill(255, 255, 255, 180); g.triangle(170, 0, 230, 20, 160, 26);
    shipHull(g, 300, 20, '#55636f');
    g.fill('#6b7987'); g.rect(-30, -70, 80, 52, 4); g.fill(STEEL_D); g.rect(-70, -64, 26, 46, 4);
    g.rect(16, -110, 5, 42); turret(g, 110, -20, 1); turret(g, -120, -20, -1);
    g.pop();
  }
  function transportShip(g, x, y, s) {
    g.push(); g.translate(x, y); g.scale(s);
    shipHull(g, 320, 24, '#5d5547');
    g.fill('#d8d2bf'); g.rect(90, -90, 60, 66, 4); g.fill(STEEL_D); g.rect(110, -120, 20, 32);
    const crates = ['#b5793a', '#8d5a2b', '#9e6a33', '#7a4e24'];
    for (let r = 0; r < 2; r++) for (let c = 0; c < 5; c++) { g.fill(crates[(r + c) % 4]); g.rect(-150 + c * 46, -66 + r * -40 + 40, 42, 38, 3); }
    g.stroke(DARK); g.strokeWeight(5); g.line(60, -24, 60, -140); g.line(60, -140, -40, -100); g.noStroke();
    g.pop();
  }
  function submarine(g, x, y, s) {
    g.push(); g.translate(x, y); g.scale(s);
    g.fill('#6c7c8a'); g.ellipse(0, 0, 360, 56); g.fill('#6c7c8a');
    g.rect(-30, -70, 70, 56, 10); g.rect(10, -120, 6, 54);
    g.rect(16, -120, 20, 8);
    g.fill('#9fd3ff'); g.circle(-10, -50, 10); g.circle(16, -50, 10);
    g.pop();
  }
  function mines(g, x, y, s) {
    g.push(); g.translate(x, y); g.scale(s);
    [[-110, -10, 1], [20, 30, 1.2], [140, -30, 0.9]].forEach(m => {
      g.stroke('#20262b'); g.strokeWeight(3); g.line(m[0], m[1], m[0], 200);
      g.push(); g.translate(m[0], m[1]); g.scale(m[2]);
      g.strokeWeight(6); for (let a = 0; a < TWO_PI; a += PI / 4) g.line(0, 0, Math.cos(a) * 48, Math.sin(a) * 48);
      g.noStroke(); g.fill('#2b3238'); g.circle(0, 0, 70); g.fill(255, 255, 255, 60); g.circle(-12, -12, 18);
      g.pop();
    });
    g.noStroke();
    g.pop();
  }
  function rockets(g, x, y, s) {
    g.push(); g.translate(x, y); g.scale(s);
    [[-70, 0, -0.25], [70, -40, 0.2]].forEach(r => {
      g.push(); g.translate(r[0], r[1]); g.rotate(r[2]);
      g.fill(255, 220, 140, 120); g.ellipse(0, 120, 30, 140);
      g.fill('#ff8a2c'); g.triangle(-12, 60, 12, 60, 0, 110);
      g.fill('#d9d9cf'); g.rect(-14, -60, 28, 120, 6); g.fill('#c23a2a'); g.triangle(-14, -60, 14, -60, 0, -100);
      g.fill('#3a4652'); g.triangle(-14, 40, -30, 66, -14, 60); g.triangle(14, 40, 30, 66, 14, 60);
      g.pop();
    });
    g.pop();
  }

  const WAR_DRAW = [
    (g, x, y) => { planeTop(g, x, y - 70, 0.75); planeTop(g, x - 110, y + 40, 0.65); planeTop(g, x + 110, y + 40, 0.65); },
    (g, x, y) => { planeTop(g, x + 80, y - 120, 0.55, 1.57); parachute(g, x - 60, y - 10, 0.9); parachute(g, x + 70, y + 60, 0.75); },
    (g, x, y) => {
      g.noFill(); g.stroke(255, 255, 255, 170); g.strokeWeight(6);
      g.arc(x - 30, y + 20, 300, 240, PI * 0.55, PI * 1.25); g.noStroke();
      planeTop(g, x + 20, y - 10, 1.0, 0.7);
    },
    (g, x, y) => tower(g, x - 20, y + 30, 0.95),
    (g, x, y) => searchlights(g, x, y + 30, 0.95),
    (g, x, y) => planeTop(g, x, y + 10, 1.05, -0.1, 'bomber'),
    (g, x, y) => { soldier(g, x - 110, y + 40, 1.1); soldier(g, x, y + 30, 1.2); soldier(g, x + 110, y + 40, 1.1); },
    (g, x, y) => bushes(g, x, y + 60, 1.0),
    (g, x, y) => jeep(g, x + 20, y + 70, 0.95),
    (g, x, y) => artillery(g, x, y + 60, 1.0),
    (g, x, y) => radio(g, x - 10, y + 60, 1.05),
    (g, x, y) => tank(g, x - 20, y + 70, 0.85),
    (g, x, y) => transportShip(g, x - 10, y + 60, 0.95),
    (g, x, y) => rockets(g, x, y - 20, 1.0),
    (g, x, y) => destroyer(g, x - 20, y + 60, 1.0),
    (g, x, y) => submarine(g, x, y + 70, 0.95),
    (g, x, y) => mines(g, x, y + 20, 0.95),
    (g, x, y) => battleship(g, x - 10, y + 70, 0.95)
  ];

  // ---------------------------------------------------------------- CRITTER drawers
  const OUT = '#20262e';
  function ol(g, w) { g.stroke(OUT); g.strokeWeight(w || 4); }

  function eyes(g, x, y, sep, r, look) {
    ol(g, 3); g.fill('#ffffff'); g.circle(x - sep, y, r * 2); g.circle(x + sep, y, r * 2);
    g.noStroke(); g.fill(OUT); g.circle(x - sep + (look || 0), y + 1, r * 1.1); g.circle(x + sep + (look || 0), y + 1, r * 1.1);
    g.fill('#ffffff'); g.circle(x - sep + (look || 0) - r * 0.2, y - r * 0.25, r * 0.4); g.circle(x + sep + (look || 0) - r * 0.2, y - r * 0.25, r * 0.4);
  }
  function cheeks(g, x, y, sep, r) { g.noStroke(); g.fill(255, 120, 140, 120); g.circle(x - sep, y, r); g.circle(x + sep, y, r); }
  function helmet(g, x, y, w, tilt) {
    g.push(); g.translate(x, y); g.rotate(tilt || 0);
    ol(g, 4); g.fill('#5b7f2e'); g.arc(0, 0, w, w * 0.8, PI, TWO_PI, CLOSE);
    g.fill('#4a6a24'); g.rect(-w * 0.6, -4, w * 1.2, 10, 5);
    g.noStroke(); g.fill('#ffe066'); g.textAlign(CENTER, CENTER); g.textStyle(BOLD); g.textSize(w * 0.28); g.text('★', 0, -w * 0.18);
    g.pop();
  }
  function smile(g, x, y, w) { g.noFill(); ol(g, 3); g.arc(x, y, w, w * 0.7, 0.2, PI - 0.2); g.noStroke(); }

  function bee(g, x, y, s) {
    g.push(); g.translate(x, y); g.scale(s);
    ol(g); g.fill(255, 255, 255, 200); g.ellipse(-10, -46, 50, 60); g.ellipse(18, -44, 44, 54);
    g.fill('#ffd23f'); g.ellipse(10, 0, 110, 80);
    g.noStroke(); g.fill(OUT); g.rect(10, -36, 14, 72, 4); g.rect(36, -30, 12, 60, 4);
    ol(g); g.noFill(); g.ellipse(10, 0, 110, 80);
    g.fill(OUT); g.triangle(64, -6, 64, 6, 84, 0);
    g.fill('#ffd23f'); g.circle(-44, -4, 64);
    eyes(g, -50, -6, 12, 8); smile(g, -48, 10, 18);
    helmet(g, -44, -26, 56, -0.15);
    g.pop();
  }

  function squirrelChute(g, x, y, s) {
    g.push(); g.translate(x, y); g.scale(s);
    ol(g); g.fill('#ff6b6b'); g.arc(0, -150, 220, 150, PI, TWO_PI, CLOSE);
    g.fill('#ffffff'); g.arc(0, -150, 80, 150, PI, TWO_PI, CLOSE);
    g.stroke(OUT); g.strokeWeight(2); [-110, -40, 40, 110].forEach(lx => g.line(lx, -150, 0, -30));
    ol(g); g.fill('#a8693a'); g.ellipse(70, 30, 70, 130);               // tail
    g.fill('#c47f45'); g.quad(-70, 0, 70, 0, 50, 60, -50, 60);           // gliding membrane
    g.fill('#c47f45'); g.ellipse(0, 20, 80, 90);
    g.fill('#f2d3a8'); g.ellipse(0, 30, 44, 56);
    g.fill('#c47f45'); g.circle(0, -30, 76);
    g.triangle(-30, -56, -18, -84, -6, -60); g.triangle(30, -56, 18, -84, 6, -60);
    eyes(g, 0, -32, 14, 9); g.noStroke(); g.fill(OUT); g.circle(0, -16, 9); cheeks(g, 0, -14, 24, 14);
    helmet(g, 0, -56, 64);
    g.pop();
  }

  function bird(g, x, y, s, o) {
    g.push(); g.translate(x, y); g.scale(s); if (o.flip) g.scale(-1, 1);
    ol(g); g.fill(o.tail || o.body);
    g.triangle(60, 10, 120, -10, 120, 40);
    g.fill(o.body); g.ellipse(0, 10, 140, 110);
    g.fill(o.belly); g.ellipse(-16, 30, 80, 60);
    g.fill(o.wing); g.push(); g.rotate(o.wingUp ? -0.7 : 0.2); g.ellipse(30, -10, 100, 50); g.pop();
    g.fill(o.body); g.circle(-50, -40, 86);
    if (o.tufts) { g.fill(o.body); g.triangle(-84, -70, -76, -104, -60, -76); g.triangle(-16, -70, -24, -104, -40, -76); }
    g.fill(o.beakCol || '#ffb02e');
    if (o.longBeak) {
      g.quad(-80, -42, -210, -30, -210, -22, -80, -28);
      g.fill('#ffcf7a'); g.arc(-150, -24, 120, 70, 0, PI, CLOSE);
    } else g.triangle(-88, -44, -112, -34, -88, -28);
    eyes(g, -50, -46, o.bigEyes ? 18 : 13, o.bigEyes ? 14 : 9, -2);
    helmet(g, -50, -78, 76, -0.1);
    g.pop();
  }

  function bat(g, x, y, s) {
    g.push(); g.translate(x, y); g.scale(s);
    ol(g); g.fill('#5a3f7a');
    g.beginShape(); g.vertex(-20, -20); g.vertex(-170, -80); g.vertex(-150, -20); g.vertex(-120, 0); g.vertex(-90, -10); g.vertex(-60, 20); g.vertex(-20, 20); g.endShape(CLOSE);
    g.beginShape(); g.vertex(20, -20); g.vertex(170, -80); g.vertex(150, -20); g.vertex(120, 0); g.vertex(90, -10); g.vertex(60, 20); g.vertex(20, 20); g.endShape(CLOSE);
    g.fill('#6e4f93'); g.ellipse(0, 10, 80, 100);
    g.triangle(-34, -50, -44, -110, -6, -64); g.triangle(34, -50, 44, -110, 6, -64);
    g.circle(0, -40, 84);
    eyes(g, 0, -40, 16, 11);
    g.fill('#ffffff'); g.noStroke(); g.triangle(-8, -18, -2, -18, -5, -8); g.triangle(2, -18, 8, -18, 5, -8);
    helmet(g, 0, -70, 70);
    g.pop();
  }

  function mouse(g, x, y, s) {
    g.push(); g.translate(x, y); g.scale(s);
    g.noFill(); ol(g, 5); g.bezier(40, 30, 110, 40, 90, -40, 140, -50);
    ol(g); g.fill('#a9aeb6'); g.ellipse(10, 20, 100, 80);
    g.circle(-34, -44, 50); g.circle(34, -44, 50); g.fill('#ffb3c1'); g.circle(-34, -44, 28); g.circle(34, -44, 28);
    g.fill('#a9aeb6'); g.ellipse(0, -16, 84, 74);
    eyes(g, 0, -20, 14, 8); g.noStroke(); g.fill('#ff7b9c'); g.circle(0, -2, 12);
    helmet(g, 0, -48, 64);
    g.pop();
  }

  function hedgehog(g, x, y, s) {
    g.push(); g.translate(x, y); g.scale(s);
    ol(g); g.fill('#6b4a2e');
    for (let a = PI * 1.05; a < TWO_PI * 0.98; a += 0.22) {
      const r1 = 80, r2 = 120;
      g.triangle(Math.cos(a - 0.1) * r1 + 20, Math.sin(a - 0.1) * r1 + 20, Math.cos(a + 0.1) * r1 + 20, Math.sin(a + 0.1) * r1 + 20, Math.cos(a) * r2 + 20, Math.sin(a) * r2 + 20);
    }
    g.ellipse(20, 20, 170, 150);
    g.fill('#e9c79a'); g.ellipse(-46, 10, 80, 70);
    eyes(g, -50, 0, 12, 8, -2); g.noStroke(); g.fill(OUT); g.circle(-86, 14, 14);
    helmet(g, -40, -36, 66, -0.15);
    ol(g); g.fill('#4f9a45'); [[-120, 80, 90], [-40, 96, 100], [50, 96, 110], [130, 80, 90]].forEach(b => g.circle(b[0], b[1], b[2]));
    g.pop();
  }

  function rabbit(g, x, y, s) {
    g.push(); g.translate(x, y); g.scale(s); g.rotate(-0.15);
    ol(g); g.fill('#f4f1ea'); g.circle(70, 40, 40);
    g.ellipse(10, 30, 120, 100);
    g.ellipse(-24, -110, 34, 110); g.ellipse(20, -112, 34, 110);
    g.fill('#ffc2cf'); g.noStroke(); g.ellipse(-24, -110, 14, 80); g.ellipse(20, -112, 14, 80);
    ol(g); g.fill('#f4f1ea'); g.ellipse(0, -30, 100, 88);
    eyes(g, 0, -34, 16, 9); g.noStroke(); g.fill('#ff7b9c'); g.triangle(-6, -14, 6, -14, 0, -6); cheeks(g, 0, -12, 30, 16);
    helmet(g, 0, -62, 76);
    g.pop();
  }

  function raccoon(g, x, y, s) {
    g.push(); g.translate(x, y); g.scale(s);
    ol(g); g.fill('#9a9ea6'); g.push(); g.translate(80, 20); g.rotate(-0.6); g.ellipse(0, 0, 50, 150);
    g.noStroke(); g.fill(OUT); for (let i = -50; i < 60; i += 34) g.rect(-25, i, 50, 14, 6); g.pop();
    ol(g); g.fill('#9a9ea6'); g.ellipse(0, 40, 120, 120);
    g.triangle(-50, -60, -40, -110, -14, -74); g.triangle(50, -60, 40, -110, 14, -74);
    g.ellipse(0, -36, 120, 100);
    g.noStroke(); g.fill(OUT); g.ellipse(0, -40, 110, 34);
    g.fill('#ffffff'); g.ellipse(0, -14, 50, 34);
    eyes(g, 0, -40, 20, 9); g.noStroke(); g.fill(OUT); g.circle(0, -18, 12);
    helmet(g, 0, -76, 84);
    g.pop();
  }

  function skunk(g, x, y, s) {
    g.push(); g.translate(x, y); g.scale(s);
    ol(g); g.fill(OUT); g.ellipse(70, -40, 90, 200);
    g.noStroke(); g.fill('#ffffff'); g.ellipse(70, -40, 30, 170);
    ol(g); g.fill('#2d3440'); g.ellipse(0, 40, 120, 110);
    g.circle(0, -30, 100);
    g.noStroke(); g.fill('#ffffff'); g.ellipse(0, -60, 18, 50);
    eyes(g, 0, -30, 18, 9); g.noStroke(); g.fill('#ff7b9c'); g.circle(0, -6, 12); cheeks(g, 0, -8, 30, 14);
    helmet(g, 0, -70, 80);
    g.pop();
  }

  function rhino(g, x, y, s) {
    g.push(); g.translate(x, y); g.scale(s);
    ol(g); g.fill('#9aa1aa');
    [-80, -30, 40, 90].forEach(lx => g.rect(lx - 18, 30, 36, 60, 10));
    g.ellipse(10, 10, 260, 150);
    g.ellipse(-110, -10, 120, 100);
    g.fill('#f2efe6'); g.triangle(-160, -30, -190, -110, -140, -50); g.triangle(-130, -50, -140, -90, -116, -56);
    g.fill('#9aa1aa'); g.ellipse(-80, -64, 26, 40);
    eyes(g, -100, -24, 10, 7, -2);
    helmet(g, -96, -52, 70, -0.1);
    g.pop();
  }

  function crab(g, x, y, s) {
    g.push(); g.translate(x, y); g.scale(s);
    ol(g); g.fill('#b5793a'); g.rect(-50, -120, 100, 70, 6); g.line(-50, -85, 50, -85);
    ol(g, 6); g.noFill(); [-1, 1].forEach(d => { for (let i = 0; i < 3; i++) g.line(d * 60, 20 + i * 18, d * 120, 50 + i * 24); });
    g.line(-60, -10, -70, -70); g.line(60, -10, 70, -70);
    ol(g); g.fill('#e8513a'); g.ellipse(-70, -80, 60, 46); g.ellipse(70, -80, 60, 46);
    g.ellipse(0, 20, 160, 100);
    g.line(-20, -24, -26, -50); g.line(20, -24, 26, -50);
    eyes(g, 0, -54, 26, 12); smile(g, 0, 26, 40);
    helmet(g, 0, -26, 70);
    g.pop();
  }

  function puffer(g, x, y, s) {
    g.push(); g.translate(x, y); g.scale(s);
    ol(g, 5); for (let a = 0; a < TWO_PI; a += PI / 10) g.line(Math.cos(a) * 80, Math.sin(a) * 80, Math.cos(a) * 112, Math.sin(a) * 112);
    ol(g); g.fill('#ffd23f'); g.triangle(90, 0, 150, -40, 150, 40);
    g.circle(0, 0, 180);
    g.fill('#fff2b0'); g.noStroke(); g.ellipse(-10, 40, 120, 70);
    eyes(g, -30, -10, 24, 14, -3); g.fill('#ff7b9c'); g.circle(-62, 30, 20);
    helmet(g, -10, -70, 96);
    g.pop();
  }

  function dolphin(g, x, y, s) {
    g.push(); g.translate(x, y); g.scale(s); g.rotate(-0.35);
    ol(g); g.fill('#6c9fc8');
    g.triangle(110, 0, 170, -40, 170, 40);
    g.ellipse(0, 0, 260, 100);
    g.triangle(-10, -40, 30, -100, 50, -40);
    g.ellipse(-140, 10, 70, 30);
    g.fill('#d9ecf7'); g.noStroke(); g.ellipse(-30, 24, 170, 40);
    eyes(g, -80, -10, 0.01, 10, -2); smile(g, -140, 14, 40);
    helmet(g, -70, -38, 64, -0.2);
    g.pop();
  }

  function seal(g, x, y, s) {
    g.push(); g.translate(x, y); g.scale(s);
    ol(g); g.fill('#8d96a0');
    g.ellipse(-50, 40, 70, 30); g.ellipse(50, 40, 70, 30);
    g.ellipse(0, 20, 130, 170);
    g.circle(0, -70, 110);
    g.fill('#c4cbd2'); g.noStroke(); g.ellipse(0, -50, 60, 40);
    eyes(g, 0, -80, 22, 12); g.fill(OUT); g.ellipse(0, -56, 20, 14);
    g.stroke(OUT); g.strokeWeight(2); [-1, 1].forEach(d => { g.line(d * 14, -50, d * 50, -56); g.line(d * 14, -46, d * 50, -42); }); g.noStroke();
    helmet(g, 0, -114, 90);
    g.fill(255, 255, 255, 140); g.rect(-160, 80, 320, 14, 7);
    g.pop();
  }

  function jelly(g, x, y, s) {
    g.push(); g.translate(x, y); g.scale(s);
    g.noFill(); g.stroke('#d27ad8'); g.strokeWeight(7);
    for (let i = -60; i <= 60; i += 30) { g.beginShape(); for (let k = 0; k < 7; k++) g.vertex(i + Math.sin(k + i) * 12, 10 + k * 26); g.endShape(); }
    ol(g); g.fill('#f3a6f0'); g.arc(0, 10, 200, 190, PI, TWO_PI, CLOSE);
    g.fill(255, 255, 255, 120); g.noStroke(); g.ellipse(-40, -40, 40, 26);
    eyes(g, 0, -20, 26, 12); smile(g, 0, -2, 30);
    helmet(g, 0, -80, 90);
    g.pop();
  }

  function whale(g, x, y, s) {
    g.push(); g.translate(x, y); g.scale(s);
    g.noStroke(); g.fill(255, 255, 255, 200);
    [[-80, -150], [-60, -170], [-40, -150], [-60, -130]].forEach(d => g.circle(d[0], d[1], 22));
    ol(g); g.fill('#2d5fa8');
    g.triangle(150, -10, 220, -70, 230, 30);
    g.ellipse(0, 0, 340, 170);
    g.fill('#cfe3f7'); g.noStroke(); g.arc(-20, 20, 300, 110, 0, PI, CLOSE);
    g.stroke('#9fc1e6'); g.strokeWeight(3); for (let i = -120; i < 80; i += 30) g.line(i, 34, i + 10, 70); g.noStroke();
    eyes(g, -100, -20, 0.01, 12, -2); smile(g, -140, 20, 50);
    helmet(g, -70, -66, 100, -0.1);
    g.pop();
  }

  const CRIT_DRAW = [
    (g, x, y) => { bee(g, x - 90, y - 60, 0.85); bee(g, x + 80, y - 20, 0.85); bee(g, x - 10, y + 100, 0.95); },
    (g, x, y) => squirrelChute(g, x, y + 50, 1.0),
    (g, x, y) => bird(g, x + 20, y + 30, 1.05, { body: '#b07a4a', belly: '#f0dcc0', wing: '#8a5a32', wingUp: true }),
    (g, x, y) => bird(g, x + 10, y + 40, 1.15, { body: '#a7835b', belly: '#e9d6b4', wing: '#8a6a45', bigEyes: true, tufts: true }),
    (g, x, y) => bat(g, x, y + 40, 1.0),
    (g, x, y) => bird(g, x + 40, y + 40, 1.0, { body: '#f4f4f0', belly: '#ffffff', wing: '#d9d9d2', longBeak: true, beakCol: '#ff9f2e' }),
    (g, x, y) => { mouse(g, x - 70, y + 50, 0.95); mouse(g, x + 80, y + 70, 0.85); },
    (g, x, y) => hedgehog(g, x + 20, y + 40, 1.0),
    (g, x, y) => rabbit(g, x, y + 70, 1.0),
    (g, x, y) => raccoon(g, x - 10, y + 60, 1.0),
    (g, x, y) => skunk(g, x - 10, y + 70, 1.0),
    (g, x, y) => rhino(g, x + 20, y + 50, 0.95),
    (g, x, y) => crab(g, x, y + 70, 1.0),
    (g, x, y) => puffer(g, x, y + 40, 1.0),
    (g, x, y) => dolphin(g, x + 10, y + 40, 1.0),
    (g, x, y) => seal(g, x, y + 60, 1.0),
    (g, x, y) => jelly(g, x, y + 20, 1.0),
    (g, x, y) => whale(g, x - 20, y + 50, 0.85)
  ];

  // ---------------------------------------------------------------- builders
  function card(theme, def) {
    const g = createGraphics(CW, CH);
    g.pixelDensity(1);
    g.textFont('sans-serif');
    const P = PAL[theme][def.theatre];
    g.background(P.edge);
    scene(g, theme, def.theatre, 0, BAND - 20, CW, CH - BAND + 20);
    const draw = (theme === 'war' ? WAR_DRAW : CRIT_DRAW)[def.id];
    g.push(); draw(g, CW / 2, 330 + 40); g.pop();
    frame(g, theme, def.theatre, String(def.str), def.name, def.type, def.text, P);
    return g;
  }

  function back(theme) {
    const g = createGraphics(CW, CH);
    g.pixelDensity(1); g.textFont('sans-serif');
    randomSeed(7);
    if (theme === 'war') {
      g.background('#4f5a32');
      const camo = ['#3b4426', '#6b6f3e', '#2c321c', '#7d7448'];
      for (let i = 0; i < 70; i++) { g.fill(camo[i % 4]); g.noStroke(); g.ellipse(random(CW), random(BAND, CH), random(40, 120), random(30, 80)); }
      g.fill(255, 255, 255, 200); g.textAlign(CENTER, CENTER); g.textStyle(BOLD); g.textSize(240); g.text('?', CW / 2, 400);
      frame(g, theme, 'land', '2', 'Unknown', 'none', '', { band: '#1f2414', num: '#ffffff', text: '#ffffff', edge: '#151a0b', tag: '#e3d27e' });
    } else {
      g.background('#1d3a24');
      for (let i = 0; i < 40; i++) { g.noStroke(); g.fill(random() < 0.5 ? '#2f6a35' : '#3f8a43'); g.circle(random(CW), random(BAND + 40, CH), random(60, 140)); }
      [[150, 360], [300, 440], [220, 520]].forEach(e => {
        g.fill('#ffffff'); g.ellipse(e[0] - 16, e[1], 24, 30); g.ellipse(e[0] + 16, e[1], 24, 30);
        g.fill('#13202d'); g.circle(e[0] - 14, e[1] + 4, 12); g.circle(e[0] + 18, e[1] + 4, 12);
      });
      frame(g, theme, 'land', '2', 'Unknown', 'none', '', { band: '#ffffff', num: '#13202d', text: '#13202d', edge: '#0f2414', tag: '#1f6fd1' });
    }
    return g;
  }

  function banner(theme, t) {
    const W = 700, H = 500;
    const g = createGraphics(W, H);
    g.pixelDensity(1); g.textFont('sans-serif');
    scene(g, theme, t, 0, 0, W, H);
    if (theme === 'war') {
      if (t === 'air') planeTop(g, 560, 120, 0.6, 1.2);
      if (t === 'land') tank(g, 560, 400, 0.45);
      if (t === 'sea') battleship(g, 540, 300, 0.5);
    }
    g.textAlign(CENTER, CENTER); g.textStyle(BOLD); g.textSize(230);
    g.stroke(theme === 'war' ? '#151a0b' : '#13202d'); g.strokeWeight(14); g.fill('#ffffff');
    g.text(t.toUpperCase(), W / 2, H / 2 + 10);
    g.noStroke();
    return g;
  }

  const cache = {};
  function get(theme, kind, key) {
    const k = theme + ':' + kind + ':' + key;
    if (!cache[k]) {
      if (kind === 'card') cache[k] = card(theme, CARD_DEFS[key]);
      else if (kind === 'back') cache[k] = back(theme);
      else cache[k] = banner(theme, key);
    }
    return cache[k];
  }
  function dataURL(theme, kind, key) {
    const k = 'url:' + theme + ':' + kind + ':' + key;
    if (!cache[k]) cache[k] = get(theme, kind, key).elt.toDataURL('image/png');
    return cache[k];
  }

  return { get, dataURL };
})();
