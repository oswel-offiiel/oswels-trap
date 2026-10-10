/* =====================================================================
   OSWEL'S TRAP — chars.js
   Les PERSONNAGES jouables et leurs ANIMATIONS.
   ---------------------------------------------------------------------
   4 personnages, même gabarit de jeu (mêmes statistiques), mais une
   silhouette, une tenue, un visage et une personnalité à eux :
     OSWEL — le héros : codeur + mécano, veste, casque audio, lunettes
     MEKA  — robot mécano costaud, casque à visière, gros gants
     BYTE  — une tête-écran : ses émotions s'affichent en pixels
     NEXA  — voyageuse des portails : elle flotte, halo et ailerons
   Squelette commun (utilisé par l'histoire, les arènes, la boutique) :
     root → rig → hips → legL/legR, torso → armL/armR (→ handL/handR), head
   Le visage est une TEXTURE dessinée (canvas) qui change avec l'émotion :
   neutral, blink, happy, cool, scared, angry, laugh, surprised,
   determined, dizzy, sad, wink, focus.
   OT.Anim.create(modèle) donne un contrôleur d'animation : marche,
   course, saut, chute, atterrissage, coup, mort, victoire, défaite,
   interaction, porte, poussée, bonus, explosion, piège, célébration,
   emotes, et de petites animations d'attente propres à chacun.
   ===================================================================== */
window.OT = window.OT || {};

OT.Chars = (function () {
  const LIST = [
    { id: 'oswel', name: 'OSWEL', univers: 'Code + Forge', desc: 'Le héros : un peu codeur, un peu mécano, toujours curieux.', accent: 0xff8a2b },
    { id: 'meka', name: 'MEKA', univers: 'La Forge', desc: 'Robot mécano costaud. Un cœur de moteur, des mains de géant.', accent: 0xf2c230 },
    { id: 'byte', name: 'BYTE', univers: 'Le Code', desc: 'Une tête-écran : ses émotions s\'affichent en pixels.', accent: 0x3cff9a },
    { id: 'nexa', name: 'NEXA', univers: 'Nexus', desc: 'Voyageuse des portails, elle flotte à quelques centimètres du sol.', accent: 0xff5ad8 },
    { id: 'tony', name: 'TONY', univers: 'Le Code', desc: 'Le mentor d\'Oswel : tenue blanc cassé, capuche blanche qui cache son visage, deux yeux de lumière et une longue écharpe. Calme, pédagogue, humour sec. Il a 5 POUVOIRS (un par monde) : Ctrl+Z, Boucle while, Debug, Copier-coller, Compiler.', accent: 0xb48cff },
    { id: 'fredo', name: 'FREDO', univers: 'Nexus', desc: 'Programmeur du Nexus : bonnet, casque audio autour du cou, blouson de sport et montre connectée.', accent: 0x34c26b },
    { id: 'valdes', name: 'VALDES', univers: 'Nexus', desc: 'L\'assistant de Win Black : casquette avec lampe frontale, gilet technique à bandes réfléchissantes, ceinture à outils et tablette toujours à la main.', accent: 0xff8a2b },
    { id: 'godlove', name: 'GOD LOVE', univers: 'Nexus', desc: 'Le cœur de la bande : coupe haute, long manteau, chaîne dorée et un cœur lumineux qui bat sur la poitrine.', accent: 0xff3d6e },
    { id: 'franck', name: 'FRANCK', univers: 'La Forge', desc: 'Le cousin d\'Oswel : tout en rouge (sa couleur préférée), des nattes sur toute la tête et une veste de survêtement à bandes blanches.', accent: 0xd42a2a },
  ];
  const BY = {}; LIST.forEach((c) => (BY[c.id] = c));
  const HATS = ['casquette', 'casque', 'couronne'];

  /* ---------- Matériaux (couleurs données « comme à l'écran ») ---------- */
  const lin = (h) => new THREE.Color(h).convertSRGBToLinear();
  const mcache = {};
  function mat(hex, o = {}) {
    const key = hex + '|' + JSON.stringify(o);
    if (mcache[key]) return mcache[key];
    const m = new THREE.MeshStandardMaterial(Object.assign({ roughness: 0.55, metalness: 0.05 }, o));
    m.color = lin(hex);
    if (o.emissive !== undefined) m.emissive = lin(o.emissive);
    return (mcache[key] = m);
  }
  const glowM = (hex, i = 1.6) => mat(hex, { emissive: hex, emissiveIntensity: i, roughness: 0.3, toneMapped: false });
  // une couleur d'accent qui ressort sur la couleur principale
  function accentFor(col, def, alt) {
    const a = new THREE.Color(col), b = new THREE.Color(def);
    const d = Math.abs(a.r - b.r) + Math.abs(a.g - b.g) + Math.abs(a.b - b.b);
    return d < 0.55 ? alt : def;
  }

  /* ---------- Géométries (mises en cache) ---------- */
  const gcache = {};
  const geo = (key, fn) => gcache[key] || (gcache[key] = fn());
  const SPH = (r, w = 18, h = 12) => geo(`s${r}:${w}:${h}`, () => new THREE.SphereGeometry(r, w, h));
  const CYL = (a, b, h, s = 14) => geo(`c${a}:${b}:${h}:${s}`, () => new THREE.CylinderGeometry(a, b, h, s));
  const BOX = (w, h, d) => geo(`b${w}:${h}:${d}`, () => new THREE.BoxGeometry(w, h, d));
  const TOR = (r, t, rs, ts, arc = Math.PI * 2) => geo(`t${r}:${t}:${rs}:${ts}:${arc}`, () => new THREE.TorusGeometry(r, t, rs, ts, arc));
  function mk(g, m, x = 0, y = 0, z = 0, par, shadow = true) {
    const o = new THREE.Mesh(g, m); o.position.set(x, y, z);
    o.castShadow = shadow; if (par) par.add(o); return o;
  }
  function grp(x = 0, y = 0, z = 0, par) { const g = new THREE.Group(); g.position.set(x, y, z); if (par) par.add(g); return g; }

  /* ==================================================================
     LES VISAGES : une texture par (style, émotion)
     ================================================================== */
  const FW = 256, FH = 160;
  const STYLES = {
    oswel: { kind: 'cartoon', ink: '#1b100a', white: '#ffffff', pupil: '#24160e', mouth: '#4a120e', tongue: '#e8707a' },
    meka:  { kind: 'led', bg: '#071116', glow: '#39f0ff', square: true },
    byte:  { kind: 'pixel', bg: '#04261f', glow: '#3cff9a' },
    nexa:  { kind: 'led', bg: '#150a22', glow: '#ff6ae0' },
    // TONY (1.5) : visage caché dans l'ombre de la capuche, deux points lumineux sans pupille (blanc doré ;
    // cyan pâle quand il utilise un pouvoir), pas de bouche
    tony: { kind: 'hood', bg: '#040308', bg2: '#120e1f', glow: '#ffe7a3' },
    fredo: { kind: 'cartoon', ink: '#150b06', white: '#ffffff', pupil: '#20110a', mouth: '#4a140e', tongue: '#e8707a' },
    franck: { kind: 'cartoon', ink: '#140a06', white: '#ffffff', pupil: '#1e1009', mouth: '#4a120e', tongue: '#e8707a' },
    valdes: { kind: 'cartoon', ink: '#140b06', white: '#ffffff', pupil: '#1c1009', mouth: '#4a120e', tongue: '#e8707a' },
    npc: { kind: 'cartoon', ink: '#160c07', white: '#ffffff', pupil: '#1e120a', mouth: '#4a120e', tongue: '#e8707a' },
    npcf: { kind: 'cartoon', ink: '#160c07', white: '#ffffff', pupil: '#2a160c', mouth: '#7a1830', tongue: '#e8707a', lashes: true, lips: '#c23a5c' },
    npcglow: { kind: 'cartoon', ink: '#0a0c10', white: '#e9fbff', pupil: '#16a6d8', mouth: '#2a1212', tongue: '#e8707a' },
    npchood: { kind: 'led', bg: '#0c0812', glow: '#b78cff' },
    godlove: { kind: 'cartoon', ink: '#140a08', white: '#ffffff', pupil: '#1d0f0a', mouth: '#4a0e18', tongue: '#ff6f8a' },
  };
  //            yeux        sourcils [hauteur, inclinaison (+ = colère)]   bouche
  const EXPR = {
    neutral:    { eyes: 'open',   brows: [0, 0],     mouth: 'smile' },
    blink:      { eyes: 'closed', brows: [0, 0],     mouth: 'smile' },
    happy:      { eyes: 'happy',  brows: [0.3, 0],   mouth: 'grin' },
    cool:       { eyes: 'shades', brows: [0, 0.2],   mouth: 'smirk' },
    scared:     { eyes: 'wide',   brows: [0.8, -0.6], mouth: 'wavy' },
    angry:      { eyes: 'angry',  brows: [-0.2, 0.9], mouth: 'teeth' },
    laugh:      { eyes: 'laugh',  brows: [0.4, -0.2], mouth: 'laugh' },
    surprised:  { eyes: 'wide',   brows: [1, 0],     mouth: 'o' },
    determined: { eyes: 'narrow', brows: [-0.1, 0.6], mouth: 'flat' },
    dizzy:      { eyes: 'x',      brows: [0.3, -0.3], mouth: 'wavy' },
    sad:        { eyes: 'sad',    brows: [0.5, -0.8], mouth: 'frown' },
    wink:       { eyes: 'wink',   brows: [0.2, 0],   mouth: 'grin' },
    focus:      { eyes: 'narrow', brows: [0, 0.3],   mouth: 'flat' },
    // version 1.4 : la bouche qui s'ouvre quand le personnage parle
    talk:       { eyes: 'open',   brows: [0.15, 0],  mouth: 'o' },
  };
  const faceCache = {};
  function faceTex(style, ex, glow) {
    const key = style + ':' + ex + ':' + (glow || '');
    if (faceCache[key]) return faceCache[key];
    const S = Object.assign({}, STYLES[style] || STYLES.oswel), E = EXPR[ex] || EXPR.neutral;
    if (glow) S.glow = glow;
    const c = document.createElement('canvas'); c.width = FW; c.height = FH;
    const g = c.getContext('2d');
    if (S.kind === 'pixel') {
      // on dessine en tout petit, puis on agrandit sans lissage : des vrais pixels
      const s = document.createElement('canvas'); s.width = 48; s.height = 30;
      const q = s.getContext('2d');
      q.fillStyle = S.bg; q.fillRect(0, 0, 48, 30);
      drawFace(q, 48, 30, E, { kind: 'pixel', line: S.glow, fill: S.glow, bg: S.bg, lw: 2.2 });
      g.imageSmoothingEnabled = false;
      g.drawImage(s, 0, 0, FW, FH);
      g.fillStyle = 'rgba(0,0,0,0.22)';
      for (let y = 0; y < FH; y += 5) g.fillRect(0, y, FW, 2);
      g.strokeStyle = 'rgba(60,255,154,0.25)'; g.lineWidth = 6; g.strokeRect(3, 3, FW - 6, FH - 6);
    } else if (S.kind === 'led') {
      const gr = g.createLinearGradient(0, 0, 0, FH); gr.addColorStop(0, S.bg); gr.addColorStop(1, '#000000');
      g.fillStyle = gr; g.fillRect(0, 0, FW, FH);
      g.shadowColor = S.glow; g.shadowBlur = 16;
      drawFace(g, FW, FH, E, { kind: 'led', line: S.glow, fill: S.glow, bg: S.bg, lw: 11, square: S.square });
      g.shadowBlur = 0;
      g.fillStyle = 'rgba(255,255,255,0.08)'; g.beginPath(); g.ellipse(FW * 0.3, FH * 0.18, FW * 0.32, FH * 0.1, -0.15, 0, Math.PI * 2); g.fill();
    } else if (S.kind === 'hood') {
      const gr = g.createRadialGradient(FW / 2, FH * 0.42, 8, FW / 2, FH * 0.42, FW * 0.62);
      gr.addColorStop(0, S.bg2); gr.addColorStop(1, S.bg);
      g.fillStyle = gr; g.fillRect(0, 0, FW, FH);
      drawHoodEyes(g, E, S.glow);
    } else {
      drawFace(g, FW, FH, E, { kind: 'cartoon', line: S.ink, fill: S.white, pupil: S.pupil, mouth: S.mouth, tongue: S.tongue, lw: 7, lashes: S.lashes, lips: S.lips });
    }
    const t = new THREE.CanvasTexture(c);
    t.encoding = THREE.sRGBEncoding; t.anisotropy = 4;
    return (faceCache[key] = t);
  }

  // TONY : deux points de lumière qui changent de forme avec l'émotion (pas de pupille, pas de bouche)
  function drawHoodEyes(g, E, glow) {
    const cx = FW / 2, ey = FH * 0.44, dx = FW * 0.145, r = FH * 0.072;
    g.lineCap = 'round'; g.lineJoin = 'round';
    const pass = (col, blur, lw, k) => {
      g.shadowColor = glow; g.shadowBlur = blur; g.fillStyle = col; g.strokeStyle = col; g.lineWidth = lw;
      for (const side of [-1, 1]) {
        const x = cx + side * dx;
        let type = E.eyes;
        if (type === 'wink') type = side < 0 ? 'open' : 'happy';
        if (type === 'laugh') type = 'happy';
        const dot = (rr, sy = 1) => { g.beginPath(); g.ellipse(x, ey, rr * k, rr * k * sy, 0, 0, Math.PI * 2); g.fill(); };
        switch (type) {
          case 'open': dot(r); break;
          case 'wide': dot(r * 1.35); break;
          case 'narrow': dot(r * 1.15, 0.42); break;
          case 'closed': g.beginPath(); g.moveTo(x - r * 1.1, ey + r * 0.3); g.lineTo(x + r * 1.1, ey + r * 0.3); g.stroke(); break;
          case 'happy': g.beginPath(); g.arc(x, ey + r * 0.7, r * 1.05, Math.PI * 1.15, Math.PI * 1.85); g.stroke(); break;
          case 'sad': g.beginPath(); g.moveTo(x - side * r * 1.1, ey - r * 0.1); g.lineTo(x + side * r * 1.1, ey + r * 0.55); g.stroke(); break;
          case 'angry': g.beginPath(); g.moveTo(x - side * r * 1.2, ey + r * 0.35); g.lineTo(x + side * r * 1.0, ey - r * 0.35); g.stroke(); dot(r * 0.55); break;
          case 'x': g.beginPath(); g.moveTo(x - r * 0.8, ey - r * 0.8); g.lineTo(x + r * 0.8, ey + r * 0.8); g.moveTo(x + r * 0.8, ey - r * 0.8); g.lineTo(x - r * 0.8, ey + r * 0.8); g.stroke(); break;
          case 'shades': g.beginPath(); g.moveTo(x - r * 1.25, ey); g.lineTo(x + r * 1.25, ey); g.stroke(); break;
          default: dot(r);
        }
      }
    };
    pass(glow, 22, 9, 1);            // le halo coloré
    pass('#ffffff', 6, 4, 0.5);      // le cœur blanc de la lumière
    g.shadowBlur = 0;
  }
  function drawFace(g, w, h, E, st) {
    const cx = w / 2, ey = h * 0.42, dx = w * 0.17, r = h * 0.17;
    const lw = st.lw * (w / FW);
    g.lineCap = 'round'; g.lineJoin = 'round'; g.lineWidth = lw;
    g.strokeStyle = st.line; g.fillStyle = st.fill;
    const eyes = E.eyes;
    if (eyes === 'shades') drawShades(g, cx, ey, dx, r, st, w);
    else for (const side of [-1, 1]) {
      let type = eyes;
      if (eyes === 'wink') type = side < 0 ? 'open' : 'happy';
      if (eyes === 'laugh') type = side < 0 ? 'chevL' : 'chevR';
      drawEye(g, cx + side * dx, ey, r, type, side, st);
      // cils (visage féminin) : trois petits traits au coin extérieur de l'œil
      if (st.lashes && (type === 'open' || type === 'wide' || type === 'narrow' || type === 'happy')) {
        const x = cx + side * dx, top = type === 'happy' ? ey + r * 0.45 - r * 0.8 : ey - r * (type === 'narrow' ? 0.42 : 0.98);
        g.save(); g.lineWidth = lw * 0.75; g.strokeStyle = st.line;
        for (let k = 0; k < 3; k++) {
          const a = -Math.PI / 2 + side * (0.55 + k * 0.32), bx = x + side * r * (0.35 + k * 0.22), by = top + r * (0.05 + k * 0.12);
          g.beginPath(); g.moveTo(bx, by); g.lineTo(bx + Math.cos(a) * r * 0.42, by + Math.sin(a) * r * 0.42); g.stroke();
        }
        g.restore();
      }
    }
    // sourcils
    if (st.kind !== 'pixel' || E.brows[1] !== 0) {
      g.strokeStyle = st.line; g.lineWidth = lw * (st.kind === 'cartoon' ? 1.1 : 0.8);
      for (const side of [-1, 1]) {
        const x0 = cx + side * dx, y = ey - r * (eyes === 'wide' ? 1.75 : 1.55) - E.brows[0] * r * 0.45;
        const inner = x0 - side * r * 0.85, outer = x0 + side * r * 0.85;
        const tilt = E.brows[1] * r * 0.55;
        g.beginPath(); g.moveTo(inner, y + tilt); g.lineTo(outer, y - tilt * 0.4); g.stroke();
      }
    }
    drawMouth(g, cx, h * 0.8, w * 0.11, E.mouth, st.lips ? Object.assign({}, st, { line: st.lips }) : st, st.lips ? lw * 1.25 : lw);
  }
  function drawEye(g, x, y, r, type, side, st) {
    const car = st.kind === 'cartoon';
    const fillEye = (rx, ry) => {
      g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
      if (car) { g.fillStyle = st.fill; g.fill(); g.stroke(); }
      else if (st.square) { g.fillStyle = st.fill; g.fillRect(x - rx, y - ry * 0.8, rx * 2, ry * 1.6); }
      else { g.fillStyle = st.fill; g.fill(); }
    };
    const pupil = (pr, oy = 0.12) => {
      if (!car) return;
      g.fillStyle = st.pupil; g.beginPath(); g.arc(x + side * -r * 0.08, y + r * oy, pr, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#ffffff'; g.beginPath(); g.arc(x + side * -r * 0.08 - pr * 0.35, y + r * oy - pr * 0.4, pr * 0.32, 0, Math.PI * 2); g.fill();
    };
    switch (type) {
      case 'open': fillEye(r * 0.82, r * 0.98); pupil(r * 0.48); break;
      case 'wide': fillEye(r * 1.02, r * 1.15); if (car) pupil(r * 0.24, 0); else { g.fillStyle = st.bg; g.beginPath(); g.arc(x, y, r * 0.45, 0, Math.PI * 2); g.fill(); } break;
      case 'narrow': fillEye(r * 0.85, r * 0.42); pupil(r * 0.32, 0.05); break;
      case 'closed': g.beginPath(); g.arc(x, y - r * 0.55, r * 0.8, Math.PI * 0.2, Math.PI * 0.8); g.stroke(); break;
      case 'happy': g.beginPath(); g.arc(x, y + r * 0.45, r * 0.8, Math.PI * 1.15, Math.PI * 1.85); g.stroke(); break;
      case 'chevL': g.beginPath(); g.moveTo(x - r * 0.6, y - r * 0.6); g.lineTo(x + r * 0.5, y); g.lineTo(x - r * 0.6, y + r * 0.6); g.stroke(); break;
      case 'chevR': g.beginPath(); g.moveTo(x + r * 0.6, y - r * 0.6); g.lineTo(x - r * 0.5, y); g.lineTo(x + r * 0.6, y + r * 0.6); g.stroke(); break;
      case 'x': g.beginPath(); g.moveTo(x - r * 0.6, y - r * 0.6); g.lineTo(x + r * 0.6, y + r * 0.6); g.moveTo(x + r * 0.6, y - r * 0.6); g.lineTo(x - r * 0.6, y + r * 0.6); g.stroke(); break;
      case 'angry': case 'sad': {
        // paupière coupée en biais (colère : vers le nez ; tristesse : vers l'extérieur)
        g.save();
        g.beginPath();
        const k = type === 'angry' ? 1 : -1;
        const yi = y - r * (0.2 + 0.55 * k * 0.5) + (type === 'angry' ? r * 0.25 : -r * 0.35);
        const yo = y - r * (type === 'angry' ? 1.1 : 0.15);
        const xi = x - side * r * 1.3, xo = x + side * r * 1.3;
        g.moveTo(xi, yi); g.lineTo(xo, yo); g.lineTo(xo, y + r * 2); g.lineTo(xi, y + r * 2); g.closePath();
        g.clip();
        fillEye(r * 0.85, r * 0.95); pupil(r * 0.45, 0.25);
        g.restore();
        if (car) { g.beginPath(); g.moveTo(xi + side * r * 0.45, yi + (yo - yi) * 0.17); g.lineTo(xo - side * r * 0.45, yo - (yo - yi) * 0.17); g.stroke(); }
        break;
      }
    }
    g.strokeStyle = st.line; g.lineWidth = st.lw * (g.canvas.width / FW);
  }
  function drawShades(g, cx, y, dx, r, st, w) {
    const car = st.kind === 'cartoon';
    g.fillStyle = car ? '#0d0f14' : st.fill;
    for (const side of [-1, 1]) {
      const x = cx + side * dx;
      g.beginPath();
      g.moveTo(x - r, y - r * 0.55); g.lineTo(x + r, y - r * 0.55); g.lineTo(x + r * 0.8, y + r * 0.55); g.lineTo(x - r * 0.8, y + r * 0.55); g.closePath(); g.fill();
    }
    g.fillRect(cx - dx + r * 0.6, y - r * 0.55, (dx - r * 0.6) * 2, r * 0.25);
    if (car) { g.fillStyle = 'rgba(255,255,255,0.75)'; g.fillRect(cx - dx - r * 0.6, y - r * 0.4, r * 0.35, r * 0.18); g.fillRect(cx + dx - r * 0.6, y - r * 0.4, r * 0.35, r * 0.18); }
  }
  function drawMouth(g, x, y, mw, type, st, lw) {
    const car = st.kind === 'cartoon';
    g.strokeStyle = st.line; g.lineWidth = lw;
    const fillM = () => { if (car) { g.fillStyle = st.mouth; g.fill(); g.stroke(); } else { g.fillStyle = st.fill; g.fill(); } };
    switch (type) {
      case 'smile': g.beginPath(); g.arc(x, y - mw * 0.9, mw, Math.PI * 0.25, Math.PI * 0.75); g.stroke(); break;
      case 'flat': g.beginPath(); g.moveTo(x - mw * 0.7, y); g.lineTo(x + mw * 0.7, y); g.stroke(); break;
      case 'smirk': g.beginPath(); g.moveTo(x - mw * 0.8, y + mw * 0.05); g.quadraticCurveTo(x + mw * 0.2, y + mw * 0.35, x + mw * 0.9, y - mw * 0.3); g.stroke(); break;
      case 'frown': g.beginPath(); g.arc(x, y + mw * 0.95, mw * 0.85, Math.PI * 1.25, Math.PI * 1.75); g.stroke(); break;
      case 'wavy': g.beginPath(); for (let k = 0; k <= 6; k++) { const px = x - mw + (k / 6) * mw * 2, py = y + (k % 2 ? -1 : 1) * mw * 0.18; if (k) g.lineTo(px, py); else g.moveTo(px, py); } g.stroke(); break;
      case 'o': g.beginPath(); g.ellipse(x, y, mw * 0.32, mw * 0.42, 0, 0, Math.PI * 2); fillM(); break;
      case 'grin': case 'laugh': {
        const big = type === 'laugh' ? 1.35 : 1;
        g.beginPath(); g.moveTo(x - mw * big, y - mw * 0.25); g.quadraticCurveTo(x, y + mw * 1.25 * big, x + mw * big, y - mw * 0.25); g.closePath(); fillM();
        if (car) {
          g.save(); g.clip();
          g.fillStyle = '#ffffff'; g.fillRect(x - mw * big, y - mw * 0.3, mw * 2 * big, mw * 0.32);
          if (type === 'laugh') { g.fillStyle = st.tongue; g.beginPath(); g.ellipse(x, y + mw * 0.75, mw * 0.55, mw * 0.35, 0, 0, Math.PI * 2); g.fill(); }
          g.restore();
          g.beginPath(); g.moveTo(x - mw * big, y - mw * 0.25); g.quadraticCurveTo(x, y + mw * 1.25 * big, x + mw * big, y - mw * 0.25); g.closePath(); g.stroke();
        }
        break;
      }
      case 'teeth': {
        g.beginPath(); g.rect(x - mw * 0.8, y - mw * 0.28, mw * 1.6, mw * 0.56);
        if (car) { g.fillStyle = '#ffffff'; g.fill(); g.stroke(); g.beginPath(); for (let k = -1; k <= 1; k++) { g.moveTo(x + k * mw * 0.4, y - mw * 0.28); g.lineTo(x + k * mw * 0.4, y + mw * 0.28); } g.moveTo(x - mw * 0.8, y); g.lineTo(x + mw * 0.8, y); g.stroke(); }
        else { g.stroke(); g.beginPath(); g.moveTo(x - mw * 0.8, y); g.lineTo(x + mw * 0.8, y); g.stroke(); }
        break;
      }
    }
  }

  /* ==================================================================
     LES 4 PERSONNAGES
     Chaque fabricant remplit P : hips, torso, head, hc (centre de la tête),
     legL/legR, armL/armR, handL/handR, face (mesh du visage), headR,
     accAnchor, backAnchor, bodyAnchor (repère des gadgets portés),
     hideHat (cachés sous un chapeau), hideGlasses, tick(t)
     ================================================================== */
  const BUILD = {};

  BUILD.oswel = (P, col) => {
    const skinM = mat(0x7a4a2c, { roughness: 0.62 });
    const hairM = mat(0x16100c, { roughness: 0.9 });
    const jacket = mat(col, { roughness: 0.48 });
    const acc = accentFor(col, 0xff8a2b, 0x2fd3d3);
    const accM = mat(acc, { roughness: 0.4 });
    const pants = mat(0x272c38, { roughness: 0.72 });
    const shoe = mat(0xf0efe9, { roughness: 0.5 });
    const dark = mat(0x191b20, { roughness: 0.55, metalness: 0.3 });
    const hips = P.hips = grp(0, 0.38, 0, P.rig);
    const mkLeg = (x) => {
      const L = grp(x, 0, 0, hips);
      mk(CYL(0.075, 0.064, 0.3, 12), pants, 0, -0.15, 0, L);
      mk(SPH(0.085, 14, 10), shoe, 0, -0.315, 0.045, L).scale.set(1.05, 0.62, 1.6);
      mk(BOX(0.15, 0.03, 0.24), accM, 0, -0.355, 0.045, L, false);
      return L;
    };
    P.legL = mkLeg(-0.1); P.legR = mkLeg(0.1);
    const torso = P.torso = grp(0, 0, 0, hips);
    mk(CYL(0.19, 0.22, 0.36, 18), jacket, 0, 0.18, 0, torso).scale.z = 0.82;
    mk(SPH(0.195, 18, 10), jacket, 0, 0.34, 0, torso).scale.set(1, 0.5, 0.82);
    mk(BOX(0.022, 0.3, 0.02), dark, 0, 0.2, 0.18, torso, false);
    mk(TOR(0.115, 0.036, 8, 18), accM, 0, 0.41, 0, torso).rotation.x = Math.PI / 2;
    const belt = mk(TOR(0.205, 0.026, 6, 22), dark, 0, 0.03, 0, torso, false); belt.rotation.x = Math.PI / 2; belt.scale.y = 0.82;
    mk(BOX(0.1, 0.07, 0.05), accM, 0.13, 0.06, 0.15, torso);
    mk(BOX(0.075, 0.05, 0.012), glowM(acc, 1.3), -0.09, 0.27, 0.168, torso, false);
    const mkArm = (x) => {
      const A = grp(x, 0.32, 0, torso);
      mk(CYL(0.063, 0.056, 0.26, 10), jacket, 0, -0.13, 0, A);
      mk(CYL(0.064, 0.064, 0.045, 10), accM, 0, -0.25, 0, A, false);
      const H = grp(0, -0.3, 0, A);
      mk(SPH(0.064, 12, 10), skinM, 0, 0, 0, H);
      return [A, H];
    };
    [P.armL, P.handL] = mkArm(-0.238); [P.armR, P.handR] = mkArm(0.238);
    const head = P.head = grp(0, 0.42, 0, torso);
    mk(CYL(0.07, 0.08, 0.1, 10), skinM, 0, 0.03, 0, head, false);
    const hc = P.hc = grp(0, 0.25, 0, head);
    const R0 = P.headR = 0.27;
    mk(SPH(R0, 26, 18), skinM, 0, 0, 0, hc);
    for (const s of [-1, 1]) mk(SPH(0.06, 10, 8), skinM, s * R0 * 0.98, -0.01, 0, hc).scale.set(0.55, 1, 0.8);
    // cheveux courts et frisés
    const hair = grp(0, 0, 0, hc);
    mk(geo('oswHair', () => new THREE.SphereGeometry(R0 * 1.035, 22, 12, 0, Math.PI * 2, 0, Math.PI * 0.4)), hairM, 0, 0.01, -0.012, hair);
    const tufts = grp(0, 0, 0, hc);
    for (let i = 0; i < 11; i++) { const a = (i / 11) * Math.PI * 2; mk(SPH(0.07, 8, 6), hairM, Math.cos(a) * 0.16, 0.215 + (i % 2) * 0.025, Math.sin(a) * 0.14 - 0.03, tufts); }
    mk(SPH(0.08, 8, 6), hairM, 0, 0.27, 0.0, tufts);
    // casque audio + lunettes tech sur le front
    const band = mk(TOR(R0 * 1.09, 0.022, 6, 20, Math.PI), dark, 0, 0.02, -0.04, hc, false);
    const cups = [-1, 1].map((s) => { const c = mk(CYL(0.075, 0.075, 0.07, 14), accM, s * R0 * 1.06, 0.0, -0.01, hc); c.rotation.z = Math.PI / 2; return c; });
    const led = mk(SPH(0.02, 6, 6), glowM(acc, 2), R0 * 1.1 + 0.02, 0.0, -0.01, hc, false);
    const gog = grp(0, 0.16, 0.2, hc);
    for (const s of [-1, 1]) { const l = mk(CYL(0.06, 0.06, 0.05, 14), dark, s * 0.085, 0, 0, gog); l.rotation.x = Math.PI / 2 - 0.5; const g2 = mk(CYL(0.045, 0.045, 0.052, 14), glowM(0x7fe8ff, 0.9), s * 0.085, 0, 0.004, gog, false); g2.rotation.x = Math.PI / 2 - 0.5; }
    // le visage
    P.faceStyle = 'oswel';
    P.face = mk(new THREE.SphereGeometry(R0 * 1.012, 28, 16, Math.PI / 2 - Math.PI * 0.31, Math.PI * 0.62, Math.PI * 0.33, Math.PI * 0.4),
      new THREE.MeshStandardMaterial({ transparent: true, roughness: 0.55, depthWrite: false }), 0, 0, 0, hc, false);
    P.accAnchor = grp(0, 0, 0, hc); P.accAnchor.scale.setScalar(R0 / 0.25);
    P.backAnchor = grp(0, 0.24, -0.17, torso);
    P.bodyAnchor = grp(0, 0.18 - 0.42 * 0.76, 0, torso); P.bodyAnchor.scale.setScalar(0.76);
    P.hideHat = [tufts, band, ...cups, led]; P.hideGlasses = [gog];
    P.height = 1.27;
    P.tick = (t) => { led.material = (Math.sin(t * 3) > 0.6) ? glowM(acc, 3) : glowM(acc, 1.2); };
  };

  // un cœur en relief (forme dessinée puis extrudée), utilisé par GOD LOVE et ses effets
  const HEART = () => geo('heart', () => {
    const h = new THREE.Shape();
    h.moveTo(0, -0.5);
    h.bezierCurveTo(-0.12, -0.36, -0.5, -0.16, -0.5, 0.14);
    h.bezierCurveTo(-0.5, 0.44, -0.16, 0.56, 0, 0.3);
    h.bezierCurveTo(0.16, 0.56, 0.5, 0.44, 0.5, 0.14);
    h.bezierCurveTo(0.5, -0.16, 0.12, -0.36, 0, -0.5);
    const g = new THREE.ExtrudeGeometry(h, { depth: 0.22, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.04, bevelSegments: 2, curveSegments: 10 });
    g.translate(0, 0, -0.11); return g;
  });

  BUILD.godlove = (P, col) => {
    const skinM = mat(0x5e3a22, { roughness: 0.6 });
    const hairM = mat(0x0e0a08, { roughness: 0.95 });
    const coat = mat(col, { roughness: 0.5 });
    const gold = mat(0xf2c230, { roughness: 0.28, metalness: 0.85 });
    const shirt = mat(0xf4f1ea, { roughness: 0.6 });
    const pants = mat(0x1d1e25, { roughness: 0.7 });
    const heartCol = accentFor(col, 0xff3d6e, 0xffd23f);
    const shoeM = mat(heartCol, { roughness: 0.45 });
    const sole = mat(0xf5f5f0, { roughness: 0.5 });
    // le cœur qui bat : un matériau à lui (son intensité change à chaque battement)
    const beatM = new THREE.MeshStandardMaterial({ color: lin(heartCol), emissive: lin(heartCol), emissiveIntensity: 1.4, roughness: 0.3, toneMapped: false });
    const hips = P.hips = grp(0, 0.38, 0, P.rig);
    const mkLeg = (x) => {
      const L = grp(x, 0, 0, hips);
      mk(CYL(0.072, 0.062, 0.3, 12), pants, 0, -0.15, 0, L);
      // baskets montantes
      mk(CYL(0.068, 0.07, 0.08, 12), shoeM, 0, -0.29, 0.01, L, false);
      mk(SPH(0.088, 14, 10), shoeM, 0, -0.32, 0.05, L).scale.set(1.05, 0.6, 1.6);
      mk(BOX(0.16, 0.035, 0.26), sole, 0, -0.36, 0.05, L, false);
      return L;
    };
    P.legL = mkLeg(-0.1); P.legR = mkLeg(0.1);
    const torso = P.torso = grp(0, 0, 0, hips);
    // long manteau ouvert sur une chemise blanche
    mk(CYL(0.2, 0.235, 0.38, 18), coat, 0, 0.18, 0, torso).scale.z = 0.84;
    mk(SPH(0.205, 18, 10), coat, 0, 0.34, 0, torso).scale.set(1, 0.5, 0.84);
    mk(BOX(0.13, 0.3, 0.02), shirt, 0, 0.2, 0.17, torso, false);
    for (const sd of [-1, 1]) { const lap = mk(BOX(0.035, 0.3, 0.02), gold, sd * 0.075, 0.21, 0.176, torso, false); lap.rotation.z = sd * 0.16; }
    // pans du manteau derrière (ils se balancent)
    const tail = grp(0, 0.02, -0.12, torso);
    mk(BOX(0.36, 0.3, 0.035), coat, 0, -0.15, -0.03, tail);
    mk(BOX(0.37, 0.03, 0.04), gold, 0, -0.3, -0.03, tail, false);
    // chaîne dorée et pendentif cœur
    const chain = mk(TOR(0.12, 0.012, 6, 22), gold, 0, 0.36, 0.03, torso, false); chain.rotation.x = Math.PI / 2 - 0.35;
    const pend = mk(HEART(), gold, 0, 0.27, 0.19, torso, false); pend.scale.setScalar(0.07);
    // le cœur lumineux sur la poitrine
    const emb = mk(HEART(), beatM, -0.1, 0.27, 0.178, torso, false); emb.scale.setScalar(0.085);
    const belt = mk(TOR(0.212, 0.022, 6, 22), mat(0x15161b, { roughness: 0.5, metalness: 0.4 }), 0, 0.03, 0, torso, false); belt.rotation.x = Math.PI / 2; belt.scale.y = 0.84;
    mk(BOX(0.07, 0.05, 0.03), gold, 0, 0.03, 0.19, torso, false);
    const mkArm = (x) => {
      const A = grp(x, 0.32, 0, torso);
      mk(CYL(0.064, 0.058, 0.26, 10), coat, 0, -0.13, 0, A);
      mk(CYL(0.066, 0.066, 0.04, 10), gold, 0, -0.25, 0, A, false);
      const H = grp(0, -0.3, 0, A);
      mk(SPH(0.063, 12, 10), skinM, 0, 0, 0, H);
      return [A, H];
    };
    [P.armL, P.handL] = mkArm(-0.242); [P.armR, P.handR] = mkArm(0.242);
    // une bague dorée
    mk(TOR(0.03, 0.01, 6, 12), gold, 0, 0.02, 0, P.handR, false).rotation.x = Math.PI / 2;
    const head = P.head = grp(0, 0.42, 0, torso);
    mk(CYL(0.07, 0.08, 0.1, 10), skinM, 0, 0.03, 0, head, false);
    const hc = P.hc = grp(0, 0.25, 0, head);
    const R0 = P.headR = 0.27;
    mk(SPH(R0, 26, 18), skinM, 0, 0, 0, hc);
    for (const s of [-1, 1]) mk(SPH(0.06, 10, 8), skinM, s * R0 * 0.98, -0.01, 0, hc).scale.set(0.55, 1, 0.8);
    mk(SPH(0.022, 8, 6), gold, R0 * 1.0, -0.07, 0.02, hc, false);       // boucle d'oreille
    // coupe haute (« high-top ») : sa silhouette se reconnaît de loin
    const hair = grp(0, 0, 0, hc);
    // côtés dégradés (rasés plus court, un peu plus clairs)
    mk(geo('glHair', () => new THREE.SphereGeometry(R0 * 1.025, 22, 12, 0, Math.PI * 2, 0, Math.PI * 0.4)), mat(0x2e2119, { roughness: 1 }), 0, 0.008, -0.01, hair);
    // la coupe haute : un volume de cheveux arrondi et texturé (pas un chapeau)
    const top = grp(0, 0, -0.02, hair);
    mk(CYL(0.2, 0.23, 0.12, 22), hairM, 0, 0.245, 0, top).scale.z = 0.92;
    mk(SPH(0.212, 22, 12), hairM, 0, 0.3, 0, top).scale.set(1, 0.48, 0.92);
    for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; mk(SPH(0.05, 6, 5), hairM, Math.cos(a) * 0.16, 0.34 + (i % 2) * 0.015, Math.sin(a) * 0.14, top); }
    // un trait rasé sur le côté (la marque du coiffeur)
    for (const sd of [-1, 1]) { const l = mk(BOX(0.006, 0.012, 0.13), mat(0x5e3a22, { roughness: 0.8 }), sd * R0 * 0.99, 0.11, -0.03, hc, false); l.rotation.z = sd * 0.2; }
    // le visage
    P.faceStyle = 'godlove';
    P.face = mk(new THREE.SphereGeometry(R0 * 1.012, 28, 16, Math.PI / 2 - Math.PI * 0.31, Math.PI * 0.62, Math.PI * 0.33, Math.PI * 0.4),
      new THREE.MeshStandardMaterial({ transparent: true, roughness: 0.55, depthWrite: false }), 0, 0, 0, hc, false);
    P.accAnchor = grp(0, 0, 0, hc); P.accAnchor.scale.setScalar(R0 / 0.25);
    P.backAnchor = grp(0, 0.24, -0.18, torso);
    P.bodyAnchor = grp(0, 0.18 - 0.42 * 0.76, 0, torso); P.bodyAnchor.scale.setScalar(0.76);
    P.hideHat = [top]; P.hideGlasses = [];
    P.height = 1.36;
    // battement de cœur (double coup), les pans du manteau bougent un peu
    P.tick = (t) => {
      const b = t % 1.15, e = Math.exp(-(b * b) / 0.004) + 0.7 * Math.exp(-((b - 0.24) * (b - 0.24)) / 0.004);
      beatM.emissiveIntensity = 1.1 + e * 2.6; emb.scale.setScalar(0.085 * (1 + e * 0.22));
      tail.rotation.x = 0.08 + Math.sin(t * 2.2) * 0.05;
    };
  };

  /* ---------- Base commune des humains (TONY, FREDO) ---------- */
  function humanBase(P, col, o) {
    const skinM = mat(o.skin, { roughness: 0.6 });
    const top = mat(col, { roughness: o.topRough || 0.6 });
    const pants = mat(o.pants || 0x262a33, { roughness: 0.72 });
    const shoe = mat(o.shoe || 0xf0efe9, { roughness: 0.5 });
    const shoe2 = mat(o.shoe2 || 0x22252c, { roughness: 0.5 });
    const hips = P.hips = grp(0, 0.38, 0, P.rig);
    const mkLeg = (x) => {
      const L = grp(x, 0, 0, hips);
      mk(CYL(0.076, 0.065, 0.3, 12), pants, 0, -0.15, 0, L);
      mk(SPH(0.086, 14, 10), shoe, 0, -0.316, 0.045, L).scale.set(1.05, 0.62, 1.6);
      mk(BOX(0.155, 0.03, 0.25), shoe2, 0, -0.356, 0.045, L, false);
      return L;
    };
    P.legL = mkLeg(-0.1); P.legR = mkLeg(0.1);
    const torso = P.torso = grp(0, 0, 0, hips);
    mk(CYL(0.2, 0.225, 0.37, 18), top, 0, 0.18, 0, torso).scale.z = 0.84;
    mk(SPH(0.2, 18, 10), top, 0, 0.34, 0, torso).scale.set(1, 0.5, 0.84);
    const sleeve = o.sleeve !== undefined ? mat(o.sleeve, { roughness: 0.6 }) : top;
    const cuffM = mat(o.cuff !== undefined ? o.cuff : 0x22252c, { roughness: 0.6 });
    const mkArm = (x) => {
      const A = grp(x, 0.32, 0, torso);
      mk(CYL(0.064, 0.057, 0.26, 10), sleeve, 0, -0.13, 0, A);
      mk(CYL(0.065, 0.065, 0.04, 10), cuffM, 0, -0.25, 0, A, false);
      const H = grp(0, -0.3, 0, A);
      mk(SPH(0.063, 12, 10), o.handMat || skinM, 0, 0, 0, H);
      return [A, H];
    };
    [P.armL, P.handL] = mkArm(-0.24); [P.armR, P.handR] = mkArm(0.24);
    const head = P.head = grp(0, 0.42, 0, torso);
    mk(CYL(0.07, 0.08, 0.1, 10), skinM, 0, 0.03, 0, head, false);
    const hc = P.hc = grp(0, 0.25, 0, head);
    const R0 = P.headR = 0.27;
    mk(SPH(R0, 26, 18), skinM, 0, 0, 0, hc);
    for (const sd of [-1, 1]) mk(SPH(0.06, 10, 8), skinM, sd * R0 * 0.98, -0.01, 0, hc).scale.set(0.55, 1, 0.8);
    P.face = mk(new THREE.SphereGeometry(R0 * 1.012, 28, 16, Math.PI / 2 - Math.PI * 0.31, Math.PI * 0.62, Math.PI * 0.33, Math.PI * 0.4),
      new THREE.MeshStandardMaterial({ transparent: true, roughness: 0.55, depthWrite: false }), 0, 0, 0, hc, false);
    P.accAnchor = grp(0, 0, 0, hc); P.accAnchor.scale.setScalar(R0 / 0.25);
    P.backAnchor = grp(0, 0.24, -0.17, torso);
    P.bodyAnchor = grp(0, 0.18 - 0.42 * 0.76, 0, torso); P.bodyAnchor.scale.setScalar(0.76);
    return { torso, hc, R0, skinM, top };
  }
  // une petite étiquette lumineuse (logo « </> » sur le sweat de Tony…)
  function logoTex(text, color) {
    return geo('logo:' + text + color, () => {
      const c = document.createElement('canvas'); c.width = 128; c.height = 64; const g = c.getContext('2d');
      g.fillStyle = color; g.font = 'bold 44px "Chakra Petch", monospace'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, 64, 34);
      const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; return t;
    });
  }

  /* TONY — le mentor d'Oswel (version 1.5 : nouvelle fiche)
     Style ténébreux : tenue blanc cassé presque immaculée, capuche blanche à l'intérieur sombre qui
     cache le visage ; à la place des yeux, deux points lumineux sans pupille (blanc doré, cyan pâle
     quand il utilise un pouvoir). Accents sombres : violet, noir, bleu nuit. Une longue écharpe
     blanche flotte derrière lui (elle réagit à sa vitesse : elle s'envole pendant les sauts).
     La couleur choisie dans la boutique ne colore qu'un détail (l'emblème « </> » du fermoir) :
     sa silhouette blanche reste reconnaissable. */
  const TONY = { off: 0xece6da, off2: 0xd8d0c2, violet: 0x6c4ad0, nuit: 0x161c3e, noir: 0x0c0c11, voidC: 0x07060c };
  BUILD.tony = (P, col) => {
    const B = humanBase(P, TONY.off, { skin: TONY.voidC, pants: TONY.nuit, shoe: TONY.noir, shoe2: TONY.off2, cuff: TONY.violet, handMat: mat(TONY.noir, { roughness: 0.6 }), topRough: 0.72 });
    const { torso, hc, R0 } = B;
    const offM = mat(TONY.off, { roughness: 0.72 });
    const off2M = mat(TONY.off2, { roughness: 0.75 });
    const violetM = mat(TONY.violet, { roughness: 0.45, metalness: 0.2 });
    const nuitM = mat(TONY.nuit, { roughness: 0.6 });
    const noirM = mat(TONY.noir, { roughness: 0.5, metalness: 0.3 });
    const emb = accentFor(col, 0xb48cff, 0x7fe8ff);   // l'emblème suit (un peu) la couleur du joueur
    // --- le manteau : un pan qui s'évase sous la ceinture (ouvert devant), col en V bleu nuit ---
    const skirt = mk(geo('tonySkirt', () => new THREE.CylinderGeometry(0.215, 0.285, 0.24, 20, 1, true, Math.PI * 0.12, Math.PI * 1.76)), mat(TONY.off, { roughness: 0.72, side: THREE.DoubleSide }), 0, -0.1, 0, P.hips);
    skirt.scale.z = 0.86;
    const hem = mk(TOR(0.284, 0.012, 5, 26, Math.PI * 1.76), violetM, 0, -0.22, 0, P.hips, false); hem.rotation.set(Math.PI / 2, 0, Math.PI * 0.62);   // (l'ouverture du manteau reste devant) hem.scale.y = 0.86;
    mk(BOX(0.12, 0.16, 0.02), nuitM, 0, 0.3, 0.172, torso, false);                 // le col en V (bleu nuit)
    for (const sd of [-1, 1]) { const lap = mk(BOX(0.03, 0.22, 0.022), violetM, sd * 0.07, 0.26, 0.178, torso, false); lap.rotation.z = sd * 0.42; }
    // ceinture-écharpe violette, fermoir noir avec l'emblème lumineux « </> »
    const belt = mk(TOR(0.215, 0.028, 6, 24), violetM, 0, 0.04, 0, torso, false); belt.rotation.x = Math.PI / 2; belt.scale.y = 0.84;
    mk(BOX(0.11, 0.07, 0.03), noirM, 0, 0.04, 0.19, torso, false);
    const logo = mk(new THREE.PlaneGeometry(0.1, 0.05), new THREE.MeshBasicMaterial({ map: logoTex('</>', '#' + emb.toString(16).padStart(6, '0')), transparent: true, toneMapped: false }), 0, 0.04, 0.207, torso, false);
    // liserés sombres sur les manches
    for (const A of [P.armL, P.armR]) { const t = mk(TOR(0.062, 0.01, 5, 14), nuitM, 0, -0.06, 0, A, false); t.rotation.x = Math.PI / 2; }
    // --- la CAPUCHE : blanche dehors, sombre dedans, ouverte devant (le visage reste dans l'ombre) ---
    const hood = grp(0, 0.01, -0.005, hc);
    const HR = R0 * 1.17;
    const shellGeo = geo('tonyHood', () => new THREE.SphereGeometry(HR, 28, 18, Math.PI / 2 + Math.PI * 0.22, Math.PI * 1.56, 0, Math.PI * 0.8));
    const shell = mk(shellGeo, offM, 0, 0, 0, hood);
    const inner = mk(shellGeo, mat(TONY.voidC, { roughness: 1, side: THREE.BackSide }), 0, 0, 0, hood, false);
    inner.scale.setScalar(0.985);
    // l'ouverture est étroite et pointue en haut (une vraie capuche, pas un casque) ; un ourlet fin la borde
    const rim = mk(TOR(R0 * 0.9, 0.026, 6, 30), off2M, 0, 0.02, R0 * 0.8, hood, false); rim.scale.set(0.78, 1.12, 0.6); rim.rotation.x = -0.18;
    // le rebord du dessus avance au-dessus du visage : le visage reste dans l'ombre
    const brim = mk(TOR(R0 * 0.78, 0.055, 8, 22, Math.PI), offM, 0, 0.05, R0 * 0.86, hood); brim.scale.set(0.95, 1.05, 1); brim.rotation.x = -0.42;
    // la pointe de la capuche retombe dans le dos
    const tip = mk(geo('tonyHoodTip', () => new THREE.ConeGeometry(0.12, 0.34, 14)), offM, 0, 0.0, -0.3, hood); tip.rotation.x = -2.55; tip.scale.z = 0.65;
    // un pan de capuche sur les épaules (il descend dans le dos)
    mk(geo('tonyMantle', () => new THREE.SphereGeometry(0.235, 20, 10, 0, Math.PI * 2, 0, Math.PI * 0.42)), offM, 0, 0.3, -0.01, torso).scale.set(1.06, 0.62, 0.92);
    // --- la longue ÉCHARPE blanche : un tour du cou, puis un pan qui flotte (6 morceaux articulés) ---
    const collar = mk(TOR(0.13, 0.05, 8, 20), offM, 0, 0.415, 0.0, torso, false); collar.rotation.x = Math.PI / 2 - 0.12;
    const scarfM = mat(0xf4f0e6, { roughness: 0.8, side: THREE.DoubleSide });
    const scarf = grp(-0.075, 0.4, -0.17, torso);
    const segs = [];
    let par = scarf;
    for (let k = 0; k < 6; k++) {
      const g = grp(0, k ? -0.125 : 0, 0, par);
      mk(BOX(0.115 - k * 0.006, 0.13, 0.02), k === 5 ? nuitM : scarfM, 0, -0.063, 0, g, false);   // (le bout : une bande bleu nuit)
      segs.push(g); par = g;
    }
    // --- le visage : l'intérieur sombre de la capuche et deux points lumineux (voir STYLES.tony) ---
    P.faceStyle = 'tony';
    P.faceEmissive = true;   // les deux points brillent même dans l'ombre
    P.hideHat = []; P.hideGlasses = [];
    P.keep = [inner, logo, scarf];
    P.height = 1.36;
    // l'écharpe suit le mouvement : elle traîne derrière quand il court, s'envole quand il saute ou tombe
    const wp = new THREE.Vector3(), prev = new THREE.Vector3(), vel = new THREE.Vector3(), q = new THREE.Quaternion();
    let lastT = null, flut = 0;
    P.tick = (t) => {
      const dt = lastT === null ? 0 : Math.min(0.1, Math.max(0, t - lastT)); lastT = t;
      logo.material.opacity = 0.8 + Math.sin(t * 2.1) * 0.15;
      scarf.updateWorldMatrix(true, false);
      scarf.getWorldPosition(wp);
      if (dt > 0) {
        vel.copy(wp).sub(prev).divideScalar(dt);
        if (vel.lengthSq() > 900) vel.set(0, 0, 0);   // téléportation (porte, reprise) : on ignore
        torso.getWorldQuaternion(q); vel.applyQuaternion(q.invert());   // vitesse vue par le personnage
      } else vel.set(0, 0, 0);
      prev.copy(wp);
      // (le personnage est presque face à la caméra : « lat » = vitesse de côté, « fwd » = vers l'avant)
      const lat = Math.max(-12, Math.min(12, vel.x)), fwd = Math.max(-9, Math.min(9, vel.z)), up = Math.max(-14, Math.min(14, vel.y));
      const spd = Math.min(1, Math.hypot(lat, fwd) / 7), air = Math.min(1, Math.abs(up) / 6);
      flut += dt * (6 + spd * 6 + air * 4);
      // elle traîne derrière quand il court, se soulève quand il tombe (et flotte pendant tout le saut)
      const baseX = 0.22 + Math.max(0, fwd) * 0.06 + spd * 0.4 + Math.max(0, -up) * 0.085 - Math.max(0, up) * 0.02;
      const baseZ = -lat * 0.075;
      for (let k = 0; k < segs.length; k++) {
        const s = segs[k];
        const wave = Math.sin(flut - k * 0.85) * (0.06 + air * 0.16 + spd * 0.08) * (0.5 + k * 0.18);
        const tx = (k === 0 ? Math.min(1.5, baseX) : Math.min(0.3, baseX * 0.15)) + wave;
        const tz = (k === 0 ? Math.max(-1.2, Math.min(1.2, baseZ)) : Math.max(-0.25, Math.min(0.25, baseZ * 0.12))) + Math.sin(flut * 0.7 - k * 0.6) * 0.05 * (1 + air * 2);
        const kk = dt ? Math.min(1, dt * (11 - k * 1.3)) : 1;
        s.rotation.x += (tx - s.rotation.x) * kk;
        s.rotation.z += (tz - s.rotation.z) * kk;
      }
    };
  };

  // FREDO — programmeur du Nexus
  BUILD.fredo = (P, col) => {
    const B = humanBase(P, col, { skin: 0x8a5a3a, sleeve: 0xefe6d6, cuff: 0x1f2028, pants: 0x30343e, shoe: 0xffffff, shoe2: accentFor(col, 0xff8a2b, 0x3d8bff) });
    const { torso, hc, R0 } = B;
    const dark = mat(0x16181d, { roughness: 0.5, metalness: 0.35 });
    const acc = accentFor(col, 0xffd23f, 0xff8a2b);
    // blouson de sport : col et bas rayés, grosse lettre F
    const rib = mat(0x1f2028, { roughness: 0.7 });
    mk(TOR(0.13, 0.03, 6, 18), rib, 0, 0.4, 0.0, torso, false).rotation.x = Math.PI / 2;
    const hem = mk(TOR(0.215, 0.025, 6, 22), rib, 0, 0.02, 0, torso, false); hem.rotation.x = Math.PI / 2; hem.scale.y = 0.84;
    mk(BOX(0.018, 0.33, 0.02), mat(0xefe6d6), 0, 0.2, 0.182, torso, false);
    mk(new THREE.PlaneGeometry(0.1, 0.1), new THREE.MeshBasicMaterial({ map: logoTex('F', '#' + acc.toString(16).padStart(6, '0')), transparent: true }), -0.1, 0.25, 0.186, torso, false);
    // casque audio autour du cou
    const hp = grp(0, 0.43, 0.02, torso);
    const band = mk(TOR(0.16, 0.02, 6, 20, Math.PI), dark, 0, 0, -0.02, hp, false); band.rotation.x = -Math.PI / 2 - 0.25;
    for (const sd of [-1, 1]) { const c = mk(CYL(0.07, 0.07, 0.06, 14), mat(acc, { roughness: 0.4 }), sd * 0.16, -0.03, 0.05, hp); c.rotation.z = Math.PI / 2; c.rotation.y = sd * 0.5; }
    // montre connectée (elle s'allume)
    const watchM = new THREE.MeshStandardMaterial({ color: lin(0x5fd4ff), emissive: lin(0x5fd4ff), emissiveIntensity: 1, toneMapped: false });
    mk(BOX(0.06, 0.03, 0.07), watchM, 0, 0.06, 0, P.handL, false);
    // bonnet avec pompon
    mk(geo('fredoHair', () => new THREE.SphereGeometry(R0 * 1.03, 22, 12, 0, Math.PI * 2, 0, Math.PI * 0.42)), mat(0x110b08, { roughness: 0.95 }), 0, 0.005, -0.01, hc);
    const hat = grp(0, 0, 0, hc);
    const beanieM = mat(acc, { roughness: 0.85 });
    mk(geo('fredoBeanie', () => new THREE.SphereGeometry(R0 * 1.07, 22, 12, 0, Math.PI * 2, 0, Math.PI * 0.4)), beanieM, 0, 0.04, -0.01, hat);
    const fold = mk(CYL(R0 * 1.0, R0 * 1.02, 0.07, 22), mat(0x1f2028, { roughness: 0.85 }), 0, 0.12, -0.01, hat); fold.scale.z = 0.98;
    mk(SPH(0.065, 10, 8), mat(0xf4f1ea, { roughness: 1 }), 0, 0.33, -0.02, hat);
    P.faceStyle = 'fredo';
    P.hideHat = [hat]; P.hideGlasses = [];
    P.height = 1.33;
    P.tick = (t) => { watchM.emissiveIntensity = 0.6 + (Math.sin(t * 1.7) > 0.8 ? 1.6 : 0.2); };
  };



  /* ---------- Nattes sur TOUTE la tête (Franck) : des rangs collés du front à la nuque,
     sur toute la largeur du crâne, et des nattes qui tombent tout autour (côtés et dos), perles au bout ---------- */
  function fullBraids(hc, R0, hairM, beadM) {
    const g = grp(0, 0, 0, hc);
    mk(geo('fbCap', () => new THREE.SphereGeometry(R0 * 1.035, 24, 14, 0, Math.PI * 2, 0, Math.PI * 0.41)), hairM, 0, 0.008, -0.012, g);
    mk(geo('fbBack2', () => new THREE.SphereGeometry(R0 * 1.04, 22, 14, Math.PI * 0.86, Math.PI * 1.28, Math.PI * 0.25, Math.PI * 0.42)), hairM, 0, 0, -0.01, g);
    const ridgeM = mat(0x3a2414, { roughness: 0.7 });
    const Rh = R0 * 1.045;
    for (let i = -5; i <= 5; i++) {
      const a = Math.abs(i), dx = i * 0.044, r = Math.sqrt(Math.max(0.001, Rh * Rh - dx * dx));
      // les rangs du milieu vont du front à la nuque ; ceux des côtés s'arrêtent avant les tempes (on voit toujours les yeux)
      const arc = Math.PI * (a >= 4 ? 0.66 : a >= 3 ? 0.79 : 0.89), z0 = -Math.PI * 0.06;   // de la nuque (sous l'horizontale) jusqu'au front
      const rd = mk(TOR(+r.toFixed(3), 0.013, 4, 24, +arc.toFixed(4)), ridgeM, dx, 0.006, -0.01, g, false);
      rd.rotation.set(0, Math.PI / 2, z0);
    }
    for (let k = 0; k < 13; k++) {
      const th = (-0.56 + k * (1.12 / 12)) * Math.PI;           // des tempes jusqu'à la nuque, tout autour
      const rr = R0 * 0.95, bx = Math.sin(th) * rr, bz = -Math.cos(th) * rr * 0.92 - 0.01;
      const len = 0.22 + (k % 3) * 0.04;
      const br = mk(CYL(0.017, 0.012, len, 6), hairM, bx, -0.05 - len / 2, bz, g, false);
      br.rotation.set(-0.1 * Math.cos(th), 0, Math.sin(th) * 0.22);
      mk(SPH(0.022, 8, 6), beadM, bx + Math.sin(th) * 0.03, -0.06 - len, bz - 0.01, g, false);
    }
    return g;
  }

  /* ---------- Coiffures longues (personnages féminins) ----------
     long : cheveux longs lâchés · ponytail : queue de cheval · braidsL : longues tresses
     bunlong : chignon + cheveux longs · scarflong : foulard + longues tresses dessous */
  function longHair(hc, R0, style, hairM, accM, under) {
    const g = grp(0, 0, 0, hc);
    const side = THREE.DoubleSide;
    const hm2 = new THREE.MeshStandardMaterial({ color: hairM.color.clone(), roughness: 0.85, side });
    if (!under) mk(geo('lhCap', () => new THREE.SphereGeometry(R0 * 1.045, 22, 14, 0, Math.PI * 2, 0, Math.PI * 0.42)), hairM, 0, 0.01, -0.01, g);
    if (under) mk(geo('lhBackU', () => new THREE.SphereGeometry(R0 * 1.03, 22, 10, Math.PI * 0.72, Math.PI * 1.56, Math.PI * 0.42, Math.PI * 0.33)), hairM, 0, 0, -0.01, g);
    else mk(geo('lhBack', () => new THREE.SphereGeometry(R0 * 1.05, 22, 14, Math.PI * 0.72, Math.PI * 1.56, Math.PI * 0.25, Math.PI * 0.5)), hairM, 0, 0, -0.01, g);
    const len = style === 'bunlong' ? 0.42 : 0.5;
    if (style === 'long' || style === 'bunlong') {
      // la nappe de cheveux dans le dos (un demi-cylindre qui s'évase) et deux mèches devant les épaules
      mk(geo('lhSheet' + len, () => new THREE.CylinderGeometry(R0 * 1.0, R0 * 1.12, len, 18, 1, true, Math.PI * 0.42, Math.PI * 1.16)), hm2, 0, -len / 2 - 0.02, -0.02, g);
      for (const sd of [-1, 1]) {
        const lock = mk(BOX(0.075, len * 0.75, 0.06), hairM, sd * R0 * 0.88, -len * 0.4, 0.04, g);
        lock.rotation.z = sd * 0.06;
      }
      if (accM) mk(TOR(R0 * 1.0, 0.016, 5, 26, Math.PI), accM, 0, 0.12, 0, g, false).rotation.set(-Math.PI / 2 + 0.25, 0, 0);   // serre-tête
    }
    if (style === 'bunlong') { mk(SPH(0.1, 12, 10), hairM, 0, 0.27, -0.1, g); if (accM) mk(TOR(0.055, 0.016, 6, 14), accM, 0, 0.24, -0.09, g, false).rotation.x = -0.6; }
    if (style === 'ponytail') {
      if (accM) mk(TOR(0.045, 0.018, 6, 14), accM, 0, 0.16, -0.25, g, false).rotation.x = 0.4;
      let y = 0.13, z = -0.27;
      [[0.06, 0.16], [0.055, 0.16], [0.045, 0.15], [0.03, 0.12]].forEach(([r, l], i) => {
        const c = mk(CYL(r, r * 0.85, l, 8), hairM, 0, y - l / 2, z - i * 0.02, g); c.rotation.x = -0.25 + i * 0.12;
        y -= l * 0.9; z -= 0.025;
      });
    }
    if (style === 'braidsL' || style === 'scarflong') {
      // longues tresses tout autour de l'arrière de la tête, avec une perle au bout
      const n = style === 'scarflong' ? 7 : 11, L = style === 'scarflong' ? 0.38 : 0.5;
      for (let k = 0; k < n; k++) {
        const th = (-0.5 + (k / (n - 1))) * Math.PI * 1.05;
        const rr = R0 * 0.92, bx = Math.sin(th) * rr, bz = -Math.cos(th) * rr * 0.95 - 0.01;
        const l = L * (0.85 + (k % 3) * 0.08);
        const b = mk(CYL(0.019, 0.014, l, 6), hairM, bx, -0.04 - l / 2, bz, g, false);
        b.rotation.set(-0.08, 0, Math.sin(th) * 0.12);
        if (accM) mk(SPH(0.022, 8, 6), accM, bx + Math.sin(th) * 0.02, -0.05 - l, bz, g, false);
      }
    }
    return g;
  }
  // une jupe évasée (sur le bassin, par-dessus le haut des jambes)
  function skirt(P, col) {
    const m = mat(col, { roughness: 0.6 });
    mk(geo('skirt2', () => new THREE.CylinderGeometry(0.225, 0.3, 0.27, 20, 1, false)), m, 0, -0.07, 0, P.hips).scale.z = 0.9;
    mk(TOR(0.205, 0.022, 6, 22), mat(0x22252c, { roughness: 0.5 }), 0, 0.06, 0, P.hips, false).rotation.x = Math.PI / 2;
  }
  // de petites lunettes rondes (Lionnel)
  function roundGlasses(hc, R0, frameM) {
    const gl = grp(0, 0.005, 0, hc);
    for (const sd of [-1, 1]) {
      const f = mk(TOR(0.055, 0.01, 6, 18), frameM, sd * 0.09, 0, R0 * 1.06, gl, false); f.rotation.y = sd * 0.3;
      const arm = mk(BOX(0.01, 0.01, 0.24), frameM, sd * 0.235, 0.02, 0.1, gl, false); arm.rotation.y = sd * 0.08;
    }
    mk(BOX(0.05, 0.01, 0.01), frameM, 0, 0.02, R0 * 1.09, gl, false);
    return gl;
  }

  /* ---------- Les PERSONNAGES NON JOUEURS (les personnes du parcours d'Oswel) ----------
     Même squelette et mêmes animations que les héros ; leur tenue (couleur), leur coiffure
     (hatType : cap, bun, scarf, band, short, hood, braids) et quelques détails viennent de OT.CHARACTERS. */
  const TONES = [0x5e3a22, 0x6b4128, 0x7a4a2c, 0x8a5a3a, 0x4e2f1c, 0x9a6a48, 0x6e4630];
  const hashName = (n) => { let h = 7; for (const c of String(n || '')) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; };
  BUILD.npc = (P, col, skin) => {
    const ch = (skin && skin.npc) || {};
    const h = hashName(ch.name);
    const hood = ch.hatType === 'hood';
    const tone = hood ? 0x15121a : TONES[h % TONES.length];
    // gants d'électricien qui s'illuminent (Win Black)
    let gloveM = null;
    if (ch.gloves) gloveM = new THREE.MeshStandardMaterial({ color: lin(ch.gloves), roughness: 0.55, emissive: lin(0x5fd4ff), emissiveIntensity: 0 });
    const pantsCol = [0x262a33, 0x2f2a26, 0x1f2a36, 0x33302c][h % 4];
    const fem = !!ch.female;
    const B = humanBase(P, col, { skin: tone, pants: hood ? 0x15121a : fem ? (ch.legs || 0x3a2a24) : pantsCol, shoe: fem ? (ch.shoes || [0xd8392b, 0x2a2420, 0xf2c230, 0xff8ac8][(h >> 3) % 4]) : [0xf0efe9, 0x2a2420, 0xd8392b, 0x3d8bff][(h >> 3) % 4], shoe2: 0x22252c, handMat: gloveM || undefined, topRough: 0.55 });
    const { torso, hc, R0 } = B;
    const hatM = mat(ch.hat || 0x1a120c, { roughness: 0.7 });
    const hairM = mat(ch.hair || 0x140e0a, { roughness: 0.92 });
    if (fem) {
      // une fille : cheveux longs, jupe, boucles d'oreilles, cils et rouge à lèvres
      const accM = mat(ch.accent || ch.hat || 0xf2c230, { roughness: 0.35, metalness: 0.3 });
      skirt(P, ch.skirt || (ch.apron ? 0x22252c : new THREE.Color(col).multiplyScalar(0.62).getHex()));
      for (const sd of [-1, 1]) mk(SPH(0.022, 8, 6), mat(0xf2c230, { metalness: 0.8, roughness: 0.25 }), sd * R0 * 0.99, -0.08, 0.01, hc, false);
      const st = ch.hairStyle || (ch.hatType === 'scarf' ? 'scarflong' : ch.hatType === 'bun' ? 'bunlong' : 'long');
      if (st !== 'scarflong') {
        longHair(hc, R0, st, hairM, accM);
        P.faceStyle = 'npcf';
      }
    }
    // tablier de restaurant (Nadia) et petit carnet de commandes
    if (ch.apron) {
      const ap = mat(ch.apron, { roughness: 0.7 });
      mk(BOX(0.3, 0.42, 0.02), ap, 0, 0.0, 0.19, torso, false);
      mk(BOX(0.12, 0.08, 0.022), mat(0x22252c, { roughness: 0.6 }), 0.05, -0.06, 0.2, torso, false);
      mk(BOX(0.012, 0.36, 0.01), ap, -0.12, 0.33, 0.13, torso, false).rotation.x = -0.3;
      mk(BOX(0.012, 0.36, 0.01), ap, 0.12, 0.33, 0.13, torso, false).rotation.x = -0.3;
      const pad = mk(BOX(0.1, 0.13, 0.015), mat(0xf4f1ea, { roughness: 0.9 }), 0, -0.03, 0.08, P.handL); pad.rotation.x = -1.0;
    }
    // l'architecte (Lionnel) : lunettes rondes, écharpe d'hiver (il vit au Canada), rouleau de plans sous le bras
    if (ch.glasses) roundGlasses(hc, R0, mat(0x1a1c21, { roughness: 0.4, metalness: 0.5 }));
    if (ch.scarfNeck) {
      const sc = mat(ch.scarfNeck, { roughness: 0.85 });
      mk(TOR(0.13, 0.045, 8, 18), sc, 0, 0.42, 0.01, torso, false).rotation.x = Math.PI / 2;
      mk(BOX(0.07, 0.22, 0.03), sc, 0.06, 0.29, 0.17, torso, false).rotation.z = 0.12;
      mk(BOX(0.072, 0.03, 0.032), mat(0xf4f1ea, { roughness: 0.85 }), 0.06, 0.24, 0.172, torso, false);
    }
    if (ch.prop === 'blueprint') {
      const roll = mk(CYL(0.035, 0.035, 0.42, 10), mat(0x3d7bd8, { roughness: 0.6 }), 0, 0.02, 0.03, P.handR);
      roll.rotation.set(Math.PI / 2 - 0.3, 0, 0.2);
      mk(CYL(0.037, 0.037, 0.03, 10), mat(0xf4f1ea), 0, 0.17, 0.0, roll, false);
    }
    const capHair = () => mk(geo('npcHair', () => new THREE.SphereGeometry(R0 * 1.03, 22, 12, 0, Math.PI * 2, 0, Math.PI * 0.42)), hairM, 0, 0.006, -0.01, hc);
    const hatGroup = grp(0, 0, 0, hc);
    // un col contrasté pour tout le monde
    mk(TOR(0.12, 0.03, 6, 18), mat(ch.hat || 0x22252c, { roughness: 0.6 }), 0, 0.41, 0, torso, false).rotation.x = Math.PI / 2;
    switch (fem && ch.hatType !== 'scarf' ? 'none' : ch.hatType) {
      case 'none': break;
      case 'cap': {
        capHair();
        mk(geo('npcCap', () => new THREE.SphereGeometry(R0 * 1.06, 22, 10, 0, Math.PI * 2, 0, Math.PI * 0.36)), hatM, 0, 0.03, -0.01, hatGroup);
        const v = mk(BOX(0.24, 0.022, 0.16), hatM, 0, 0.12, 0.3, hatGroup); v.rotation.x = 0.25;
        break;
      }
      case 'bun': {
        const hm = mat(ch.hat || 0x1a120c, { roughness: 0.85 });
        mk(geo('npcHairL', () => new THREE.SphereGeometry(R0 * 1.045, 22, 14, 0, Math.PI * 2, 0, Math.PI * 0.4)), hm, 0, 0.012, -0.02, hatGroup);
        mk(geo('npcHairB', () => new THREE.SphereGeometry(R0 * 1.04, 20, 12, Math.PI * 0.8, Math.PI * 1.4, Math.PI * 0.3, Math.PI * 0.45)), hm, 0, 0, -0.01, hatGroup);
        mk(SPH(0.11, 12, 10), hm, 0, 0.27, -0.12, hatGroup);
        mk(TOR(0.06, 0.018, 6, 14), mat(col, { roughness: 0.5 }), 0, 0.24, -0.1, hatGroup, false).rotation.x = -0.6;
        // longues mèches derrière
        mk(BOX(0.34, 0.2, 0.07), hm, 0, -0.12, -0.21, hatGroup);
        break;
      }
      case 'scarf': {
        if (ch.female) longHair(hc, R0, 'scarflong', hairM, mat(ch.accent || 0xf2c230, { roughness: 0.35, metalness: 0.3 }), true);
        mk(geo('npcScarf', () => new THREE.SphereGeometry(R0 * 1.07, 22, 14, 0, Math.PI * 2, 0, Math.PI * 0.4)), hatM, 0, 0.03, -0.01, hatGroup);
        mk(geo('npcScarfB', () => new THREE.SphereGeometry(R0 * 1.06, 20, 12, Math.PI * 0.85, Math.PI * 1.3, Math.PI * 0.3, Math.PI * 0.5)), hatM, 0, 0.01, -0.01, hatGroup);
        const rim = mk(TOR(R0 * 1.04, 0.03, 6, 26), hatM, 0, 0.1, 0.0, hatGroup, false); rim.rotation.x = Math.PI / 2 - 0.2;
        mk(SPH(0.08, 10, 8), hatM, 0.0, 0.2, -0.22, hatGroup);
        const k1 = mk(BOX(0.08, 0.16, 0.03), hatM, -0.04, 0.08, -0.27, hatGroup); k1.rotation.z = 0.4;
        const k2 = mk(BOX(0.08, 0.16, 0.03), hatM, 0.04, 0.08, -0.27, hatGroup); k2.rotation.z = -0.4;
        break;
      }
      case 'band': {
        capHair();
        mk(SPH(0.07, 8, 6), hairM, 0, 0.24, -0.02, hatGroup).scale.set(2.2, 0.9, 2);
        const b = mk(TOR(R0 * 1.02, 0.024, 6, 26), hatM, 0, 0.07, -0.01, hatGroup, false); b.rotation.x = Math.PI / 2 - 0.12;
        break;
      }
      case 'braids': {
        fullBraids(hc, R0, hairM, mat(ch.beads || 0xf2c230, { roughness: 0.3, metalness: 0.4 }));
        break;
      }
      case 'hood': {
        // La Rumeur : une capuche pointue et une longue cape
        const cone = mk(new THREE.ConeGeometry(R0 * 1.25, 0.62, 18, 1, true), mat(ch.hat || 0x111116, { roughness: 0.9, side: THREE.DoubleSide }), 0, 0.14, -0.02, hatGroup);
        mk(geo('npcHoodBack', () => new THREE.SphereGeometry(R0 * 1.12, 20, 12, Math.PI * 0.75, Math.PI * 1.5, 0, Math.PI * 0.75)), mat(ch.hat || 0x111116, { roughness: 0.9, side: THREE.DoubleSide }), 0, 0.0, -0.01, hatGroup);
        mk(BOX(0.44, 0.62, 0.05), mat(ch.color || 0x2a2a33, { roughness: 0.9 }), 0, 0.12, -0.2, torso);
        cone.scale.z = 0.95;
        break;
      }
      default: {
        capHair();
        if (ch.hatType === 'short') mk(SPH(0.07, 8, 6), mat(ch.hat || 0x140e0a, { roughness: 0.9 }), 0, 0.25, 0.02, hatGroup).scale.set(2.4, 0.6, 2.2);
      }
    }
    // veste usée par les étincelles (Win Black)
    if (ch.burns) {
      const burnM = new THREE.MeshBasicMaterial({ color: lin(0xff7a1a), toneMapped: false });
      [[0.1, 0.24, 0.185], [-0.13, 0.12, 0.19], [0.05, 0.05, 0.2], [-0.05, 0.3, 0.17], [0.15, 0.1, 0.17]].forEach(([x, y, z], i) => { const b = mk(SPH(0.012 + (i % 2) * 0.006, 6, 4), burnM, x, y, z, torso, false); b.scale.z = 0.3; });
      mk(BOX(0.016, 0.3, 0.012), mat(0x9aa3ad, { metalness: 0.8, roughness: 0.3 }), 0, 0.2, 0.188, torso, false);
    }
    // l'assistant : une tablette à la main (Valdes)
    if (ch.prop === 'tablet') {
      const tab = mk(BOX(0.2, 0.27, 0.02), mat(0x1a1a1f, { roughness: 0.4 }), 0.0, -0.02, 0.1, P.handR);
      tab.rotation.set(-0.9, 0, 0);
      const scr = mk(new THREE.PlaneGeometry(0.17, 0.23), new THREE.MeshBasicMaterial({ color: lin(0x5fd4ff), toneMapped: false, transparent: true, opacity: 0.85 }), 0, 0, 0.012, tab, false);
    }
    P.faceStyle = hood ? 'npchood' : ch.eyes ? 'npcglow' : fem ? 'npcf' : 'npc';
    P.hideHat = [hatGroup]; P.hideGlasses = [];
    P.height = 1.3;
    // les gants se chargent (BLACKOUT) puis redescendent doucement
    let lvl = 0, lastT = 0;
    if (gloveM) P.charge = (v) => { lvl = Math.max(lvl, v); };
    P.tick = (t) => {
      const dt = Math.min(0.1, Math.max(0, t - lastT)); lastT = t;
      if (gloveM) { lvl = Math.max(0, lvl - dt * 0.35); gloveM.emissiveIntensity = lvl * (1.6 + Math.sin(t * 40) * 0.6) + (Math.sin(t * 1.3) > 0.97 ? 0.8 : 0); }
    };
  };


  // FRANCK — le cousin d'Oswel : tout en rouge (sa couleur préférée), nattes sur toute la tête, pas de casquette
  BUILD.franck = (P, col) => {
    const B = humanBase(P, col, { skin: 0x6e4630, pants: 0x1c1d22, shoe: 0xf4f1ea, shoe2: 0xd42a2a, cuff: 0xf4f1ea });
    const { torso, hc, R0 } = B;
    const white = mat(0xf4f1ea, { roughness: 0.6 });
    const gold = mat(0xffd23f, { roughness: 0.3, metalness: 0.5 });
    // veste de survêtement : fermeture éclair, bandes blanches sur les manches, col montant
    mk(BOX(0.012, 0.34, 0.012), mat(0x1c1d22, { metalness: 0.6, roughness: 0.3 }), 0, 0.19, 0.195, torso, false);
    mk(TOR(0.12, 0.035, 6, 18), B.top, 0, 0.41, 0, torso, false).rotation.x = Math.PI / 2;
    for (const arm of [P.armL, P.armR]) for (const dz of [-0.03, 0.03]) mk(BOX(0.012, 0.25, 0.012), white, 0.062 * Math.sign(arm.position.x), -0.13, dz, arm, false);
    for (const sd of [-1, 1]) mk(BOX(0.012, 0.3, 0.012), white, sd * 0.075, -0.17, 0.0, sd < 0 ? P.legL : P.legR, false);
    // petite chaîne dorée
    mk(TOR(0.1, 0.008, 5, 22), gold, 0, 0.36, 0.06, torso, false).rotation.x = Math.PI / 2 + 0.5;
    fullBraids(hc, R0, mat(0x120c09, { roughness: 0.9 }), gold);
    P.faceStyle = 'franck';
    P.hideHat = []; P.hideGlasses = [];
    P.height = 1.32;
  };

  // VALDES — l'assistant de Win Black
  BUILD.valdes = (P, col) => {
    const B = humanBase(P, 0x2c313a, { skin: 0x744628, sleeve: col, cuff: 0x1f2028, pants: 0x3a3226, shoe: 0x5a3a22, shoe2: 0x22252c });
    const { torso, hc, R0 } = B;
    const dark = mat(0x1a1c21, { roughness: 0.5, metalness: 0.3 });
    const vest = mat(col, { roughness: 0.55 });
    const refl = mat(0xe8eef2, { roughness: 0.25, metalness: 0.4 });
    const leather = mat(0x5a3a22, { roughness: 0.7 });
    // gilet technique ouvert (couleur du joueur) avec bandes réfléchissantes et poches
    for (const sd of [-1, 1]) {
      const pan = mk(BOX(0.17, 0.34, 0.05), vest, sd * 0.1, 0.19, 0.165, torso); pan.rotation.y = -sd * 0.18;
      mk(BOX(0.172, 0.03, 0.052), refl, sd * 0.1, 0.12, 0.17, torso, false).rotation.y = -sd * 0.18;
      mk(BOX(0.172, 0.03, 0.052), refl, sd * 0.1, 0.26, 0.17, torso, false).rotation.y = -sd * 0.18;
      mk(BOX(0.07, 0.06, 0.03), vest, sd * 0.12, 0.05, 0.19, torso, false);
    }
    const back = mk(BOX(0.4, 0.34, 0.04), vest, 0, 0.19, -0.17, torso); back.scale.x = 1;
    mk(BOX(0.4, 0.03, 0.045), refl, 0, 0.22, -0.172, torso, false);
    // ceinture à outils : tournevis, pince
    const belt = mk(TOR(0.215, 0.026, 6, 22), leather, 0, 0.03, 0, torso, false); belt.rotation.x = Math.PI / 2; belt.scale.y = 0.84;
    mk(BOX(0.08, 0.1, 0.05), leather, 0.17, -0.01, 0.1, torso);
    mk(CYL(0.012, 0.012, 0.13, 6), mat(0xffcc33, { roughness: 0.4 }), 0.15, 0.04, 0.12, torso, false);
    mk(CYL(0.008, 0.008, 0.1, 6), refl, 0.19, 0.05, 0.12, torso, false);
    // la tablette dans la main gauche (écran lumineux)
    const tabM = new THREE.MeshBasicMaterial({ color: lin(0x5fd4ff), toneMapped: false, transparent: true, opacity: 0.85 });
    const tab = mk(BOX(0.18, 0.24, 0.018), dark, 0.0, -0.03, 0.09, P.handL); tab.rotation.set(-0.9, 0.2, 0);
    mk(new THREE.PlaneGeometry(0.155, 0.21), tabM, 0, 0, 0.011, tab, false);
    // cheveux courts + casquette avec lampe frontale
    mk(geo('valHair', () => new THREE.SphereGeometry(R0 * 1.03, 22, 12, 0, Math.PI * 2, 0, Math.PI * 0.42)), mat(0x120c09, { roughness: 0.9 }), 0, 0.006, -0.01, hc);
    const cap = grp(0, 0, 0, hc);
    const capM = mat(0x3a1a00, { roughness: 0.55 });
    mk(geo('valCap', () => new THREE.SphereGeometry(R0 * 1.06, 22, 10, 0, Math.PI * 2, 0, Math.PI * 0.36)), capM, 0, 0.03, -0.01, cap);
    const visor = mk(BOX(0.25, 0.022, 0.16), capM, 0, 0.12, 0.3, cap); visor.rotation.x = 0.25;
    const lamp = mk(CYL(0.035, 0.035, 0.04, 12), dark, 0, 0.19, 0.25, cap, false); lamp.rotation.x = Math.PI / 2 - 0.3;
    const lampM = new THREE.MeshBasicMaterial({ color: lin(0xfff4c8), toneMapped: false });
    mk(SPH(0.026, 10, 8), lampM, 0, 0.195, 0.272, cap, false);
    P.faceStyle = 'valdes';
    P.hideHat = [cap]; P.hideGlasses = [];
    P.height = 1.3;
    P.tick = (t) => { tabM.opacity = 0.7 + Math.sin(t * 3) * 0.12; };
  };

  BUILD.meka = (P, col) => {
    const armor = mat(col, { roughness: 0.38, metalness: 0.35 });
    const steel = mat(0x9aa4ae, { roughness: 0.3, metalness: 0.8 });
    const dark = mat(0x23262c, { roughness: 0.5, metalness: 0.5 });
    const haz = accentFor(col, 0xf2c230, 0xff6a2a);
    const hazM = mat(haz, { roughness: 0.4 });
    const core = accentFor(col, 0x39f0ff, 0x3cff9a);
    const hips = P.hips = grp(0, 0.34, 0, P.rig);
    const mkLeg = (x) => {
      const L = grp(x, 0, 0, hips);
      mk(CYL(0.1, 0.088, 0.24, 12), dark, 0, -0.12, 0, L);
      mk(SPH(0.085, 12, 8), steel, 0, -0.1, 0.06, L);
      mk(BOX(0.2, 0.12, 0.29), armor, 0, -0.28, 0.04, L);
      mk(BOX(0.205, 0.05, 0.08), hazM, 0, -0.3, 0.17, L, false);
      return L;
    };
    P.legL = mkLeg(-0.13); P.legR = mkLeg(0.13);
    const torso = P.torso = grp(0, 0, 0, hips);
    mk(CYL(0.27, 0.23, 0.38, 20), armor, 0, 0.2, 0, torso).scale.set(1.14, 1, 0.88);
    mk(BOX(0.34, 0.19, 0.06), steel, 0, 0.25, 0.215, torso);
    const coreM = glowM(core, 1.8);
    const cr = mk(CYL(0.055, 0.055, 0.03, 16), coreM, 0, 0.25, 0.25, torso, false); cr.rotation.x = Math.PI / 2;
    OT.Models.mats();
    mk(BOX(0.5, 0.07, 0.4), OT.Models.MAT.stripe, 0, 0.03, 0, torso);
    for (const s of [-1, 1]) {
      const p = mk(CYL(0.035, 0.04, 0.22, 10), steel, s * 0.12, 0.38, -0.22, torso); p.rotation.x = -0.2;
      mk(CYL(0.042, 0.042, 0.03, 10), dark, s * 0.12, 0.5, -0.245, torso, false);
    }
    const mkArm = (x, s) => {
      const A = grp(x, 0.33, 0, torso);
      mk(SPH(0.135, 14, 10), armor, 0, 0.02, 0, A);
      mk(CYL(0.072, 0.066, 0.24, 10), steel, 0, -0.15, 0, A);
      const H = grp(0, -0.31, 0, A);
      mk(BOX(0.16, 0.14, 0.16), dark, 0, 0, 0.01, H);
      mk(BOX(0.17, 0.04, 0.06), hazM, 0, 0.04, 0.06, H, false);
      return [A, H];
    };
    [P.armL, P.handL] = mkArm(-0.35); [P.armR, P.handR] = mkArm(0.35);
    const head = P.head = grp(0, 0.41, 0, torso);
    mk(CYL(0.09, 0.1, 0.08, 10), dark, 0, 0.02, 0, head, false);
    const hc = P.hc = grp(0, 0.17, 0, head);
    P.headR = 0.25;
    mk(CYL(0.25, 0.26, 0.24, 22), armor, 0, 0, 0, hc);
    mk(geo('mekaDome', () => new THREE.SphereGeometry(0.25, 22, 10, 0, Math.PI * 2, 0, Math.PI / 2)), armor, 0, 0.12, 0, hc);
    mk(CYL(0.262, 0.262, 0.035, 22), steel, 0, -0.1, 0, hc, false);
    for (const s of [-1, 1]) { const b = mk(CYL(0.06, 0.06, 0.05, 12), steel, s * 0.265, 0.0, 0, hc); b.rotation.z = Math.PI / 2; }
    const ant = grp(0.13, 0.3, -0.04, hc);
    mk(CYL(0.012, 0.012, 0.16, 6), steel, 0, 0.06, 0, ant, false);
    const tip = mk(SPH(0.03, 8, 6), glowM(0xff3020, 1.6), 0, 0.15, 0, ant, false);
    P.faceStyle = 'meka'; P.faceGlow = core;
    P.face = mk(new THREE.CylinderGeometry(0.258, 0.258, 0.15, 24, 1, true, -0.95, 1.9), new THREE.MeshBasicMaterial({ toneMapped: false }), 0, 0.01, 0, hc, false);
    P.accAnchor = grp(0, 0.04, 0, hc); P.accAnchor.scale.setScalar(1.06);
    P.backAnchor = grp(0, 0.26, -0.26, torso);
    P.bodyAnchor = grp(0, 0.2 - 0.42 * 1.08, 0, torso); P.bodyAnchor.scale.set(1.2, 1.05, 1.0);
    P.hideHat = [ant]; P.hideGlasses = [];
    P.height = 1.22;
    P.tick = (t) => { coreM.emissiveIntensity = 1.5 + Math.sin(t * 4) * 0.5; tip.visible = Math.sin(t * 5) > -0.3; };
  };

  BUILD.byte = (P, col) => {
    const hood = mat(col, { roughness: 0.6 });
    const frame = mat(0xe6e9ee, { roughness: 0.35, metalness: 0.2 });
    const dark = mat(0x22262e, { roughness: 0.5 });
    const jeans = mat(0x34425e, { roughness: 0.75 });
    const acc = accentFor(col, 0x3cff9a, 0xffcc33);
    const hips = P.hips = grp(0, 0.44, 0, P.rig);
    const mkLeg = (x) => {
      const L = grp(x, 0, 0, hips);
      mk(CYL(0.054, 0.047, 0.36, 10), jeans, 0, -0.18, 0, L);
      mk(SPH(0.075, 12, 8), dark, 0, -0.38, 0.04, L).scale.set(1, 0.6, 1.6);
      mk(BOX(0.12, 0.022, 0.2), glowM(acc, 1.2), 0, -0.415, 0.04, L, false);
      return L;
    };
    P.legL = mkLeg(-0.085); P.legR = mkLeg(0.085);
    const torso = P.torso = grp(0, 0, 0, hips);
    mk(CYL(0.165, 0.2, 0.33, 16), hood, 0, 0.165, 0, torso).scale.z = 0.8;
    mk(SPH(0.17, 16, 10), hood, 0, 0.31, 0, torso).scale.set(1, 0.42, 0.8);
    mk(geo('byteHood', () => new THREE.SphereGeometry(0.16, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.6)), hood, 0, 0.33, -0.1, torso).scale.set(1, 0.9, 0.8);
    for (const s of [-1, 1]) mk(CYL(0.008, 0.008, 0.1, 5), frame, s * 0.045, 0.27, 0.15, torso, false);
    mk(BOX(0.2, 0.08, 0.02), mat(new THREE.Color(col).multiplyScalar(0.7).getHex()), 0, 0.07, 0.16, torso, false);
    // le câble (une queue !) avec sa prise
    const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0.06, -0.15), new THREE.Vector3(0, -0.12, -0.32), new THREE.Vector3(0.08, -0.36, -0.42), new THREE.Vector3(0.16, -0.42, -0.58)]);
    mk(geo('byteCable', () => new THREE.TubeGeometry(curve, 18, 0.018, 6, false)), dark, 0, 0, 0, torso, false);
    mk(BOX(0.05, 0.04, 0.08), frame, 0.16, -0.42, -0.62, torso, false);
    const mkArm = (x) => {
      const A = grp(x, 0.3, 0, torso);
      mk(CYL(0.05, 0.045, 0.28, 10), hood, 0, -0.14, 0, A);
      const H = grp(0, -0.31, 0, A);
      mk(SPH(0.055, 10, 8), frame, 0, 0, 0, H);
      return [A, H];
    };
    [P.armL, P.handL] = mkArm(-0.2); [P.armR, P.handR] = mkArm(0.2);
    const head = P.head = grp(0, 0.37, 0, torso);
    mk(CYL(0.035, 0.04, 0.12, 8), dark, 0, 0.05, 0, head, false);
    const hc = P.hc = grp(0, 0.27, 0, head);
    P.headR = 0.22;
    mk(BOX(0.5, 0.36, 0.26), frame, 0, 0, 0, hc);
    mk(BOX(0.36, 0.26, 0.12), frame, 0, 0, -0.17, hc);
    for (const s of [-1, 1]) mk(BOX(0.04, 0.16, 0.14), dark, s * 0.265, -0.02, 0, hc);
    const ant = grp(0.17, 0.18, 0, hc);
    mk(CYL(0.01, 0.01, 0.16, 6), dark, 0, 0.08, 0, ant, false);
    const ledM = glowM(acc, 1.8);
    const led = mk(SPH(0.03, 8, 6), ledM, 0, 0.17, 0, ant, false);
    P.faceStyle = 'byte'; P.faceGlow = acc;
    P.face = mk(geo('byteScreen', () => new THREE.PlaneGeometry(0.43, 0.29)), new THREE.MeshBasicMaterial({ toneMapped: false }), 0, 0.005, 0.1305, hc, false);
    P.accAnchor = grp(0, 0.18 - 0.25, 0, hc);
    P.backAnchor = grp(0, 0.2, -0.2, torso);
    P.bodyAnchor = grp(0, 0.165 - 0.42 * 0.7, 0, torso); P.bodyAnchor.scale.set(0.72, 0.72, 0.7);
    P.hideHat = [ant]; P.hideGlasses = [];
    P.height = 1.3;
    P.tick = (t) => { ledM.emissiveIntensity = Math.sin(t * 6) > 0 ? 2.4 : 0.4; };
  };

  BUILD.nexa = (P, col) => {
    const suit = mat(col, { roughness: 0.35, metalness: 0.25 });
    const dark = mat(0x1b1730, { roughness: 0.45, metalness: 0.3 });
    const silver = mat(0xe8ebf4, { roughness: 0.25, metalness: 0.6 });
    const acc = accentFor(col, 0xff5ad8, 0x7af7ff);
    const gl = glowM(acc, 1.7);
    const hips = P.hips = grp(0, 0.42, 0, P.rig);
    const mkLeg = (x) => {
      const L = grp(x, 0, 0, hips);
      mk(CYL(0.058, 0.045, 0.32, 10), dark, 0, -0.16, 0, L);
      mk(BOX(0.012, 0.16, 0.012), gl, 0, -0.14, 0.055, L, false);
      mk(CYL(0.055, 0.075, 0.12, 10), silver, 0, -0.35, 0.01, L);
      const toe = mk(geo('nexaToe', () => new THREE.ConeGeometry(0.05, 0.12, 8)), silver, 0, -0.38, 0.08, L); toe.rotation.x = Math.PI / 2;
      return L;
    };
    P.legL = mkLeg(-0.085); P.legR = mkLeg(0.085);
    const torso = P.torso = grp(0, 0, 0, hips);
    mk(CYL(0.18, 0.14, 0.22, 16), suit, 0, 0.27, 0, torso).scale.z = 0.8;
    mk(CYL(0.13, 0.155, 0.16, 16), dark, 0, 0.08, 0, torso).scale.z = 0.8;
    mk(SPH(0.18, 16, 10), suit, 0, 0.37, 0, torso).scale.set(1, 0.4, 0.8);
    for (const s of [-1, 1]) mk(BOX(0.014, 0.24, 0.014), gl, s * 0.06, 0.2, 0.135, torso, false);
    mk(TOR(0.1, 0.025, 6, 16), silver, 0, 0.41, 0, torso).rotation.x = Math.PI / 2;
    mk(geo('nexaGem', () => new THREE.OctahedronGeometry(0.04)), gl, 0, 0.3, 0.15, torso, false);
    // rubans dans le dos
    const ribbons = [-1, 1].map((s) => { const r = grp(s * 0.06, 0.38, -0.12, torso); mk(BOX(0.06, 0.36, 0.012), suit, 0, -0.18, 0, r, false); mk(BOX(0.062, 0.05, 0.014), gl, 0, -0.35, 0, r, false); return r; });
    const mkArm = (x) => {
      const A = grp(x, 0.34, 0, torso);
      mk(SPH(0.085, 12, 8), silver, 0, 0.02, 0, A);
      mk(CYL(0.046, 0.04, 0.27, 10), suit, 0, -0.14, 0, A);
      const cf = mk(TOR(0.045, 0.014, 6, 12), gl, 0, -0.25, 0, A, false); cf.rotation.x = Math.PI / 2;
      const H = grp(0, -0.3, 0, A);
      mk(SPH(0.05, 10, 8), silver, 0, 0, 0, H);
      return [A, H];
    };
    [P.armL, P.handL] = mkArm(-0.215); [P.armR, P.handR] = mkArm(0.215);
    const head = P.head = grp(0, 0.42, 0, torso);
    mk(CYL(0.05, 0.06, 0.08, 10), dark, 0, 0.02, 0, head, false);
    const hc = P.hc = grp(0, 0.24, 0, head);
    const R0 = P.headR = 0.25;
    mk(SPH(R0, 26, 18), silver, 0, 0, 0, hc);
    const fins = [-1, 1].map((s) => { const f = mk(geo('nexaFin', () => new THREE.ConeGeometry(0.05, 0.34, 8)), gl, s * 0.17, 0.15, -0.1, hc, false); f.rotation.set(-1.15, 0, -s * 0.45); return f; });
    const halo = mk(TOR(0.2, 0.016, 6, 28), gl, 0, 0.4, 0, hc, false); halo.rotation.x = Math.PI / 2;
    P.faceStyle = 'nexa'; P.faceGlow = acc;
    P.face = mk(new THREE.SphereGeometry(R0 * 1.015, 28, 16, Math.PI / 2 - Math.PI * 0.36, Math.PI * 0.72, Math.PI * 0.28, Math.PI * 0.42), new THREE.MeshBasicMaterial({ toneMapped: false }), 0, 0, 0, hc, false);
    // un halo lumineux au sol (elle flotte)
    const pad = new THREE.Mesh(geo('nexaPad', () => new THREE.CircleGeometry(0.3, 24)), new THREE.MeshBasicMaterial({ color: lin(acc), transparent: true, opacity: 0.35, depthWrite: false, toneMapped: false }));
    pad.rotation.x = -Math.PI / 2; pad.position.y = 0.012; P.root.add(pad);
    P.accAnchor = grp(0, 0, 0, hc);
    P.backAnchor = grp(0, 0.24, -0.16, torso);
    P.bodyAnchor = grp(0, 0.2 - 0.42 * 0.66, 0, torso); P.bodyAnchor.scale.set(0.68, 0.7, 0.66);
    P.hideHat = [halo]; P.hideGlasses = [];
    P.hover = 0.05;
    P.height = 1.3;
    P.tick = (t) => {
      halo.rotation.z = t * 1.5; halo.position.y = 0.4 + Math.sin(t * 2) * 0.02;
      ribbons.forEach((r, i) => { r.rotation.x = 0.25 + Math.sin(t * 3 + i) * 0.15; r.rotation.z = Math.sin(t * 2.2 + i * 2) * 0.1; });
      pad.material.opacity = 0.25 + Math.sin(t * 3) * 0.08;
      fins.forEach((f) => { f.material.emissiveIntensity = 1.5 + Math.sin(t * 4) * 0.4; });
    };
  };

  /* ==================================================================
     PERFORMANCE : on FUSIONNE les petites pièces immobiles les unes par rapport aux autres
     (même parent, même matière) en un seul maillage. Un personnage passe d'environ 50 objets
     à dessiner à une quinzaine : beaucoup plus fluide, surtout à 4 joueurs + le public.
     Rien ne change à l'écran : les articulations (bras, jambes, tête…) restent séparées.
     ================================================================== */
  // matières « fusionnables » : opaques, sans texture, sans lumière propre → la couleur passe dans les sommets
  const vcCache = {};
  const vcMat = (metal, rough) => {
    const k = metal + ':' + rough;
    return vcCache[k] || (vcCache[k] = new THREE.MeshStandardMaterial({ vertexColors: true, metalness: metal, roughness: rough }));
  };
  const plainStd = (m) => m && m.isMeshStandardMaterial && !m.map && !m.transparent && m.side === THREE.FrontSide && (!m.emissive || m.emissive.getHex() === 0 || !m.emissiveIntensity);
  function mergeStatic(rootObj, skip) {
    const groups = new Map();
    // un objet « à garder » (casquette, lunettes, visage…) reste à part ; ses pièces à lui peuvent fusionner entre elles
    rootObj.traverse((o) => {
      if (!o.isMesh || o.children.length || !o.parent || skip.has(o)) return;
      const m = o.material;
      if (!m || Array.isArray(m) || m.transparent || !o.geometry || !o.geometry.attributes.position || !o.geometry.attributes.normal || !o.geometry.attributes.uv) return;
      // même parent + même « famille » de matière (métal / mat, rugosité arrondie) → un seul maillage coloré par sommet
      const k = plainStd(m) ? o.parent.uuid + '|vc|' + (m.metalness >= 0.5 ? 0.7 : m.metalness >= 0.2 ? 0.3 : 0.05) + '|' + Math.round(m.roughness * 4) / 4 : o.parent.uuid + '|' + m.uuid;
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k).push(o);
    });
    groups.forEach((list, k) => {
      const vc = k.includes('|vc|');
      if (list.length < 2) return;
      const parent = list[0].parent;
      const parts = list.map((o) => { o.updateMatrix(); const g = (o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone()); g.applyMatrix4(o.matrix); return { g, c: o.material.color }; });
      let n = 0; parts.forEach((q) => (n += q.g.attributes.position.count));
      const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), uv = new Float32Array(n * 2), col = vc ? new Float32Array(n * 3) : null;
      let at = 0;
      parts.forEach(({ g, c }) => {
        const cnt = g.attributes.position.count;
        pos.set(g.attributes.position.array, at * 3); nor.set(g.attributes.normal.array, at * 3); uv.set(g.attributes.uv.array, at * 2);
        if (col) for (let i = 0; i < cnt; i++) { col[(at + i) * 3] = c.r; col[(at + i) * 3 + 1] = c.g; col[(at + i) * 3 + 2] = c.b; }
        at += cnt; g.dispose();
      });
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
      geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
      if (col) geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
      geo.computeBoundingSphere();
      const m0 = list[0].material;
      const mesh = new THREE.Mesh(geo, vc ? vcMat(m0.metalness >= 0.5 ? 0.7 : m0.metalness >= 0.2 ? 0.3 : 0.05, Math.round(m0.roughness * 4) / 4) : m0);
      mesh.castShadow = list.some((o) => o.castShadow); mesh.receiveShadow = list.some((o) => o.receiveShadow);
      list.forEach((o) => parent.remove(o));
      parent.add(mesh);
    });
  }

  /* ==================================================================
     EFFETS (boutique) : une aura qui suit le personnage partout
     ================================================================== */
  function makeFx(id, P) {
    if (!id || id === 'aucun') return null;
    const g = new THREE.Group(); g.name = 'fx';
    const H = P.height;
    const basic = (hex, op = 1) => new THREE.MeshBasicMaterial({ color: lin(hex), toneMapped: false, transparent: op < 1, opacity: op, depthWrite: op >= 1 });
    let tick = null;
    if (id === 'etincelles' || id === 'pixels') {
      const n = id === 'pixels' ? 12 : 10;
      const cols = id === 'pixels' ? [0x3cff9a, 0x2fd3d3, 0xb6ff3a] : [0xff8a2b, 0xffd23f, 0xfff3c4];
      const bits = [];
      for (let i = 0; i < n; i++) {
        const m = new THREE.Mesh(BOX(id === 'pixels' ? 0.07 : 0.045, id === 'pixels' ? 0.07 : 0.045, id === 'pixels' ? 0.07 : 0.045), basic(cols[i % cols.length]));
        g.add(m); bits.push({ m, a: (i / n) * Math.PI * 2, r: 0.42 + (i % 3) * 0.08, h: 0.15 + (i / n) * H * 0.9, sp: 0.8 + (i % 4) * 0.25 });
      }
      tick = (t) => bits.forEach((b, i) => {
        const a = b.a + t * b.sp * (id === 'pixels' ? 0.6 : 1.6);
        const y = id === 'pixels' ? ((b.h + t * 0.35 * b.sp) % (H + 0.2)) : b.h + Math.sin(t * 3 + i) * 0.08;
        b.m.position.set(Math.cos(a) * b.r, y, Math.sin(a) * b.r);
        b.m.rotation.set(t * 2 + i, t * 3, 0);
        const tw = id === 'pixels' ? 1 : 0.6 + Math.abs(Math.sin(t * 9 + i * 1.7)) * 0.7;
        b.m.scale.setScalar(tw);
      });
    } else if (id === 'aura') {
      const r1 = new THREE.Mesh(TOR(0.5, 0.025, 6, 40), basic(0xff7ad1, 0.85)); r1.rotation.x = Math.PI / 2; r1.position.y = 0.05;
      const r2 = new THREE.Mesh(TOR(0.38, 0.018, 6, 36), basic(0x5ad1ff, 0.8)); r2.rotation.x = Math.PI / 2; r2.position.y = 0.09;
      const disc = new THREE.Mesh(geo('auradisc', () => new THREE.CircleGeometry(0.55, 32)), new THREE.MeshBasicMaterial({ color: lin(0xb78cff), transparent: true, opacity: 0.18, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
      disc.rotation.x = -Math.PI / 2; disc.position.y = 0.03;
      g.add(r1, r2, disc);
      tick = (t) => { r1.rotation.z = t * 1.5; r2.rotation.z = -t * 2.2; const k = 1 + Math.sin(t * 3) * 0.06; r1.scale.set(k, k, 1); disc.material.opacity = 0.14 + Math.sin(t * 3) * 0.06; r2.position.y = 0.09 + Math.abs(Math.sin(t * 1.5)) * 0.25; };
    } else if (id === 'orbite') {
      const coinM = mat(0xf2c230, { metalness: 0.85, roughness: 0.25, emissive: 0x6a4a00, emissiveIntensity: 0.5 });
      const coins = [0, 1, 2].map(() => { const c = new THREE.Mesh(geo('orbcoin', () => { const q = new THREE.CylinderGeometry(0.09, 0.09, 0.025, 18); q.rotateX(Math.PI / 2); return q; }), coinM); g.add(c); return c; });
      tick = (t) => coins.forEach((c, i) => { const a = t * 1.8 + (i * Math.PI * 2) / 3; c.position.set(Math.cos(a) * 0.55, H * 0.62 + Math.sin(a * 2) * 0.1, Math.sin(a) * 0.55); c.rotation.y = t * 4; });
    } else if (id === 'blackout') {
      // éclairs bleus qui crépitent, régénérés plusieurs fois par seconde
      const N = 5, SEG = 6;
      const pos = new Float32Array(N * SEG * 2 * 3);
      const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      const lines = new THREE.LineSegments(lg, new THREE.LineBasicMaterial({ color: lin(0x7fe6ff), toneMapped: false, transparent: true, opacity: 0.95 }));
      lines.frustumCulled = false;
      const ring = new THREE.Mesh(TOR(0.48, 0.02, 6, 40), basic(0x5fd4ff, 0.7)); ring.rotation.x = Math.PI / 2; ring.position.y = 0.04;
      const dark = new THREE.Mesh(geo('auradisc', () => new THREE.CircleGeometry(0.55, 32)), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.45, depthWrite: false }));
      dark.rotation.x = -Math.PI / 2; dark.position.y = 0.025;
      g.add(lines, ring, dark);
      let next = 0;
      const zap = () => {
        let k = 0;
        for (let b = 0; b < N; b++) {
          const a = Math.random() * Math.PI * 2, r = 0.3 + Math.random() * 0.25;
          let x = Math.cos(a) * r, y = 0.1 + Math.random() * H * 0.5, z = Math.sin(a) * r;
          for (let sgm = 0; sgm < SEG; sgm++) {
            const nx = x + (Math.random() - 0.5) * 0.18, ny = y + 0.06 + Math.random() * 0.14, nz = z + (Math.random() - 0.5) * 0.18;
            pos.set([x, y, z, nx, ny, nz], k); k += 6; x = nx; y = ny; z = nz;
          }
        }
        lg.attributes.position.needsUpdate = true;
      };
      zap();
      tick = (t) => { if (t > next || t < next - 1) { zap(); next = t + 0.06 + Math.random() * 0.1; } lines.material.opacity = Math.random() < 0.15 ? 0.2 : 0.95; ring.rotation.z = t * 2; };
    }
    return g.children.length ? { obj: g, tick } : null;
  }

  /* ==================================================================
     FABRIQUER UN PERSONNAGE
     skin = { color, acc, gad, char } · opts.marker = false pour cacher le repère
     ================================================================== */
  function build(id, skin, opts = {}) {
    const C = BY[id] || BUILD[id] ? id : 'oswel';
    const color = skin.color !== undefined ? skin.color : 0x3d8bff;
    const root = new THREE.Group();
    const P = { root, rig: grp(0, 0, 0, root), char: C };
    BUILD[C](P, color, skin);
    // fusion des pièces fixes (avant d'ajouter accessoire, gadget, effet : eux restent à part)
    mergeStatic(P.rig, new Set([P.face, ...(P.hideHat || []), ...(P.hideGlasses || []), ...(P.keep || [])].filter(Boolean)));
    const sideAnchor = grp(0, 0, 0, P.rig); sideAnchor.scale.setScalar(P.height / 1.1);
    // accessoire (sur la tête)
    const acc = OT.Models.accessory(skin.acc, color);
    if (acc) {
      P.accAnchor.add(acc);
      if (HATS.includes(skin.acc)) P.hideHat.forEach((m) => (m.visible = false));
      if (skin.acc === 'lunettes') P.hideGlasses.forEach((m) => (m.visible = false));
    }
    // gadget des mondes
    let gadTick = null;
    const gd = OT.Models.gadget(skin.gad);
    if (gd) {
      if (gd.at === 'hand') { gd.obj.position.set(0.01, 0.01, 0.09); gd.obj.rotation.x = 0.3; gd.obj.scale.setScalar(1.6); P.handR.add(gd.obj); }
      else if (gd.at === 'back') P.backAnchor.add(gd.obj);
      else if (gd.at === 'body') P.bodyAnchor.add(gd.obj);
      else sideAnchor.add(gd.obj);
      gadTick = gd.tick;
    }
    // effet (aura) choisi dans la boutique
    const fx = makeFx(skin.fx, P);
    if (fx) root.add(fx.obj);
    // repère coloré au-dessus (J1 / J2)
    let marker = null;
    if (opts.marker !== false) {
      marker = new THREE.Mesh(geo('marker', () => new THREE.ConeGeometry(0.09, 0.16, 4)), new THREE.MeshBasicMaterial({ color, toneMapped: false }));
      marker.rotation.x = Math.PI; marker.position.y = P.height + 0.32;
      root.add(marker);
    }
    // le visage
    const faceMat = P.face.material;
    let curFace = '';
    const glowCss = P.faceGlow ? '#' + P.faceGlow.toString(16).padStart(6, '0') : '';
    let glowOv = '';   // 1.5 : couleur des yeux imposée un instant (Tony : cyan pâle pendant un pouvoir)
    // (1.5) visage « lumineux » (Tony) : la texture sert aussi de lumière propre → les points brillent dans l'ombre
    if (P.faceEmissive) { faceMat.emissive = new THREE.Color(0xffffff); faceMat.emissiveIntensity = 1.15; }
    const setExpr = (e) => {
      if (e === curFace) return; curFace = e;
      faceMat.map = faceTex(P.faceStyle, e, glowOv || glowCss);
      if (P.faceEmissive) faceMat.emissiveMap = faceMat.map;
      faceMat.needsUpdate = !faceMat.userData.hadMap; faceMat.userData.hadMap = true;
    };
    setExpr('neutral');
    const setGlow = (css) => { if ((css || '') === glowOv) return; glowOv = css || ''; const c = curFace; curFace = ''; setExpr(c); };
    // performance : seules les grandes pièces font de l'ombre (les petits détails coûtent cher pour rien)
    root.traverse((o) => {
      if (!o.isMesh || !o.castShadow) return;
      if (!o.geometry.boundingSphere) o.geometry.computeBoundingSphere();
      const sc = o.scale ? Math.max(o.scale.x, o.scale.y, o.scale.z) : 1;
      if (o.geometry.boundingSphere.radius * sc < 0.09) o.castShadow = false;
    });
    const tick = (t) => { if (P.tick) P.tick(t); if (gadTick) gadTick(t); if (fx && fx.tick) fx.tick(t); };
    root.userData = {
      char: C, rig: P.rig, hips: P.hips, torso: P.torso, body: P.torso, head: P.head, hc: P.hc,
      legL: P.legL, legR: P.legR, armL: P.armL, armR: P.armR, handL: P.handL, handR: P.handR,
      face: P.face, setExpr, setGlow, marker, gadTick: tick, height: P.height, hover: P.hover || 0,
      // boutique : animation de victoire choisie (sinon celle du personnage) et émote
      winAnim: skin.win && skin.win !== 'perso' ? skin.win : null, emote: skin.emote || 'wave',
      charge: P.charge || null,
    };
    return root;
  }

  return { LIST, BY, build, faceTex, EXPR: Object.keys(EXPR), accentFor, merge: mergeStatic };
})();

/* =====================================================================
   OT.Anim — un contrôleur d'animation par personnage
   ctl.update(dt, { speed (0..1), ground, vy, stun, armL, armR, push })
   ctl.play('jump' | 'land' | 'hit' | 'death' | 'interact' | 'door' | 'pickup'
            | 'explosion' | 'trap' | 'celebrate' | 'wave' | 'laugh' | 'dance' | 'boss')
   ctl.loop('victory' | 'defeat' | 'dance' | null) · ctl.expr('happy', 1.2)
   ===================================================================== */
OT.Anim = (function () {
  const PERSO = {
    oswel: { bounce: 1, swing: 1, fidgets: ['look', 'wrist', 'stretch'], victory: 'fist', idleHead: 0.12, win: 'cool' },
    meka:  { bounce: 0.55, swing: 0.75, fidgets: ['knuckles', 'look', 'stomp'], victory: 'flex', idleHead: 0.06, win: 'happy' },
    byte:  { bounce: 1.25, swing: 1.1, fidgets: ['glitch', 'type', 'look'], victory: 'dance', idleHead: 0.16, win: 'cool' },
    nexa:  { bounce: 0.7, swing: 0.85, fidgets: ['float', 'look', 'spin'], victory: 'float', idleHead: 0.1, win: 'happy' },
    tony: { bounce: 0.6, swing: 0.8, fidgets: ['look', 'type', 'look', 'wrist'], victory: 'point', idleHead: 0.06, win: 'cool' },   // (1.5) calme et posé
    fredo: { bounce: 1.1, swing: 1.05, fidgets: ['groove', 'look', 'type'], victory: 'groove', idleHead: 0.16, win: 'happy' },
    valdes: { bounce: 0.9, swing: 0.95, fidgets: ['type', 'look', 'wrist'], victory: 'salute', idleHead: 0.12, win: 'happy' },
    npc: { bounce: 0.8, swing: 0.9, fidgets: ['look', 'wrist', 'stretch'], victory: 'fist', idleHead: 0.12, win: 'happy' },
    godlove: { bounce: 0.95, swing: 1.05, fidgets: ['heart', 'look', 'wave'], victory: 'heart', idleHead: 0.14, win: 'happy' },
    franck: { bounce: 1.05, swing: 1.0, fidgets: ['groove', 'look', 'wave'], victory: 'dance', idleHead: 0.14, win: 'happy' },
  };
  const DUR = { jump: 0.18, land: 0.22, hit: 0.45, death: 0.6, interact: 0.45, door: 0.5, pickup: 0.45, explosion: 0.75, trap: 0.6, celebrate: 1.4, wave: 1.6, laugh: 1.6, dance: 2.4, heart: 1.7, groove: 2.0, boss: 0.01, look: 2.2, wrist: 2.0, stretch: 1.6, knuckles: 1.4, stomp: 1.0, glitch: 0.9, type: 1.8, float: 1.8, spin: 1.2 };
  const FACE = { hit: ['angry', 1.1], death: ['dizzy', 1.2], interact: ['focus', 0.6], door: ['happy', 0.8], pickup: ['happy', 0.9], explosion: ['scared', 1.3], trap: ['scared', 1.1], celebrate: ['happy', 1.4], wave: ['happy', 1.6], laugh: ['laugh', 1.6], dance: ['happy', 2.4], heart: ['happy', 1.7], groove: ['happy', 2.0], boss: ['determined', 2.2], glitch: ['dizzy', 0.6], stretch: ['blink', 0.8], wrist: ['focus', 1.2] };
  const KEYS = ['legL', 'legR', 'armLx', 'armRx', 'armLz', 'armRz', 'torsoX', 'torsoY', 'torsoZ', 'headX', 'headY', 'headZ', 'rigY', 'rigSX', 'rigSY'];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const env = (k, a = 0.2, r = 0.35) => (k < a ? k / a : k > 1 - r ? Math.max(0, (1 - k) / r) : 1);

  function create(model) {
    const ud = model.userData;
    const C = PERSO[ud.char] || PERSO.oswel;
    const st = { t: Math.random() * 10, walk: 0, idle: 0, one: null, loop: null, over: null, overT: 0, blinkT: 1 + Math.random() * 3, spin: 0, nextFid: 4 + Math.random() * 4 };
    const cur = {}; KEYS.forEach((k) => (cur[k] = k === 'rigSX' || k === 'rigSY' ? 1 : 0));
    const T = {};
    const ctl = {
      play(name, o = {}) {
        st.one = { name, t: 0, dur: o.dur || DUR[name] || 0.5 };
        if (FACE[name]) ctl.expr(FACE[name][0], o.faceDur || FACE[name][1]);
        if (name === 'death') st.spin = 0;
      },
      loop(name) { st.loop = name; if (!name) st.spin = 0; },
      // l'émote choisie dans la boutique (salut, fou rire, danse…)
      emote() { ctl.play(ud.emote || 'wave'); },
      expr(name, dur = 1) { st.over = name; st.overT = dur; },
      // version 1.4 : parler pendant « dur » secondes (bouche, petits hochements de tête, gestes)
      talk(dur = 2) { st.talkT = Math.max(st.talkT || 0, dur); st.talkPh = Math.random() * 6; },
      stopTalk() { st.talkT = 0; },
      get state() { return st; },
      update(dt, p = {}) {
        st.t += dt;
        KEYS.forEach((k) => (T[k] = k === 'rigSX' || k === 'rigSY' ? 1 : 0));
        T.armLz = -0.1; T.armRz = 0.1;
        const s = clamp(p.speed || 0, 0, 1.3);
        const ground = p.ground !== false;
        let face = 'neutral';
        // ----- déplacement -----
        if (ground) {
          if (s > 0.06) {
            // la cadence des pas suit la vraie vitesse (les pieds ne « patinent » pas)
            st.walk += dt * (6 + 17 * s);
            const sw = Math.sin(st.walk), amp = Math.min(1.05, 0.38 + 0.52 * s) * C.swing;
            T.legL = sw * amp; T.legR = -sw * amp;
            const bend = s > 0.7 ? -0.45 : 0;               // en course : bras pliés, buste penché
            T.armLx = -sw * amp * 0.95 + bend; T.armRx = sw * amp * 0.95 + bend;
            T.torsoX = 0.05 + 0.24 * s; T.torsoY = sw * 0.1 * s;
            T.rigY = Math.abs(Math.cos(st.walk)) * 0.04 * C.bounce * (0.5 + s);
            T.headX = -0.06 * s;
            if (st.idle > 0) { st.idle = 0; st.nextFid = 4 + Math.random() * 4; }
          } else {
            st.idle += dt;
            T.rigSY = 1 + Math.sin(st.t * 2.2) * 0.012;
            T.headY = Math.sin(st.t * 0.45) * C.idleHead;
            T.armLz = -0.1 - Math.sin(st.t * 1.6) * 0.03; T.armRz = 0.1 + Math.sin(st.t * 1.6) * 0.03;
            // petite animation d'attente, propre à chacun
            if (!st.one && !st.loop && st.idle > st.nextFid) { ctl.play(C.fidgets[Math.floor(Math.random() * C.fidgets.length)]); st.nextFid = st.idle + 5 + Math.random() * 5; }
          }
        } else {
          st.idle = 0;
          if ((p.vy || 0) > 0.5) { T.armLx = -2.5; T.armRx = -2.15; T.legL = -0.75; T.legR = 0.45; T.torsoX = -0.06; T.rigSY = 1.04; }
          else {
            const f = Math.sin(st.t * 17) * 0.25;
            T.armLz = -1.05 - f; T.armRz = 1.05 + f; T.armLx = -0.5; T.armRx = -0.5;
            T.legL = -0.35 + Math.sin(st.t * 13) * 0.3; T.legR = 0.25 - Math.sin(st.t * 13) * 0.3; T.torsoX = 0.1;
            if ((p.vy || 0) < -14) face = 'scared';
          }
        }
        if (p.push) { T.armLx = T.armRx = -1.45; T.armLz = -0.05; T.armRz = 0.05; T.torsoX = 0.32; }
        if (p.stun) { T.headZ = Math.sin(st.t * 10) * 0.28; T.headX = 0.18; T.armLx = 0.15; T.armRx = 0.15; face = 'dizzy'; }
        // ----- boucles : victoire, défaite, danse -----
        const L = st.loop;
        if (L === 'victory' || L === 'dance') {
          const v = L === 'dance' ? 'dance' : ud.winAnim || C.victory, t = st.t;
          face = L === 'dance' ? 'happy' : (Math.floor(t * 0.7) % 2 ? C.win : 'happy');
          if (v === 'fist') { T.armRx = -2.9 + Math.sin(t * 11) * 0.3; T.armRz = 0.25; T.armLx = -0.3; T.armLz = -0.5; T.rigY = Math.abs(Math.sin(t * 5.5)) * 0.14; T.torsoZ = Math.sin(t * 5.5) * 0.06; }
          else if (v === 'flex') { T.armLz = -1.5; T.armRz = 1.5; T.armLx = -0.25 + Math.sin(t * 8) * 0.25; T.armRx = -0.25 - Math.sin(t * 8) * 0.25; T.rigY = Math.abs(Math.sin(t * 4)) * 0.06; T.torsoX = -0.12; T.legL = -0.2; T.legR = 0.2; }
          else if (v === 'dance') { const b = Math.sin(t * 9); T.armLx = -2.4 - b * 0.4; T.armRx = -0.6 + b * 0.5; T.armLz = -0.4; T.armRz = 0.6; T.legL = b * 0.35; T.legR = -b * 0.35; T.torsoY = b * 0.35; T.headZ = b * 0.18; T.rigY = Math.abs(b) * 0.08; }
          else if (v === 'point') { const b = Math.abs(Math.sin(t * 4)); T.armRx = -3.0; T.armRz = 0.12; T.armLx = 0.25; T.armLz = -0.75; T.headX = -0.22; T.rigY = b * 0.07; T.torsoZ = -0.06; }
          else if (v === 'groove') { const b = Math.sin(t * 10); T.headX = 0.12 + b * 0.18; T.armLx = -1.1 + b * 0.5; T.armRx = -1.1 - b * 0.5; T.armLz = -0.3; T.armRz = 0.3; T.legL = Math.max(0, b) * 0.3; T.legR = Math.max(0, -b) * 0.3; T.rigY = Math.abs(b) * 0.06; T.torsoY = b * 0.15; }
          else if (v === 'salute') { const b = Math.abs(Math.sin(t * 4.5)); T.armRx = -2.35; T.armRz = -0.95; T.armLx = -1.5 + Math.sin(t * 9) * 0.15; T.armLz = 0.2; T.headX = -0.12; T.rigY = b * 0.06; T.torsoX = -0.05; }
          else if (v === 'heart') { const b = Math.sin(t * 5); T.armLx = -2.75; T.armRx = -2.75; T.armLz = 0.42; T.armRz = -0.42; T.rigY = Math.abs(b) * 0.1; T.headZ = Math.sin(t * 2.5) * 0.14; T.torsoY = Math.sin(t * 2.5) * 0.12; T.legL = b * 0.12; T.legR = -b * 0.12; }
          else if (v === 'float') { T.rigY = 0.28 + Math.sin(t * 2.5) * 0.06; T.armLz = -1.25; T.armRz = 1.25; T.legL = -0.25; T.legR = 0.15; st.spin += dt * 3.2; }
        } else if (L === 'defeat') { T.torsoX = 0.42; T.headX = 0.5; T.armLx = 0.18; T.armRx = 0.18; T.armLz = -0.02; T.armRz = 0.02; T.rigSY = 0.97; face = 'sad'; }
        // ----- gestes ponctuels -----
        const O = st.one;
        if (O) {
          O.t += dt;
          const k = clamp(O.t / O.dur, 0, 1), e = env(k);
          switch (O.name) {
            case 'jump': T.rigSY = 1 + 0.12 * (1 - k); T.rigSX = 1 - 0.06 * (1 - k); break;
            case 'land': T.rigSY = 1 - 0.2 * (1 - k); T.rigSX = 1 + 0.12 * (1 - k); T.armLz = -0.7 * (1 - k); T.armRz = 0.7 * (1 - k); break;
            case 'hit': T.torsoX = -0.45 * e; T.headX = -0.3 * e; T.armLx = -1.2 * e; T.armRx = -1.7 * e; T.armLz = -0.6 * e; T.armRz = 0.4 * e; T.rigY += 0.05 * e; break;
            case 'death': T.rigY = Math.sin(k * Math.PI) * 0.6; st.spin = k * Math.PI * 4; T.rigSX = T.rigSY = 1 - 0.55 * k; T.armLx = T.armRx = -2.6; T.armLz = -0.6; T.armRz = 0.6; break;
            case 'interact': T.armRx = -1.55 * e; T.torsoX = 0.15 * e; T.headX = 0.1 * e; break;
            case 'door': T.armLx = T.armRx = -1.5 * e; T.torsoX = 0.28 * e; break;
            case 'pickup': T.rigY += Math.sin(k * Math.PI) * 0.16; T.armLx = T.armRx = -2.7 * e; T.armLz = -0.3 * e; T.armRz = 0.3 * e; break;
            case 'explosion': T.torsoX = -0.6 * e; T.armLx = T.armRx = -2.5 * e; T.armLz = -0.7 * e; T.armRz = 0.7 * e; T.legL = -0.5 * e; T.legR = 0.5 * e; break;
            case 'trap': T.rigY += Math.sin(k * Math.PI) * 0.25; T.armLx = T.armRx = -2.9 * e; T.armLz = -0.5 * e; T.armRz = 0.5 * e; T.headX = -0.2 * e; break;
            case 'celebrate': T.armLx = T.armRx = -2.9 * e; T.armLz = -0.4; T.armRz = 0.4; T.rigY += Math.abs(Math.sin(k * Math.PI * 3)) * 0.18 * e; break;
            case 'wave': T.armRx = -2.6 * e; T.armRz = (0.5 + Math.sin(k * Math.PI * 10) * 0.35) * e; T.headZ = 0.12 * e; break;
            case 'laugh': T.torsoX = (0.25 + Math.sin(k * 60) * 0.06) * e; T.armLx = T.armRx = -0.7 * e; T.armLz = 0.25 * e; T.armRz = -0.25 * e; T.headX = -0.2 * e; break;
            case 'groove': { const b = Math.sin(k * Math.PI * 12); T.headX = (0.12 + b * 0.2) * e; T.armLx = (-1.1 + b * 0.5) * e; T.armRx = (-1.1 - b * 0.5) * e; T.rigY += Math.abs(b) * 0.05 * e; T.torsoY = b * 0.15 * e; break; }
            case 'heart': T.armLx = T.armRx = -2.6 * e; T.armLz = 0.45 * e; T.armRz = -0.45 * e; T.headZ = 0.16 * e; T.rigY += Math.abs(Math.sin(k * Math.PI * 4)) * 0.05 * e; break;
            case 'dance': { const b = Math.sin(k * Math.PI * 10); T.armLx = (-2.4 - b * 0.4) * e; T.armRx = (-0.6 + b * 0.5) * e; T.legL = b * 0.35 * e; T.legR = -b * 0.35 * e; T.torsoY = b * 0.35 * e; T.rigY += Math.abs(b) * 0.08 * e; break; }
            // attentes
            case 'look': T.headY = Math.sin(k * Math.PI * 2) * 0.75 * e; T.headX = -0.05; break;
            case 'wrist': T.armLx = -1.35 * e; T.armLz = 0.55 * e; T.headX = 0.35 * e; T.headY = -0.35 * e; break;
            case 'stretch': T.armLx = T.armRx = -3.0 * e; T.armLz = -0.2 * e; T.armRz = 0.2 * e; T.rigSY = 1 + 0.05 * e; T.torsoX = -0.1 * e; break;
            case 'knuckles': T.armLx = T.armRx = -1.25 * e; T.armLz = (0.35 + Math.sin(k * 30) * 0.08) * e; T.armRz = (-0.35 - Math.sin(k * 30) * 0.08) * e; break;
            case 'stomp': T.legL = (k < 0.5 ? -0.9 * Math.sin(k * Math.PI * 2) : 0); T.rigY += k > 0.5 && k < 0.6 ? -0.02 : 0; break;
            case 'glitch': T.headZ = (Math.random() - 0.5) * 0.4 * e; T.headY = (Math.random() - 0.5) * 0.4 * e; break;
            case 'type': T.armLx = (-1.0 + Math.sin(k * 70) * 0.08) * e; T.armRx = (-1.0 - Math.sin(k * 70 + 1) * 0.08) * e; T.headX = 0.25 * e; break;
            case 'float': T.rigY += Math.sin(k * Math.PI) * 0.22; T.armLz = -0.9 * e; T.armRz = 0.9 * e; break;
            case 'spin': st.spin = k * Math.PI * 2; T.armLz = -1.1 * e; T.armRz = 1.1 * e; break;
          }
          if (k >= 1) { st.one = null; if (O.name !== 'death' && L !== 'victory' && L !== 'dance') st.spin = 0; }
        }
        // ----- il parle : tête qui hoche, petite main qui explique (version 1.4) -----
        let talkMouth = false;
        if (st.talkT > 0) {
          st.talkT -= dt; st.talkPh += dt;
          const ph = st.talkPh;
          T.headX += Math.sin(ph * 7.3) * 0.05; T.headY += Math.sin(ph * 1.7) * 0.12; T.headZ += Math.sin(ph * 2.3) * 0.04;
          if (!st.one && s < 0.06 && ground) { const g = Math.max(0, Math.sin(ph * 1.3)); T.armRx = -0.55 * g + T.armRx * (1 - g); T.armRz = 0.25 * g + T.armRz * (1 - g); }
          // la bouche s'ouvre et se ferme comme des syllabes (pas tout à fait régulier)
          talkMouth = Math.sin(ph * 15) + Math.sin(ph * 9.7) * 0.6 > 0.15;
        }
        // ----- les bras forcés par un jeu (pousser, ouvrir un coffre…) -----
        if (p.armL !== undefined) { T.armLx = p.armL; T.armLz = -0.05; }
        if (p.armR !== undefined) { T.armRx = p.armR; T.armRz = 0.05; }
        // ----- visage : émotion forcée > état > clignement -----
        if (st.over) { st.overT -= dt; face = st.over; if (st.overT <= 0) st.over = null; }
        if (p.face && !st.over) face = p.face;
        st.blinkT -= dt;
        if (st.blinkT < 0) { st.blinkT = 2 + Math.random() * 3.5; }
        if ((face === 'neutral' || face === 'focus' || face === 'determined') && st.blinkT < 0.12) face = 'blink';
        if (talkMouth && (face === 'neutral' || face === 'blink' || face === 'happy' || face === 'focus' || face === 'determined')) face = 'talk';
        ud.setExpr(face);
        // ----- lissage et application -----
        const kk = Math.min(1, dt * 22);   // les membres suivent vite (pas de mollesse)
        KEYS.forEach((k) => (cur[k] += (T[k] - cur[k]) * kk));
        ud.legL.rotation.x = cur.legL; ud.legR.rotation.x = cur.legR;
        ud.armL.rotation.x = cur.armLx; ud.armL.rotation.z = cur.armLz;
        ud.armR.rotation.x = cur.armRx; ud.armR.rotation.z = cur.armRz;
        ud.torso.rotation.set(cur.torsoX, cur.torsoY, cur.torsoZ);
        ud.head.rotation.set(cur.headX, cur.headY, cur.headZ);
        ud.rig.position.y = cur.rigY + (ud.hover ? ud.hover + Math.sin(st.t * 2.4) * 0.02 : 0);
        ud.rig.rotation.y = st.spin;
        ud.rig.scale.set(cur.rigSX, cur.rigSY, cur.rigSX);
        if (ud.gadTick) ud.gadTick(st.t);
      },
    };
    return ctl;
  }
  return { create, PERSO };
})();
