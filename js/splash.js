/* =====================================================================
   OSWEL'S TRAP — Animation de lancement (avec son)
   ---------------------------------------------------------------------
   Une petite scène dessinée en 2D : le sol se pose, Oswel arrive en
   courant… et la dalle du milieu disparaît. Le logo tombe, « TRAP »
   s'écrase, des piques sortent du trou et Oswel est éjecté.
   Les navigateurs bloquent le son tant qu'on n'a pas appuyé sur une
   touche : dans ce cas, on affiche d'abord « Appuie sur une touche ».
   N'importe quel bouton passe l'animation.
   ===================================================================== */
window.OT = window.OT || {};
OT.Splash = (function () {
  let el = null, cv = null, g = null, W = 0, H = 0, dpr = 1;
  let phase = 'off', t = 0, gateT = 0, outT = -1, done = null, last = 0, raf = 0;
  let fired = {}, parts = [], shake = 0, ticks = 0;
  const DUR = 4.7, FADE = 0.55;

  /* ---------- son ---------- */
  const S = () => OT.Sound;
  const tone = (...a) => S() && S().tone && S().tone(...a);
  const noise = (...a) => S() && S().noise && S().noise(...a);
  const audioOn = () => { const c = S() && S().ctx; return !!c && c.state === 'running'; };
  const SFX = {
    tick: (i) => tone('square', 380 + i * 18, 300 + i * 18, 0.035, 0.07),
    step: () => tone('triangle', 180, 120, 0.05, 0.1),
    crack: () => { noise(0.28, 0.35, 700); tone('square', 160, 70, 0.2, 0.12); },
    fall: () => tone('sine', 1100, 130, 0.6, 0.22),
    drop: () => { noise(0.18, 0.4, 400); tone('sine', 140, 50, 0.25, 0.4); },
    slam: () => { noise(0.7, 0.7, 520); tone('sine', 110, 28, 0.7, 0.55); tone('sawtooth', 70, 30, 0.4, 0.2); },
    spikes: () => { noise(0.12, 0.25, 6000); tone('sawtooth', 2200, 900, 0.14, 0.08); tone('sawtooth', 1800, 700, 0.14, 0.06, 0.04); },
    boing: () => { tone('triangle', 160, 980, 0.32, 0.28); tone('sine', 220, 1300, 0.28, 0.12, 0.02); },
    land: () => tone('sine', 150, 55, 0.12, 0.3),
    jingle: () => {
      [[523, 0], [659, 0.09], [784, 0.18], [1046, 0.27], [1318, 0.4]].forEach(([f, d]) => tone('triangle', f, f, 0.22, 0.16, d));
      [[262, 0], [392, 0.27]].forEach(([f, d]) => tone('square', f, f, 0.3, 0.07, d));
      tone('triangle', 1046, 1046, 0.7, 0.12, 0.52); tone('triangle', 1568, 1568, 0.7, 0.08, 0.52);
    },
  };

  /* ---------- outils ---------- */
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const k01 = (a, b) => clamp((t - a) / (b - a), 0, 1);
  const easeOut = (x) => 1 - Math.pow(1 - x, 3);
  const easeBack = (x) => { const c = 1.9; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };
  const bounce = (x) => {
    const n = 7.5625, d = 2.75;
    if (x < 1 / d) return n * x * x;
    if (x < 2 / d) return n * (x -= 1.5 / d) * x + 0.75;
    if (x < 2.5 / d) return n * (x -= 2.25 / d) * x + 0.9375;
    return n * (x -= 2.625 / d) * x + 0.984375;
  };
  function once(key, at, fn) { if (!fired[key] && t >= at) { fired[key] = true; fn(); } }
  function rrect(x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }

  function resize() {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    W = window.innerWidth; H = window.innerHeight;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  /* ---------- géométrie de la scène ---------- */
  function layout() {
    const s = clamp(Math.min(W / 13, H / 9), 34, 86);
    const n = Math.ceil(W / s) + 1;
    const gy = Math.round(H * 0.72);
    const hole = Math.floor(n / 2);
    return { s, n, gy, hole, hx: hole * s + s / 2 - ((n * s - W) / 2), ox: -((n * s - W) / 2) };
  }

  function drawBg() {
    g.fillStyle = '#120d0b'; g.fillRect(0, 0, W, H);
    const rg = g.createRadialGradient(W / 2, H * 0.78, 10, W / 2, H * 0.78, Math.max(W, H) * 0.7);
    rg.addColorStop(0, 'rgba(255,122,26,0.18)'); rg.addColorStop(1, 'rgba(255,122,26,0)');
    g.fillStyle = rg; g.fillRect(0, 0, W, H);
  }

  function drawTile(x, y, s, rot) {
    g.save(); g.translate(x + s / 2, y + s / 2); if (rot) g.rotate(rot); g.translate(-s / 2, -s / 2);
    g.fillStyle = '#2e241e'; g.fillRect(0, 0, s, s);
    g.fillStyle = '#4a3b30'; g.fillRect(0, 0, s, s * 0.14);
    g.fillStyle = '#ff9a3a'; g.globalAlpha = 0.55; g.fillRect(0, 0, s, 2); g.globalAlpha = 1;
    g.strokeStyle = '#120d0b'; g.lineWidth = 2; g.strokeRect(1, 1, s - 2, s - 2);
    g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = 1.5;
    g.beginPath(); g.moveTo(s * 0.25, s * 0.35); g.lineTo(s * 0.45, s * 0.55); g.lineTo(s * 0.4, s * 0.8); g.stroke();
    g.restore();
  }

  // Oswel : un bloc bleu avec des yeux (comme le héros du jeu vu de loin)
  function drawHero(x, y, s, o = {}) {
    const w = s * 0.78, h = s * 0.86;
    const sq = o.squash || 0;
    const ww = w * (1 + sq * 0.25), hh = h * (1 - sq * 0.25);
    g.save(); g.translate(x, y);
    if (o.rot) g.rotate(o.rot);
    // ombre
    if (o.shadow !== false) { g.fillStyle = 'rgba(0,0,0,0.35)'; g.beginPath(); g.ellipse(0, 2, ww * 0.55, s * 0.08, 0, 0, Math.PI * 2); g.fill(); }
    // jambes
    const lp = o.legs || 0;
    g.fillStyle = '#1b2a4a';
    g.fillRect(-ww * 0.3 + lp * s * 0.08, -s * 0.16, ww * 0.22, s * 0.16);
    g.fillRect(ww * 0.08 - lp * s * 0.08, -s * 0.16, ww * 0.22, s * 0.16);
    // corps
    const by = -s * 0.14 - hh;
    const grd = g.createLinearGradient(0, by, 0, by + hh);
    grd.addColorStop(0, '#6aa8ff'); grd.addColorStop(1, '#2d6fe0');
    g.fillStyle = grd; rrect(-ww / 2, by, ww, hh, s * 0.16); g.fill();
    g.strokeStyle = 'rgba(0,0,0,0.45)'; g.lineWidth = 2; g.stroke();
    // bandeau orange
    g.fillStyle = '#ff8a2b'; g.fillRect(-ww / 2 + 1, by + hh * 0.18, ww - 2, hh * 0.1);
    // yeux
    const look = o.look === undefined ? 1 : o.look;
    const eyeY = by + hh * 0.48, big = o.scared ? 1.35 : 1;
    const blink = o.blink ? 0.15 : 1;
    for (const ex of [-ww * 0.18, ww * 0.18]) {
      g.fillStyle = '#fff'; g.beginPath(); g.ellipse(ex + look * s * 0.04, eyeY, s * 0.09 * big, s * 0.11 * big * blink, 0, 0, Math.PI * 2); g.fill();
      if (blink > 0.5) { g.fillStyle = '#120d0b'; g.beginPath(); g.arc(ex + look * s * 0.07, eyeY + (o.scared ? s * 0.03 : 0), s * 0.045 * big, 0, Math.PI * 2); g.fill(); }
    }
    if (o.scared) { g.strokeStyle = '#120d0b'; g.lineWidth = 2.5; g.beginPath(); g.arc(look * s * 0.05, by + hh * 0.8, s * 0.07, 0, Math.PI * 2); g.stroke(); }
    g.restore();
  }

  function drawSpikes(cx, gy, s, k) {
    if (k <= 0) return;
    const n = 3, w = s / n, h = s * 0.95 * k;
    for (let i = 0; i < n; i++) {
      const x0 = cx - s / 2 + i * w;
      const grd = g.createLinearGradient(0, gy - h, 0, gy);
      grd.addColorStop(0, '#ffffff'); grd.addColorStop(0.35, '#c9c2bb'); grd.addColorStop(1, '#6b625b');
      g.fillStyle = grd;
      g.beginPath(); g.moveTo(x0 + 2, gy); g.lineTo(x0 + w / 2, gy - h); g.lineTo(x0 + w - 2, gy); g.closePath(); g.fill();
      g.strokeStyle = '#ff5533'; g.lineWidth = 1.5; g.stroke();
    }
  }

  function drawLogo(L) {
    const fs = clamp(Math.min(W * 0.14, H * 0.17), 44, 150);
    const cy = H * 0.3;
    const y1 = cy - fs * 0.45, y2 = cy + fs * 0.5;
    g.textAlign = 'center'; g.textBaseline = 'middle';
    // OSWEL'S : tombe du haut et rebondit
    const a = k01(2.0, 2.42);
    if (a > 0) {
      const y = -fs + (y1 + fs) * bounce(a);
      g.font = `${Math.round(fs * 0.82)}px Bungee, Impact, sans-serif`;
      g.fillStyle = '#000'; g.fillText("OSWEL'S", W / 2, y + 5);
      g.fillStyle = '#ede4d6'; g.fillText("OSWEL'S", W / 2, y);
    }
    // TRAP : s'écrase depuis la caméra
    const b = k01(2.42, 2.6);
    if (b > 0) {
      const sc = 1 + (1 - easeOut(b)) * 2.4;
      g.save(); g.translate(W / 2, y2); g.scale(sc, sc); g.globalAlpha = clamp(b * 1.6, 0, 1);
      g.font = `${Math.round(fs * 1.12)}px Bungee, Impact, sans-serif`;
      const grd = g.createLinearGradient(0, -fs * 0.55, 0, fs * 0.55);
      grd.addColorStop(0, '#fff3c4'); grd.addColorStop(0.4, '#ffb347'); grd.addColorStop(0.75, '#ff7a1a'); grd.addColorStop(1, '#8a2a00');
      g.shadowColor = 'rgba(255,122,26,0.75)'; g.shadowBlur = 26;
      g.fillStyle = grd; g.fillText('TRAP', 0, 0);
      g.shadowBlur = 0; g.restore();
    }
    // phrase d'accroche
    const c = k01(3.05, 3.5);
    if (c > 0) {
      g.globalAlpha = c;
      g.font = `600 ${Math.round(clamp(fs * 0.2, 14, 26))}px "Chakra Petch", sans-serif`;
      g.fillStyle = '#a8998a';
      g.fillText('Le niveau ment. Puis il enseigne.', W / 2, y2 + fs * 0.78 + (1 - c) * 10);
      g.globalAlpha = 1;
    }
    const d = k01(3.55, 3.95);
    if (d > 0) {
      g.globalAlpha = d * 0.85;
      g.font = `600 ${Math.round(clamp(fs * 0.13, 11, 16))}px "Chakra Petch", sans-serif`;
      g.fillStyle = '#ffb347';
      g.fillText(`OSWEL OFFICIEL  ·  VERSION ${OT.VERSION || '1.0'}`, W / 2, y2 + fs * 0.78 + clamp(fs * 0.32, 22, 40));
      g.globalAlpha = 1;
    }
    return { x: W / 2, y: y2, fs };
  }

  function burst(x, y, n, spread) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, v = 120 + Math.random() * spread;
      parts.push({ x: x + (Math.random() - 0.5) * 160, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 120, life: 0.8 + Math.random() * 0.7, t: 0, r: 1.5 + Math.random() * 3, c: Math.random() < 0.5 ? '#ffb347' : (Math.random() < 0.5 ? '#ff7a1a' : '#fff3c4') });
    }
  }
  function drawParts(dt) {
    for (const p of parts) {
      p.t += dt; p.vy += 520 * dt; p.x += p.vx * dt; p.y += p.vy * dt;
      const k = 1 - p.t / p.life; if (k <= 0) continue;
      g.globalAlpha = k; g.fillStyle = p.c; g.beginPath(); g.arc(p.x, p.y, p.r, 0, Math.PI * 2); g.fill();
    }
    g.globalAlpha = 1;
    parts = parts.filter((p) => p.t < p.life);
  }

  /* ---------- écran « Appuie sur une touche » ---------- */
  function drawGate() {
    drawBg();
    const L = layout();
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = `600 ${Math.round(clamp(W * 0.018, 13, 18))}px "Chakra Petch", sans-serif`;
    g.fillStyle = '#a8998a'; g.globalAlpha = clamp(gateT / 0.6, 0, 1);
    g.fillText('OSWEL OFFICIEL PRÉSENTE', W / 2, H * 0.36);
    g.globalAlpha = 0.55 + 0.45 * Math.sin(gateT * 4.2);
    g.font = `${Math.round(clamp(W * 0.034, 20, 36))}px Bungee, Impact, sans-serif`;
    g.fillStyle = '#ffb347';
    g.fillText('▶  APPUIE SUR UNE TOUCHE', W / 2, H * 0.48);
    g.globalAlpha = 0.8;
    g.font = `600 ${Math.round(clamp(W * 0.014, 12, 15))}px "Chakra Petch", sans-serif`;
    g.fillStyle = '#a8998a';
    g.fillText('clavier · manette · souris · écran tactile', W / 2, H * 0.48 + 38);
    g.globalAlpha = 1;
    // Oswel attend sur une dalle
    drawTile(W / 2 - L.s / 2, L.gy, L.s, 0);
    const bob = Math.abs(Math.sin(gateT * 2.2)) * 2;
    drawHero(W / 2, L.gy - bob, L.s, { look: Math.sin(gateT * 0.9) > 0 ? 1 : -1, blink: (gateT % 3.1) < 0.12 });
  }

  /* ---------- l'animation ---------- */
  function drawAnim(dt) {
    drawBg();
    const L = layout(), s = L.s;
    // tremblement après « TRAP »
    if (shakeSaved) { shake = Math.max(0, shake - dt); const m = shake * 26; g.save(); g.translate((Math.random() - 0.5) * m, (Math.random() - 0.5) * m); }
    // la terre sous le sol
    const ek = easeOut(k01(0.05, 0.7));
    if (ek > 0) {
      const eg = g.createLinearGradient(0, L.gy + s, 0, H);
      eg.addColorStop(0, '#231a15'); eg.addColorStop(1, '#120d0b');
      g.globalAlpha = ek; g.fillStyle = eg; g.fillRect(0, L.gy + s, W, H - L.gy - s); g.globalAlpha = 1;
    }
    // 1) les dalles se posent de gauche à droite
    for (let i = 0; i < L.n; i++) {
      const x = L.ox + i * s;
      const at = 0.05 + 0.55 * (i / L.n);
      const k = clamp((t - at) / 0.22, 0, 1);
      if (k <= 0) continue;
      if (!fired['t' + i]) { fired['t' + i] = true; if (ticks++ % 2 === 0) SFX.tick(i); }
      if (i === L.hole) {
        if (t >= 1.62) continue;
        const jit = t > 1.25 ? (Math.random() - 0.5) * 5 * k01(1.25, 1.6) : 0;
        drawTile(x + jit, L.gy - (1 - easeBack(k)) * 70, s, 0);
      } else drawTile(x, L.gy - (1 - easeBack(k)) * 70, s, 0);
    }
    // le puits qui s'ouvre, la dalle qui tombe, les piques qui sortent
    if (t >= 1.62) {
      g.fillStyle = '#050302'; g.fillRect(L.hx - s / 2 + 1, L.gy, s - 2, H - L.gy);
      const ft = t - 1.62;
      if (ft < 1.2) drawTile(L.hx - s / 2, L.gy + 0.5 * 1500 * ft * ft, s, ft * 2.2);
      drawSpikes(L.hx, L.gy + s * 0.35, s, easeBack(k01(2.72, 2.84)));
    }
    // 2) Oswel arrive en courant, s'arrête au-dessus du trou… et tombe
    const runK = k01(0.6, 1.62);
    let hx = -s + (L.hx + s) * runK, hy = L.gy, opt = {};
    if (t < 1.62) {
      const ph = t * 16;
      hy = L.gy - Math.abs(Math.sin(ph)) * 5;
      opt = { legs: Math.sin(ph), look: 1 };
      if (t > 0.6 && Math.floor(ph / Math.PI) !== Math.floor((t - dt) * 16 / Math.PI)) SFX.step();
    } else if (t < 1.76) {
      opt = { scared: true, look: 0, shadow: false }; // suspendu dans le vide, comme dans les dessins animés
    } else if (t < 2.95) {
      const ft = t - 1.76;
      hy = L.gy + 0.5 * 1800 * ft * ft;
      opt = { scared: true, look: 0, shadow: false };
    } else {
      // 3) éjecté par les piques, il retombe sur la dalle de gauche
      const a = k01(2.95, 3.6);
      const x0 = L.hx, x1 = L.hx - s * 2;
      hx = x0 + (x1 - x0) * a;
      hy = L.gy + s * 0.6 * (1 - a) - Math.sin(a * Math.PI) * s * 3.4;
      if (a < 1) opt = { rot: -a * Math.PI * 2, scared: true, look: -1, shadow: false };
      else {
        const sq = Math.max(0, 1 - (t - 3.6) / 0.25) * Math.sin((t - 3.6) * 30) * 0.6;
        opt = { squash: Math.abs(sq), look: Math.sin(t * 1.3) > -0.2 ? 1 : -1, blink: t > 4.1 && t < 4.22 };
        hy = L.gy;
      }
    }
    if (t >= 0.6 && hy < H + s * 2) drawHero(hx, hy, s, opt);
    // 4) le logo
    const lg = drawLogo(L);
    once('trapBurst', 2.6, () => { shake = 0.42; burst(lg.x, lg.y, 70, 420); });
    drawParts(dt);
    if (shakeSaved) g.restore();
  }
  let shakeSaved = false;

  function sounds() {
    once('crack', 1.62, SFX.crack);
    once('fall', 1.78, SFX.fall);
    once('drop', 2.36, SFX.drop);
    once('slam', 2.55, SFX.slam);
    once('spk', 2.72, SFX.spikes);
    once('jing', 2.8, SFX.jingle);
    once('boing', 2.95, SFX.boing);
    once('land', 3.6, SFX.land);
  }

  function tick(ts) {
    raf = requestAnimationFrame(tick);
    const dt = Math.min(0.1, (ts - last) / 1000 || 0); last = ts;
    if (phase === 'gate') { gateT += dt; drawGate(); return; }
    if (phase !== 'anim') return;
    t += dt;
    shakeSaved = shake > 0;
    drawAnim(dt);
    sounds();
    if (outT < 0 && t >= DUR) outT = 0;
    if (outT >= 0) {
      outT += dt;
      el.style.opacity = String(clamp(1 - outT / FADE, 0, 1));
      if (outT >= FADE) finish();
    }
  }

  function startAnim() {
    if (phase === 'anim') return;
    OT.Sound && OT.Sound.unlock();
    phase = 'anim'; t = 0; fired = {}; parts = []; ticks = 0;
  }

  function onGesture(e) {
    // les touches ne doivent pas écrire dans le champ « Pseudo » caché derrière
    const sysKey = e.type === 'keydown' && (e.ctrlKey || e.metaKey || e.altKey || /^F\d+$/.test(e.key));
    if (sysKey) return;
    if (e.cancelable) e.preventDefault();
    if (phase === 'gate') startAnim();
    else if (phase === 'anim') skip();
  }
  function skip() { if (phase === 'anim' && t > 0.35 && outT < 0) outT = FADE * 0.4; }

  function finish() {
    if (phase === 'off') return;
    phase = 'off';
    cancelAnimationFrame(raf); raf = 0;
    ['keydown', 'pointerdown', 'touchstart'].forEach((ev) => window.removeEventListener(ev, onGesture, true));
    window.removeEventListener('resize', resize);
    if (el) el.remove();
    el = cv = g = null;
    if (OT.Input) OT.Input.flushMenu();
    if (OT.Music && OT.Game && OT.Game.state === 'idle' && audioOn()) OT.Music.play('menu');
    const cb = done; done = null; cb && cb();
  }

  function run(cb) {
    done = cb || null;
    const q = location.search;
    if (/[?&]splash=0/.test(q) || (navigator.webdriver && !/[?&]splash=1/.test(q))) { const d = done; done = null; d && d(); return; }
    el = document.createElement('div');
    el.id = 'splash';
    cv = document.createElement('canvas');
    el.appendChild(cv); document.body.appendChild(el);
    g = cv.getContext('2d');
    resize();
    window.addEventListener('resize', resize);
    ['keydown', 'pointerdown', 'touchstart'].forEach((ev) => window.addEventListener(ev, onGesture, { capture: true, passive: false }));
    // Le son est-il déjà autorisé (application PC, ou site déjà visité souvent) ?
    try { OT.Sound && OT.Sound.unlock(); } catch (e) { /* pas de son */ }
    const c = OT.Sound && OT.Sound.ctx;
    phase = (!c || c.state === 'running') ? 'anim' : 'gate';
    gateT = 0; t = 0; outT = -1; fired = {};
    last = performance.now();
    raf = requestAnimationFrame(tick);
  }

  // appelé par l'interface à chaque image : la manette aussi lance / passe l'animation
  function frame(acts) {
    if (!acts.length) return;
    if (phase === 'gate') startAnim();
    else skip();
  }

  return {
    run, frame, skip,
    get active() { return phase !== 'off'; },
    get phase() { return phase; },
    get time() { return t; },
  };
})();
