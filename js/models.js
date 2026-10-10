/* =====================================================================
   OSWEL'S TRAP — models.js
   Tous les MODÈLES 3D et TEXTURES, partagés entre le jeu (game.js)
   et les images d'aperçu des mondes (previews.js) :
     - textures dessinées en code (aucune image à télécharger)
     - blocs biseautés, pics, pièces, portes
     - le héros (avec couleurs et accessoires de la boutique)
     - les personnages (PNJ) avec leur nom au-dessus de la tête
     - engrenages et étiquettes de texte
   ===================================================================== */

window.OT = window.OT || {};

OT.Models = (function () {
  const TEX = {};
  const MAT = {};
  const rnd = (a, b) => a + Math.random() * (b - a);
  const FONT = '"Chakra Petch", "Segoe UI", sans-serif';

  /* ---------- Textures ---------- */
  function canvasTex(w, h, draw, repeat) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    draw(c.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(c);
    t.encoding = THREE.sRGBEncoding;
    t.anisotropy = 4;
    if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
    return t;
  }

  function buildTextures() {
    if (TEX.plate) return TEX;
    // Plaque d'acier propre : léger dégradé, joint fin, deux rivets
    TEX.plate = canvasTex(128, 128, (g, s) => {
      const gr = g.createLinearGradient(0, 0, 0, s);
      gr.addColorStop(0, '#77695d'); gr.addColorStop(1, '#5a4e44');
      g.fillStyle = gr; g.fillRect(0, 0, s, s);
      g.globalAlpha = 0.07;
      for (let i = 0; i < 60; i++) { g.fillStyle = i % 2 ? '#fff' : '#000'; g.fillRect(0, rnd(0, s), s, 1); }
      g.globalAlpha = 1;
      g.fillStyle = 'rgba(0,0,0,0.45)'; g.fillRect(0, s - 3, s, 3); g.fillRect(s - 3, 0, 3, s);
      g.fillStyle = 'rgba(255,255,255,0.12)'; g.fillRect(0, 0, s, 2); g.fillRect(0, 0, 2, s);
      g.fillStyle = '#a39383';
      [[14, 14], [s - 16, 14]].forEach(([x, y]) => { g.beginPath(); g.arc(x, y, 4, 0, 7); g.fill(); });
    }, true);
    // Dessus des blocs (là où on marche) : acier brossé plus clair
    TEX.top = canvasTex(128, 32, (g, w, h) => {
      g.fillStyle = '#8a7c6e'; g.fillRect(0, 0, w, h);
      g.globalAlpha = 0.1;
      for (let i = 0; i < 90; i++) { g.fillStyle = i % 2 ? '#fff' : '#000'; g.fillRect(rnd(0, w), rnd(0, h), rnd(8, 40), 1); }
      g.globalAlpha = 1;
    }, true);
    // Rouille fissurée (blocs qui s'effondrent)
    TEX.rust = canvasTex(128, 128, (g, s) => {
      const gr = g.createLinearGradient(0, 0, s, s);
      gr.addColorStop(0, '#9a5326'); gr.addColorStop(1, '#6e3514');
      g.fillStyle = gr; g.fillRect(0, 0, s, s);
      for (let i = 0; i < 120; i++) { g.fillStyle = `rgba(${rnd(150, 200)},${rnd(80, 110)},30,0.25)`; g.beginPath(); g.arc(rnd(0, s), rnd(0, s), rnd(2, 6), 0, 7); g.fill(); }
      g.strokeStyle = 'rgba(30,10,0,0.8)'; g.lineWidth = 3;
      g.beginPath(); g.moveTo(24, 0); g.lineTo(52, 48); g.lineTo(42, 90); g.lineTo(70, 128); g.stroke();
      g.beginPath(); g.moveTo(52, 48); g.lineTo(110, 36); g.stroke();
    }, true);
    // Bandes jaunes et noires
    TEX.stripe = canvasTex(128, 128, (g, s) => {
      g.fillStyle = '#f2c230'; g.fillRect(0, 0, s, s);
      g.fillStyle = '#1b1b1b';
      for (let i = -s; i < s * 2; i += 40) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + 20, 0); g.lineTo(i - s + 20, s); g.lineTo(i - s, s); g.fill(); }
    }, true);
    // Sol électrique
    TEX.elec = canvasTex(128, 128, (g, s) => {
      g.fillStyle = '#1b2230'; g.fillRect(0, 0, s, s);
      g.strokeStyle = '#4aa8ff'; g.lineWidth = 3;
      g.beginPath(); g.moveTo(0, s / 2);
      for (let x = 0; x <= s; x += 16) g.lineTo(x, s / 2 + (x / 16 % 2 ? -14 : 14));
      g.stroke();
      g.strokeStyle = 'rgba(74,168,255,0.35)'; g.lineWidth = 2; g.strokeRect(6, 6, s - 12, s - 12);
    }, true);
    // Faux mur
    TEX.fake = canvasTex(128, 128, (g, s) => {
      g.drawImage(TEX.plate.image, 0, 0);
      g.fillStyle = '#d23a2a'; g.fillRect(8, 42, s - 16, 44);
      g.fillStyle = '#fff'; g.font = `700 16px ${FONT}`; g.textAlign = 'center';
      g.fillText('NE PAS', s / 2, 61); g.fillText('OUVRIR', s / 2, 80);
    });
    // Faux sol fissuré
    TEX.crack = canvasTex(128, 128, (g, s) => {
      g.drawImage(TEX.plate.image, 0, 0);
      g.strokeStyle = 'rgba(15,8,4,0.7)'; g.lineWidth = 2;
      g.beginPath(); g.moveTo(40, 0); g.lineTo(58, 30); g.lineTo(50, 60); g.lineTo(72, 96); g.lineTo(64, 128); g.stroke();
    });
    // Fond de l'atelier : dégradé chaud de forge
    TEX.forgeSky = canvasTex(16, 256, (g, w, h) => {
      const gr = g.createLinearGradient(0, 0, 0, h);
      gr.addColorStop(0, '#0e0a09'); gr.addColorStop(0.55, '#24150f'); gr.addColorStop(0.85, '#4a2412'); gr.addColorStop(1, '#6a3010');
      g.fillStyle = gr; g.fillRect(0, 0, w, h);
    });
    // Grands panneaux du mur du fond
    TEX.wall = canvasTex(256, 256, (g, s) => {
      g.fillStyle = '#2a1e18'; g.fillRect(0, 0, s, s);
      g.strokeStyle = 'rgba(0,0,0,0.5)'; g.lineWidth = 4;
      g.strokeRect(2, 2, s - 4, s - 4);
      g.strokeStyle = 'rgba(255,190,120,0.06)'; g.lineWidth = 2;
      g.strokeRect(10, 10, s - 20, s - 20);
      g.fillStyle = 'rgba(255,200,140,0.08)';
      [[20, 20], [s - 20, 20], [20, s - 20], [s - 20, s - 20]].forEach(([x, y]) => { g.beginPath(); g.arc(x, y, 5, 0, 7); g.fill(); });
    }, true);
    // Rayon de lumière (dégradé transparent)
    TEX.shaft = canvasTex(64, 256, (g, w, h) => {
      const gr = g.createLinearGradient(0, 0, 0, h);
      gr.addColorStop(0, 'rgba(255,190,120,0.55)'); gr.addColorStop(1, 'rgba(255,190,120,0)');
      g.fillStyle = gr; g.fillRect(0, 0, w, h);
      const gx = g.createLinearGradient(0, 0, w, 0);
      gx.addColorStop(0, 'rgba(0,0,0,1)'); gx.addColorStop(0.5, 'rgba(0,0,0,0)'); gx.addColorStop(1, 'rgba(0,0,0,1)');
      g.globalCompositeOperation = 'destination-out'; g.fillStyle = gx; g.fillRect(0, 0, w, h);
    });
    // Portail de la porte (animé en décalant la texture)
    TEX.portal = canvasTex(64, 256, (g, w, h) => {
      for (let y = 0; y < h; y++) {
        const k = 0.5 + 0.5 * Math.sin((y / h) * Math.PI * 6);
        g.fillStyle = `rgb(${Math.round(40 + 60 * k)},${Math.round(200 + 55 * k)},${Math.round(150 + 60 * k)})`;
        g.fillRect(0, y, w, 1);
      }
    }, true);
    // ---- Thème « Le Code » (Monde 2) ----
    TEX.codePlate = canvasTex(128, 128, (g, s) => {
      const gr = g.createLinearGradient(0, 0, 0, s); gr.addColorStop(0, '#13204a'); gr.addColorStop(1, '#0b1433');
      g.fillStyle = gr; g.fillRect(0, 0, s, s);
      g.strokeStyle = 'rgba(47,243,255,0.35)'; g.lineWidth = 2;
      for (let i = 16; i < s; i += 32) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, s); g.moveTo(0, i); g.lineTo(s, i); g.stroke(); }
      g.strokeStyle = '#2ff3ff'; g.lineWidth = 3; g.strokeRect(3, 3, s - 6, s - 6);
      g.fillStyle = 'rgba(47,243,255,0.5)'; g.font = '700 14px monospace';
      g.fillText(['01', '10', '{}', '</>', '=>', '0x'][Math.floor(Math.random() * 6)], 10, s - 12);
    }, true);
    TEX.codeTop = canvasTex(128, 32, (g, w, h) => {
      g.fillStyle = '#1d3a7a'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#2ff3ff'; g.fillRect(0, 0, w, 3);
      g.globalAlpha = 0.25; for (let x = 0; x < w; x += 8) { g.fillStyle = x % 16 ? '#2ff3ff' : '#ff3fb4'; g.fillRect(x, 6, 4, h - 10); } g.globalAlpha = 1;
    }, true);
    TEX.corrupt = canvasTex(128, 128, (g, s) => {
      g.fillStyle = '#2a0a2a'; g.fillRect(0, 0, s, s);
      for (let i = 0; i < 70; i++) { g.fillStyle = ['#ff3fb4', '#2ff3ff', '#ffe66d', '#7a1a6a'][i % 4]; g.globalAlpha = 0.6; g.fillRect(rnd(0, s), rnd(0, s), rnd(4, 30), rnd(3, 8)); }
      g.globalAlpha = 1; g.strokeStyle = '#ff3fb4'; g.lineWidth = 4; g.strokeRect(2, 2, s - 4, s - 4);
    }, true);
    TEX.codeSky = canvasTex(16, 256, (g, w, h) => {
      const gr = g.createLinearGradient(0, 0, 0, h);
      gr.addColorStop(0, '#02030c'); gr.addColorStop(0.6, '#07123a'); gr.addColorStop(1, '#13306e');
      g.fillStyle = gr; g.fillRect(0, 0, w, h);
    });
    TEX.ice = canvasTex(128, 32, (g, w, h) => { g.fillStyle = '#ff5a6a'; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(255,255,255,0.45)'; for (let x = 0; x < w; x += 22) g.fillRect(x, 4, 10, 3); });
    TEX.bounce = canvasTex(128, 32, (g, w, h) => { g.fillStyle = '#3a7bff'; g.fillRect(0, 0, w, h); g.strokeStyle = '#bfe0ff'; g.lineWidth = 3; g.beginPath(); for (let x = 0; x <= w; x += 8) g.lineTo(x, x % 16 ? 8 : 22); g.stroke(); });
    // ---- Thème « Le Laboratoire » (Monde 3) : carrelage blanc, joints turquoise ----
    TEX.labPlate = canvasTex(128, 128, (g, s) => {
      const gr = g.createLinearGradient(0, 0, 0, s); gr.addColorStop(0, '#e9f1f2'); gr.addColorStop(1, '#c9d7da');
      g.fillStyle = gr; g.fillRect(0, 0, s, s);
      g.strokeStyle = '#7fb3b8'; g.lineWidth = 3;
      for (let i = 0; i <= s; i += 64) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, s); g.moveTo(0, i); g.lineTo(s, i); g.stroke(); }
      g.fillStyle = 'rgba(0,0,0,0.12)'; g.fillRect(0, s - 4, s, 4);
    }, true);
    TEX.labTop = canvasTex(128, 32, (g, w, h) => { g.fillStyle = '#9fd9d6'; g.fillRect(0, 0, w, h); g.fillStyle = '#1f8f8a'; g.fillRect(0, 0, w, 4); g.globalAlpha = 0.15; for (let x = 0; x < w; x += 16) { g.fillStyle = '#fff'; g.fillRect(x, 8, 8, h - 12); } g.globalAlpha = 1; }, true);
    TEX.labCrack = canvasTex(128, 128, (g, s) => {
      g.fillStyle = '#d9c9a3'; g.fillRect(0, 0, s, s);
      g.strokeStyle = '#6b5a3a'; g.lineWidth = 3;
      g.beginPath(); g.moveTo(10, 20); g.lineTo(50, 60); g.lineTo(40, 100); g.moveTo(50, 60); g.lineTo(110, 70); g.lineTo(120, 120); g.stroke();
      g.strokeStyle = '#ffb000'; g.lineWidth = 6; g.strokeRect(3, 3, s - 6, s - 6);
    }, true);
    TEX.labSky = canvasTex(16, 256, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#0e2a33'); gr.addColorStop(0.6, '#1f5a63'); gr.addColorStop(1, '#8fd3cf'); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
    TEX.belt = canvasTex(128, 32, (g, w, h) => {
      g.fillStyle = '#1b1f24'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#ffd23a';
      for (let x = 0; x < w; x += 32) { g.beginPath(); g.moveTo(x + 6, 6); g.lineTo(x + 20, h / 2); g.lineTo(x + 6, h - 6); g.lineTo(x + 12, h / 2); g.closePath(); g.fill(); }
    }, true);
    TEX.acid = canvasTex(64, 64, (g, s) => { const gr = g.createLinearGradient(0, 0, 0, s); gr.addColorStop(0, '#b6ff3a'); gr.addColorStop(1, '#2f8a00'); g.fillStyle = gr; g.fillRect(0, 0, s, s); g.fillStyle = 'rgba(255,255,255,0.4)'; for (let i = 0; i < 10; i++) { g.beginPath(); g.arc(rnd(0, s), rnd(0, s), rnd(2, 5), 0, 7); g.fill(); } }, true);
    // ---- Thème « Nexus » (Monde 4) : cristal violet, bords lumineux ----
    TEX.nexPlate = canvasTex(128, 128, (g, s) => {
      const gr = g.createLinearGradient(0, 0, s, s); gr.addColorStop(0, '#3a1f6e'); gr.addColorStop(1, '#1b0f3a');
      g.fillStyle = gr; g.fillRect(0, 0, s, s);
      g.strokeStyle = 'rgba(190,140,255,0.5)'; g.lineWidth = 2;
      g.beginPath(); g.moveTo(0, s * 0.3); g.lineTo(s * 0.5, 0); g.moveTo(s * 0.2, s); g.lineTo(s, s * 0.4); g.stroke();
      g.strokeStyle = '#c78bff'; g.lineWidth = 4; g.strokeRect(2, 2, s - 4, s - 4);
    }, true);
    TEX.nexTop = canvasTex(128, 32, (g, w, h) => { const gr = g.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, '#ff7ad1'); gr.addColorStop(0.5, '#b78cff'); gr.addColorStop(1, '#5ad1ff'); g.fillStyle = gr; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(255,255,255,0.6)'; g.fillRect(0, 0, w, 3); }, true);
    TEX.cloud = canvasTex(128, 128, (g, s) => { g.fillStyle = '#efe8ff'; g.fillRect(0, 0, s, s); for (let i = 0; i < 18; i++) { g.fillStyle = `rgba(${rnd(200, 255)},${rnd(190, 230)},255,0.6)`; g.beginPath(); g.arc(rnd(0, s), rnd(0, s), rnd(12, 30), 0, 7); g.fill(); } }, true);
    TEX.nexSky = canvasTex(16, 256, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#05010f'); gr.addColorStop(0.5, '#2a0f4a'); gr.addColorStop(1, '#7a2f7a'); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
    // ---- Thème « OSWEL City » (Monde 5) : béton, asphalte, chantier ----
    TEX.cityPlate = canvasTex(128, 128, (g, s) => {
      g.fillStyle = '#8b8f94'; g.fillRect(0, 0, s, s);
      g.globalAlpha = 0.18; for (let i = 0; i < 400; i++) { g.fillStyle = i % 2 ? '#fff' : '#000'; g.fillRect(rnd(0, s), rnd(0, s), 2, 2); } g.globalAlpha = 1;
      g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(0, s - 4, s, 4); g.fillRect(s / 2 - 1, 0, 2, s);
    }, true);
    TEX.cityTop = canvasTex(128, 32, (g, w, h) => { g.fillStyle = '#3a3d42'; g.fillRect(0, 0, w, h); g.fillStyle = '#f2c230'; for (let x = 0; x < w; x += 48) g.fillRect(x + 6, h / 2 - 2, 26, 4); }, true);
    TEX.scaffold = canvasTex(128, 128, (g, s) => { g.fillStyle = '#c98a3a'; g.fillRect(0, 0, s, s); g.strokeStyle = '#7a4f1a'; g.lineWidth = 4; for (let y = 0; y < s; y += 32) { g.beginPath(); g.moveTo(0, y); g.lineTo(s, y); g.stroke(); } g.strokeStyle = '#2a2a2a'; g.lineWidth = 8; g.beginPath(); g.moveTo(0, 0); g.lineTo(s, s); g.stroke(); }, true);
    TEX.citySky = canvasTex(16, 256, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#1a1030'); gr.addColorStop(0.45, '#6a2f5a'); gr.addColorStop(0.75, '#ff7a3a'); gr.addColorStop(1, '#ffd28a'); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
    TEX.windows = canvasTex(64, 128, (g, w, h) => { g.fillStyle = '#20232b'; g.fillRect(0, 0, w, h); for (let y = 6; y < h; y += 14) for (let x = 6; x < w; x += 14) { g.fillStyle = Math.random() < 0.55 ? '#ffd28a' : '#2d3340'; g.fillRect(x, y, 8, 8); } }, true);
    return TEX;
  }

  /* ---------- Matériaux ---------- */
  function mats() {
    if (MAT.plate) return MAT;
    buildTextures();
    MAT.plate = new THREE.MeshStandardMaterial({ map: TEX.plate, roughness: 0.55, metalness: 0.45 });
    MAT.top = new THREE.MeshStandardMaterial({ map: TEX.top, roughness: 0.45, metalness: 0.55 });
    MAT.rust = new THREE.MeshStandardMaterial({ map: TEX.rust, roughness: 0.85, metalness: 0.2 });
    MAT.stripe = new THREE.MeshStandardMaterial({ map: TEX.stripe, roughness: 0.5 });
    MAT.elec = new THREE.MeshStandardMaterial({ map: TEX.elec, emissive: 0x2a7dff, emissiveIntensity: 0, roughness: 0.4, metalness: 0.4 });
    MAT.spike = new THREE.MeshStandardMaterial({ color: 0xd8dde3, metalness: 0.9, roughness: 0.22 });
    MAT.dark = new THREE.MeshStandardMaterial({ color: 0x241d19, roughness: 0.8, metalness: 0.4 });
    MAT.brass = new THREE.MeshStandardMaterial({ color: 0xc8963e, metalness: 0.85, roughness: 0.32 });
    MAT.steel = new THREE.MeshStandardMaterial({ color: 0x9aa2ab, metalness: 0.9, roughness: 0.28 });
    MAT.red = new THREE.MeshStandardMaterial({ color: 0xd23a2a, roughness: 0.45 });
    MAT.gold = new THREE.MeshStandardMaterial({ color: 0xffcc33, emissive: 0x6a4500, emissiveIntensity: 0.6, metalness: 1, roughness: 0.25 });
    MAT.ghostCoin = new THREE.MeshStandardMaterial({ color: 0x9fc8ff, emissive: 0x2a4a80, emissiveIntensity: 0.4, transparent: true, opacity: 0.35, metalness: 0.5, roughness: 0.4 });
    MAT.glowGreen = new THREE.MeshStandardMaterial({ color: 0x3cff9a, emissive: 0x3cff9a, emissiveIntensity: 1.4 });
    MAT.glowOrange = new THREE.MeshStandardMaterial({ color: 0xffa040, emissive: 0xff7a1a, emissiveIntensity: 1.8 });
    MAT.glowBlue = new THREE.MeshStandardMaterial({ color: 0x7fd0ff, emissive: 0x2a8dff, emissiveIntensity: 1.6, transparent: true, opacity: 0.8 });
    MAT.platM = new THREE.MeshStandardMaterial({ color: 0xa7b0ba, metalness: 0.8, roughness: 0.3 });
    MAT.platN = new THREE.MeshStandardMaterial({ color: 0xe0ac3e, metalness: 0.8, roughness: 0.3 });
    MAT.eye = new THREE.MeshBasicMaterial({ color: 0xffffff });
    MAT.visor = new THREE.MeshStandardMaterial({ color: 0x14181f, metalness: 0.6, roughness: 0.15 });
    MAT.skin = new THREE.MeshStandardMaterial({ color: 0x5b3a26, roughness: 0.65 });
    // Monde 2
    MAT.codePlate = new THREE.MeshStandardMaterial({ map: TEX.codePlate, emissiveMap: TEX.codePlate, emissive: 0xffffff, emissiveIntensity: 0.35, roughness: 0.4, metalness: 0.5 });
    MAT.codeTop = new THREE.MeshStandardMaterial({ map: TEX.codeTop, emissiveMap: TEX.codeTop, emissive: 0xffffff, emissiveIntensity: 0.45, roughness: 0.35, metalness: 0.5 });
    MAT.corrupt = new THREE.MeshStandardMaterial({ map: TEX.corrupt, emissiveMap: TEX.corrupt, emissive: 0xffffff, emissiveIntensity: 0.5, roughness: 0.6 });
    MAT.glitch = new THREE.MeshStandardMaterial({ color: 0x2ff3ff, emissive: 0x2ff3ff, emissiveIntensity: 0.6, transparent: true, opacity: 0.85, roughness: 0.3 });
    MAT.tag = new THREE.MeshStandardMaterial({ color: 0x7affd0, emissive: 0x2fffa0, emissiveIntensity: 0.8, transparent: true, opacity: 0.9 });
    MAT.ice = new THREE.MeshStandardMaterial({ map: TEX.ice, emissiveMap: TEX.ice, emissive: 0xffffff, emissiveIntensity: 0.3, roughness: 0.1, metalness: 0.3 });
    MAT.iceSide = new THREE.MeshStandardMaterial({ color: 0x8a1a2a, roughness: 0.3 });
    MAT.bounce = new THREE.MeshStandardMaterial({ map: TEX.bounce, emissiveMap: TEX.bounce, emissive: 0xffffff, emissiveIntensity: 0.3, roughness: 0.5 });
    MAT.bounceSide = new THREE.MeshStandardMaterial({ color: 0x1a2a6a, roughness: 0.5 });
    MAT.bridge = new THREE.MeshStandardMaterial({ color: 0xffe66d, emissive: 0xffb000, emissiveIntensity: 0.6, transparent: true, opacity: 0.9 });
    MAT.compiled = new THREE.MeshStandardMaterial({ color: 0x9dff8a, emissive: 0x3aff3a, emissiveIntensity: 0.5, transparent: true, opacity: 1 });
    // Monde 3
    MAT.labPlate = new THREE.MeshStandardMaterial({ map: TEX.labPlate, roughness: 0.35, metalness: 0.1 });
    MAT.labTop = new THREE.MeshStandardMaterial({ map: TEX.labTop, emissiveMap: TEX.labTop, emissive: 0xffffff, emissiveIntensity: 0.15, roughness: 0.3 });
    MAT.labCrack = new THREE.MeshStandardMaterial({ map: TEX.labCrack, roughness: 0.6 });
    MAT.belt = new THREE.MeshStandardMaterial({ map: TEX.belt, emissiveMap: TEX.belt, emissive: 0xffffff, emissiveIntensity: 0.25, roughness: 0.6 });
    MAT.beltSide = new THREE.MeshStandardMaterial({ color: 0x3a4048, metalness: 0.6, roughness: 0.4 });
    MAT.acid = new THREE.MeshStandardMaterial({ map: TEX.acid, emissiveMap: TEX.acid, emissive: 0xffffff, emissiveIntensity: 0.7, transparent: true, opacity: 0.88, roughness: 0.1 });
    MAT.laser = new THREE.MeshBasicMaterial({ color: 0xff2a3a, transparent: true, opacity: 0.9, toneMapped: false });
    MAT.glass = new THREE.MeshStandardMaterial({ color: 0xbfefff, transparent: true, opacity: 0.25, roughness: 0.05, metalness: 0.1 });
    // Monde 4
    MAT.nexPlate = new THREE.MeshStandardMaterial({ map: TEX.nexPlate, emissiveMap: TEX.nexPlate, emissive: 0xffffff, emissiveIntensity: 0.3, roughness: 0.25, metalness: 0.3 });
    MAT.nexTop = new THREE.MeshStandardMaterial({ map: TEX.nexTop, emissiveMap: TEX.nexTop, emissive: 0xffffff, emissiveIntensity: 0.4, roughness: 0.25 });
    MAT.cloud = new THREE.MeshStandardMaterial({ map: TEX.cloud, roughness: 0.9 });
    MAT.onA = new THREE.MeshStandardMaterial({ color: 0xff4fb0, emissive: 0xff2a90, emissiveIntensity: 0.6, transparent: true, opacity: 1, roughness: 0.3 });
    MAT.onB = new THREE.MeshStandardMaterial({ color: 0x3fd8ff, emissive: 0x1aa8ff, emissiveIntensity: 0.6, transparent: true, opacity: 1, roughness: 0.3 });
    // Monde 5
    MAT.cityPlate = new THREE.MeshStandardMaterial({ map: TEX.cityPlate, roughness: 0.85 });
    MAT.cityTop = new THREE.MeshStandardMaterial({ map: TEX.cityTop, roughness: 0.7 });
    MAT.scaffold = new THREE.MeshStandardMaterial({ map: TEX.scaffold, roughness: 0.7 });
    return MAT;
  }

  /* ---------- Bloc biseauté (une rangée de n tuiles) ----------
     ExtrudeGeometry : la face avant reçoit la plaque, les côtés (dont le dessus) l'acier brossé */
  const geoCache = {};
  function slabGeo(n, h = 1, depth = 1.8) {
    const key = n + ':' + h + ':' + depth;
    if (geoCache[key]) return geoCache[key];
    const r = 0.07;
    const s = new THREE.Shape();
    s.moveTo(r, 0); s.lineTo(n - r, 0); s.quadraticCurveTo(n, 0, n, r);
    s.lineTo(n, h - r); s.quadraticCurveTo(n, h, n - r, h);
    s.lineTo(r, h); s.quadraticCurveTo(0, h, 0, h - r);
    s.lineTo(0, r); s.quadraticCurveTo(0, 0, r, 0);
    const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.03, bevelSegments: 2, curveSegments: 3 });
    g.translate(0, 0, -depth / 2);
    geoCache[key] = g;
    return g;
  }

  /* ---------- Étiquette de texte (nette, haute résolution) ---------- */
  function label(text, opt = {}) {
    const fs = (opt.size || 40) * 2;
    const c = document.createElement('canvas');
    const g = c.getContext('2d');
    const font = `${opt.weight || 700} ${fs}px ${FONT}`;
    g.font = font;
    const pad = fs * 0.5;
    const tw = Math.ceil(g.measureText(text).width);
    c.width = tw + pad * 2 + (opt.key ? fs * 1.4 : 0);
    c.height = Math.round(fs * 1.6);
    g.font = font;
    if (opt.bg !== 'none') {
      g.fillStyle = opt.bg || 'rgba(14,11,9,0.88)';
      roundRect(g, 0, 0, c.width, c.height, c.height * 0.28); g.fill();
      if (opt.border) { g.strokeStyle = opt.border; g.lineWidth = 5; roundRect(g, 2.5, 2.5, c.width - 5, c.height - 5, c.height * 0.26); g.stroke(); }
    }
    let x = pad;
    if (opt.key) {
      // la touche à appuyer, dans une petite case
      const kw = fs * 1.15;
      g.fillStyle = opt.keyBg || '#ffd28a';
      roundRect(g, pad * 0.6, c.height * 0.18, kw, c.height * 0.64, 10); g.fill();
      g.fillStyle = '#1a120c';
      g.font = `700 ${opt.key.length > 2 ? fs * 0.42 : fs * 0.7}px ${FONT}`;
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(opt.key, pad * 0.6 + kw / 2, c.height / 2 + 2);
      g.textAlign = 'left'; g.font = font;
      x = pad * 0.6 + kw + fs * 0.3;
    }
    g.fillStyle = opt.color || '#f3ead9';
    g.textBaseline = 'middle';
    g.fillText(text, x, c.height / 2 + 3);
    const t = new THREE.CanvasTexture(c);
    t.encoding = THREE.sRGBEncoding;
    t.anisotropy = 4;
    const h = opt.h || 0.36;
    const m = new THREE.Mesh(new THREE.PlaneGeometry((h * c.width) / c.height, h), new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, toneMapped: false }));
    m.renderOrder = 10;
    return m;
  }
  function roundRect(g, x, y, w, h, r) {
    g.beginPath(); g.moveTo(x + r, y); g.lineTo(x + w - r, y); g.quadraticCurveTo(x + w, y, x + w, y + r);
    g.lineTo(x + w, y + h - r); g.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    g.lineTo(x + r, y + h); g.quadraticCurveTo(x, y + h, x, y + h - r);
    g.lineTo(x, y + r); g.quadraticCurveTo(x, y, x + r, y); g.closePath();
  }

  /* ---------- Engrenage ---------- */
  function gear(r, teeth, mat, thick = 0.3) {
    const shape = new THREE.Shape();
    const inner = r, outer = r + 0.22;
    for (let i = 0; i < teeth; i++) {
      const a0 = (i / teeth) * Math.PI * 2, a1 = ((i + 0.25) / teeth) * Math.PI * 2, a2 = ((i + 0.5) / teeth) * Math.PI * 2, a3 = ((i + 0.75) / teeth) * Math.PI * 2;
      const P = (a, rr) => [Math.cos(a) * rr, Math.sin(a) * rr];
      if (i === 0) shape.moveTo(...P(a0, inner));
      shape.lineTo(...P(a1, outer)); shape.lineTo(...P(a2, outer)); shape.lineTo(...P(a3, inner));
      shape.lineTo(...P(((i + 1) / teeth) * Math.PI * 2, inner));
    }
    const hole = new THREE.Path(); hole.absarc(0, 0, r * 0.3, 0, Math.PI * 2, true);
    shape.holes.push(hole);
    const geo = new THREE.ExtrudeGeometry(shape, { depth: thick, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 1, curveSegments: 8 });
    geo.translate(0, 0, -thick / 2);
    return new THREE.Mesh(geo, mat);
  }

  /* ---------- Pièce (monnaie) ---------- */
  const coinGeo = () => (geoCache.coin = geoCache.coin || (() => { const g = new THREE.CylinderGeometry(0.28, 0.28, 0.07, 28); g.rotateX(Math.PI / 2); return g; })());
  const coinRimGeo = () => (geoCache.coinRim = geoCache.coinRim || new THREE.TorusGeometry(0.22, 0.025, 6, 24));
  function coin(ghost) {
    mats();
    const g = new THREE.Group();
    const m = ghost ? MAT.ghostCoin : MAT.gold;
    const disc = new THREE.Mesh(coinGeo(), m);
    const rim = new THREE.Mesh(coinRimGeo(), m); rim.position.z = 0.04;
    g.add(disc, rim);
    disc.castShadow = !ghost;
    return g;
  }

  /* ---------- Porte de sortie (vraie ou fausse : elles se ressemblent) ---------- */
  function door(text) {
    mats();
    const g = new THREE.Group();
    const post = new THREE.BoxGeometry(0.22, 2.1, 0.5);
    const l = new THREE.Mesh(post, MAT.dark); l.position.set(-0.62, 1.05, 0);
    const r = l.clone(); r.position.x = 0.62;
    const top = new THREE.Mesh(new THREE.BoxGeometry(1.46, 0.26, 0.55), MAT.dark); top.position.y = 2.15;
    const trim = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.06, 0.58), MAT.glowOrange); trim.position.y = 2.0;
    const portalTex = TEX.portal.clone(); portalTex.needsUpdate = true;
    const portal = new THREE.Mesh(new THREE.PlaneGeometry(1.02, 1.95), new THREE.MeshBasicMaterial({ map: portalTex, transparent: true, opacity: 0.92, toneMapped: false }));
    portal.position.set(0, 0.98, 0.05);
    [l, r, top].forEach((m) => (m.castShadow = true));
    const lab = label(text || 'SORTIE', { size: 30, h: 0.26, color: '#3cff9a', bg: 'rgba(0,0,0,0.75)' });
    lab.position.set(0, 2.55, 0.3);
    g.add(l, r, top, trim, portal, lab);
    g.userData = { portal, portalTex };
    return g;
  }

  /* ---------- Le héros (Oswel / l'Écho) ----------
     skin = { color: 0x3d8bff, acc: 'casquette' } */
  function hero(skin, opts = {}) {
    // les personnages jouables (OSWEL, MEKA, BYTE, NEXA) sont dans chars.js
    if (OT.Chars) return OT.Chars.build(skin.char || 'oswel', skin, opts);
    mats();
    const color = skin.color;
    const g = new THREE.Group();
    // toneMapped: false garde des couleurs vives et franches pour le héros
    const bodyMat = new THREE.MeshStandardMaterial({ color, roughness: 0.45, metalness: 0.05, toneMapped: false });
    const darkMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(color).multiplyScalar(0.45), roughness: 0.6 });
    // corps (une goutte arrondie)
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.27, 24, 18), bodyMat);
    body.scale.set(1, 1.08, 0.85); body.position.y = 0.42; body.castShadow = true;
    const belt = new THREE.Mesh(new THREE.TorusGeometry(0.245, 0.03, 8, 24), MAT.dark);
    belt.rotation.x = Math.PI / 2; belt.position.y = 0.33; belt.scale.set(1, 0.85, 1);
    // tête-casque avec visière et yeux lumineux
    const head = new THREE.Group(); head.position.y = 0.84;
    const skull = new THREE.Mesh(new THREE.SphereGeometry(0.25, 24, 18), bodyMat); skull.castShadow = true;
    // la visière couvre l'avant de la tête (phi = π/2 correspond à l'avant, +z)
    const visor = new THREE.Mesh(new THREE.SphereGeometry(0.255, 24, 12, Math.PI * 0.12, Math.PI * 0.76, Math.PI * 0.32, Math.PI * 0.34), MAT.visor);
    visor.position.z = 0.0;
    const eyeGeo = new THREE.BoxGeometry(0.05, 0.1, 0.02);
    const eyeL = new THREE.Mesh(eyeGeo, MAT.eye); eyeL.position.set(-0.07, 0.01, 0.255);
    const eyeR = eyeL.clone(); eyeR.position.x = 0.07;
    head.add(skull, visor, eyeL, eyeR);
    // jambes et bras
    const legGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.2, 8);
    const footGeo = new THREE.SphereGeometry(0.085, 10, 8);
    const mkLeg = (x) => { const lg = new THREE.Group(); const c = new THREE.Mesh(legGeo, darkMat); c.position.y = -0.08; const f = new THREE.Mesh(footGeo, MAT.dark); f.scale.set(1, 0.6, 1.3); f.position.set(0, -0.18, 0.02); lg.add(c, f); lg.position.set(x, 0.22, 0); return lg; };
    const legL = mkLeg(-0.11), legR = mkLeg(0.11);
    const armGeo = new THREE.CylinderGeometry(0.055, 0.05, 0.24, 8);
    const mkArm = (x) => { const a = new THREE.Group(); const m = new THREE.Mesh(armGeo, bodyMat); m.position.y = -0.1; a.add(m); a.position.set(x, 0.55, 0); return a; };
    const armL = mkArm(-0.3), armR = mkArm(0.3);
    g.add(body, belt, head, legL, legR, armL, armR);
    // accessoire
    const acc = accessory(skin.acc, color);
    if (acc) head.add(acc);
    // gadget des mondes (main droite, dos, sur le corps ou compagnon qui flotte)
    let gadTick = null;
    const gd = gadget(skin.gad);
    if (gd) {
      if (gd.at === 'hand') { gd.obj.position.set(0.01, -0.21, 0.09); gd.obj.rotation.x = 0.3; gd.obj.scale.setScalar(1.6); armR.add(gd.obj); }
      else if (gd.at === 'back') { gd.obj.position.set(0, 0.52, -0.22); g.add(gd.obj); }
      else g.add(gd.obj);
      gadTick = gd.tick;
    }
    // petit repère coloré au-dessus (pour reconnaître J1 / J2)
    let marker = null;
    if (opts.marker !== false) {
      marker = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.16, 4), new THREE.MeshBasicMaterial({ color, toneMapped: false }));
      marker.rotation.x = Math.PI; marker.position.y = 1.42;
      g.add(marker);
    }
    g.userData = { body, head, legL, legR, armL, armR, marker, gadTick };
    return g;
  }

  function accessory(id, color) {
    mats();
    if (!id || id === 'aucun') return null;
    const g = new THREE.Group();
    if (id === 'casquette') {
      const cap = new THREE.Mesh(new THREE.SphereGeometry(0.255, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), MAT.red);
      cap.position.y = 0.04;
      const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.03, 16, 1, false, -Math.PI / 2, Math.PI), MAT.red);
      brim.position.set(0, 0.06, 0.2); brim.scale.z = 1.2;
      g.add(cap, brim);
    } else if (id === 'casque') {
      const hm = new THREE.MeshStandardMaterial({ color: 0xf2c230, roughness: 0.35 });
      const dome = new THREE.Mesh(new THREE.SphereGeometry(0.27, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), hm);
      dome.position.y = 0.05;
      const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.33, 0.33, 0.03, 20), hm); rim.position.y = 0.06;
      const ridge = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.5), hm); ridge.position.y = 0.3;
      g.add(dome, rim, ridge);
    } else if (id === 'lunettes') {
      const band = new THREE.Mesh(new THREE.TorusGeometry(0.255, 0.025, 6, 24), MAT.dark); band.rotation.x = Math.PI / 2; band.position.y = 0.1;
      const lensM = new THREE.MeshStandardMaterial({ color: 0x2e7d5b, emissive: 0x0f3a28, metalness: 0.6, roughness: 0.1 });
      const l1 = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.06, 16), lensM); l1.rotation.x = Math.PI / 2; l1.position.set(-0.09, 0.12, 0.23);
      const l2 = l1.clone(); l2.position.x = 0.09;
      g.add(band, l1, l2);
    } else if (id === 'couronne') {
      const cm = MAT.gold;
      const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.19, 0.1, 16, 1, true), cm); ring.position.y = 0.26;
      g.add(ring);
      for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; const s = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.12, 4), cm); s.position.set(Math.cos(a) * 0.17, 0.36, Math.sin(a) * 0.17); g.add(s); }
    } else if (id === 'antenne') {
      const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.25), MAT.steel); rod.position.set(0.08, 0.32, 0);
      const tip = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 8), new THREE.MeshBasicMaterial({ color: 0xff3020 })); tip.position.set(0.08, 0.46, 0);
      g.add(rod, tip);
    } else if (id === 'echarpe') {
      const sm = new THREE.MeshStandardMaterial({ color: 0xd8392b, roughness: 0.8 });
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.055, 8, 20), sm); ring.rotation.x = Math.PI / 2; ring.position.y = -0.22;
      const tail = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.26, 0.04), sm); tail.position.set(0.1, -0.34, -0.18); tail.rotation.x = 0.4;
      g.add(ring, tail);
    }
    return g;
  }


  /* ---------- Gadgets des mondes (boutique) ----------
     Renvoie { obj, at, tick } — at : 'hand' (tenu dans la main droite, construit vers le haut
     à partir de la main), 'back' (dans le dos), 'body' / 'side' (placés dans le repère du héros :
     sur le corps, ou compagnon qui flotte à côté). tick(t) anime le gadget. */
  const texCache = {};
  function screenTex(kind) {
    if (texCache[kind]) return texCache[kind];
    const draw = {
      code: (g, w, h) => {
        g.fillStyle = '#0b1a12'; g.fillRect(0, 0, w, h);
        const cols = ['#3cff9a', '#7fd0ff', '#ffb347', '#ff7ad1'];
        for (let i = 0; i < 9; i++) { g.fillStyle = cols[i % 4]; g.fillRect(10 + (i % 3) * 12, 10 + i * 13, 30 + ((i * 37) % 70), 7); }
      },
      tag: (g, w, h) => {
        g.fillStyle = 'rgba(10,30,50,0.85)'; g.fillRect(0, 0, w, h);
        g.strokeStyle = '#7fd0ff'; g.lineWidth = 6; g.strokeRect(4, 4, w - 8, h - 8);
        g.fillStyle = '#7affd0'; g.font = 'bold 64px monospace'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('</>', w / 2, h / 2 + 4);
      },
      bits: (g, w, h) => {
        g.fillStyle = '#062012'; g.fillRect(0, 0, w, h);
        g.font = 'bold 18px monospace'; g.fillStyle = '#3cff9a';
        for (let y = 16; y < h; y += 20) for (let x = 4; x < w; x += 16) if ((x * 7 + y * 3) % 5) g.fillText(((x + y) / 4 | 0) % 2 ? '1' : '0', x, y);
      },
      chart: (g, w, h) => {
        g.fillStyle = 'rgba(20,80,140,0.35)'; g.fillRect(0, 0, w, h);
        g.strokeStyle = '#7fd0ff'; g.lineWidth = 4; g.strokeRect(3, 3, w - 6, h - 6);
        [0.35, 0.6, 0.45, 0.8, 0.95].forEach((k, i) => { g.fillStyle = i === 4 ? '#3cff9a' : '#7fd0ff'; g.fillRect(16 + i * 22, h - 12 - k * (h - 30), 14, k * (h - 30)); });
      },
      apps: (g, w, h) => {
        const grd = g.createLinearGradient(0, 0, 0, h); grd.addColorStop(0, '#3a2a6a'); grd.addColorStop(1, '#ff7a1a');
        g.fillStyle = grd; g.fillRect(0, 0, w, h);
        const cols = ['#3cff9a', '#ffcc33', '#5ad1ff', '#ff6fae', '#ffffff', '#b78cff'];
        for (let i = 0; i < 9; i++) { g.fillStyle = cols[i % 6]; g.fillRect(8 + (i % 3) * 18, 14 + Math.floor(i / 3) * 22, 12, 12); }
      },
    }[kind];
    const size = { code: [128, 128], tag: [192, 128], bits: [128, 160], chart: [128, 96], apps: [64, 112] }[kind];
    return (texCache[kind] = canvasTex(size[0], size[1], draw));
  }

  // compagnons qui flottent : un peu plus grands pour qu'on les voie bien en jeu
  const BIG_SIDE = { bulle: 1.25, atome: 1.4, nuage: 1.35, holo: 1.25, drone: 1.6 };
  function gadget(id) {
    mats();
    if (!id || id === 'aucun') return null;
    const G = new THREE.Group();
    const M = (c, o) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.5 }, o || {}));
    const box = (w, h, d, m) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
    const cyl = (rt, rb, h, m, seg) => new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg || 12), m);
    const sph = (r, m, seg) => new THREE.Mesh(new THREE.SphereGeometry(r, seg || 14, Math.max(6, Math.round((seg || 14) * 0.7))), m);
    const add = (m, x, y, z, par) => { m.position.set(x || 0, y || 0, z || 0); (par || G).add(m); return m; };
    const wood = M(0x7a4a26, { roughness: 0.8 });
    const black = M(0x15171c, { roughness: 0.4, metalness: 0.3 });
    const glow = (c, i) => new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: i || 1.4, toneMapped: false });
    const screen = (kind, w, h) => new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: screenTex(kind), toneMapped: false, transparent: true, side: THREE.DoubleSide }));
    let at = 'hand', tick = null;
    switch (id) {
      /* ---- Monde 1 : La Forge ---- */
      case 'cle': {
        add(box(0.045, 0.27, 0.025, MAT.steel), 0, 0.08, 0);
        const head = add(new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.024, 6, 14, Math.PI * 1.45), MAT.steel), 0, 0.26, 0);
        head.rotation.z = -Math.PI * 0.22;
        break;
      }
      case 'marteau': {
        add(cyl(0.02, 0.024, 0.3, wood), 0, 0.09, 0);
        add(box(0.19, 0.08, 0.08, M(0x3a3f46, { metalness: 0.8, roughness: 0.35 })), 0, 0.26, 0);
        add(box(0.03, 0.09, 0.09, MAT.steel), 0.1, 0.26, 0);
        break;
      }
      case 'tablier': {
        at = 'body';
        const lm = M(0x3b2213, { roughness: 0.9, side: THREE.DoubleSide });
        const ap = add(new THREE.Mesh(new THREE.CylinderGeometry(0.262, 0.29, 0.4, 18, 1, true, -0.8, 1.6), lm), 0, 0.3, 0);
        ap.scale.z = 0.92;
        add(box(0.13, 0.07, 0.02, M(0x2e1a0c)), 0, 0.24, 0.27);
        add(box(0.02, 0.05, 0.03, MAT.steel), 0.05, 0.27, 0.28);
        add(new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.018, 6, 20, Math.PI), lm), 0, 0.52, 0.06).rotation.x = -0.25;
        break;
      }
      case 'torche': {
        add(cyl(0.022, 0.028, 0.22, wood), 0, 0.05, 0);
        add(cyl(0.05, 0.034, 0.06, MAT.brass), 0, 0.18, 0);
        const f1 = add(new THREE.Mesh(new THREE.ConeGeometry(0.048, 0.16, 10), glow(0xff7a1a, 2)), 0, 0.28, 0);
        const f2 = add(new THREE.Mesh(new THREE.ConeGeometry(0.026, 0.1, 8), glow(0xfff0a0, 2)), 0, 0.26, 0.01);
        tick = (t) => { const k = 1 + Math.sin(t * 23) * 0.12 + Math.sin(t * 37) * 0.08; f1.scale.set(1, k, 1); f2.scale.set(1, 2 - k, 1); f1.rotation.y = t * 3; };
        break;
      }
      case 'engrenage': {
        at = 'back';
        const big = add(gear(0.12, 10, MAT.brass, 0.06), 0, 0, 0);
        const small = add(gear(0.035, 7, MAT.steel, 0.05), 0.24, 0.22, -0.03);
        tick = (t) => { big.rotation.z = t * 0.9; small.rotation.z = -t * 2.2; };
        break;
      }
      /* ---- Monde 2 : Le Code ---- */
      case 'cafe': {
        const mug = M(0xf4efe8, { roughness: 0.35 });
        add(cyl(0.05, 0.045, 0.1, mug, 16), 0, 0.05, 0);
        add(cyl(0.045, 0.045, 0.006, M(0x4a2a14)), 0, 0.1, 0);
        add(new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.01, 6, 12), mug), 0.055, 0.05, 0);
        const smM = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5 });
        const st = [add(sph(0.018, smM, 8), 0, 0.14, 0), add(sph(0.014, smM, 8), 0.01, 0.18, 0)];
        tick = (t) => st.forEach((m, i) => { const k = (t * 0.8 + i * 0.5) % 1; m.position.set(Math.sin(t * 3 + i) * 0.015, 0.12 + k * 0.12, 0); m.material.opacity = 0.5 * (1 - k); });
        break;
      }
      case 'canard': {
        at = 'side';
        const yl = M(0xffd21a, { roughness: 0.35 });
        const duck = add(new THREE.Group(), 0.33, 0.59, 0.02);
        add(sph(0.075, yl), 0, 0, 0, duck).scale.set(1, 0.8, 1.25);
        add(sph(0.05, yl), 0, 0.07, 0.04, duck);
        add(new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.05, 8), M(0xff7a1a)), 0, 0.065, 0.1, duck).rotation.x = Math.PI / 2;
        add(sph(0.009, black, 6), 0.022, 0.085, 0.08, duck); add(sph(0.009, black, 6), -0.022, 0.085, 0.08, duck);
        tick = (t) => { duck.rotation.z = Math.sin(t * 2.5) * 0.12; };
        break;
      }
      case 'ordi': {
        add(box(0.24, 0.015, 0.16, M(0x8a929c, { metalness: 0.7, roughness: 0.3 })), 0, 0.0, 0.05);
        const lid = add(new THREE.Group(), 0, 0.008, -0.03);
        add(box(0.24, 0.16, 0.01, M(0x8a929c, { metalness: 0.7, roughness: 0.3 })), 0, 0.08, 0, lid);
        add(screen('code', 0.22, 0.14), 0, 0.08, 0.007, lid);
        lid.rotation.x = -0.25;
        break;
      }
      case 'bulle': {
        at = 'side';
        const b = add(new THREE.Group(), 0.52, 1.12, 0.02);
        add(screen('tag', 0.3, 0.2), 0, 0, 0, b);
        add(new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.09, 3), glow(0x7fd0ff, 0.8)), -0.08, -0.13, 0, b).rotation.z = Math.PI;
        tick = (t) => { b.position.y = 1.12 + Math.sin(t * 2) * 0.03; b.rotation.y = Math.sin(t * 0.9) * 0.25; };
        break;
      }
      case 'capecode': {
        at = 'back';
        const cm = new THREE.MeshStandardMaterial({ map: screenTex('bits'), emissiveMap: screenTex('bits'), emissive: 0xffffff, emissiveIntensity: 0.6, side: THREE.DoubleSide, roughness: 0.7 });
        const cape = add(new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.38, 0.62, 16, 1, true, Math.PI - 1.25, 2.5), cm), 0, -0.08, 0.16);
        cape.scale.z = 0.8;
        tick = (t) => { cape.rotation.x = -0.1 + Math.sin(t * 2.2) * 0.05; };
        break;
      }
      /* ---- Monde 3 : Le Laboratoire ---- */
      case 'loupe': {
        add(cyl(0.018, 0.022, 0.14, black), 0, 0.02, 0);
        add(new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.014, 8, 22), MAT.brass), 0, 0.17, 0);
        const lens = add(cyl(0.066, 0.066, 0.008, new THREE.MeshStandardMaterial({ color: 0xbfe6ff, transparent: true, opacity: 0.35, metalness: 0.2, roughness: 0.05 }), 20), 0, 0.17, 0);
        lens.rotation.x = Math.PI / 2;
        break;
      }
      case 'aimant': {
        const u = add(new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.026, 8, 16, Math.PI), MAT.red), 0, 0.15, 0);
        u.rotation.z = Math.PI;
        add(box(0.052, 0.05, 0.052, MAT.steel), -0.07, 0.17, 0); add(box(0.052, 0.05, 0.052, MAT.steel), 0.07, 0.17, 0);
        const sp = add(sph(0.012, glow(0x7fd0ff, 2), 6), 0, 0.22, 0);
        tick = (t) => { const k = (t * 1.6) % 1; sp.position.set(Math.sin(t * 9) * 0.06, 0.2 + k * 0.08, 0); sp.scale.setScalar(1 - k); };
        break;
      }
      case 'fiole': {
        const liq = glow(0x3cff9a, 1.2);
        add(sph(0.065, liq, 16), 0, 0.06, 0);
        add(cyl(0.022, 0.028, 0.09, new THREE.MeshStandardMaterial({ color: 0xd8f6ff, transparent: true, opacity: 0.45, roughness: 0.05 })), 0, 0.14, 0);
        add(cyl(0.026, 0.022, 0.03, wood), 0, 0.2, 0);
        tick = (t) => { liq.emissiveIntensity = 1 + Math.sin(t * 4) * 0.5; };
        break;
      }
      case 'blouse': {
        at = 'body';
        const wm = M(0xf2f4f6, { roughness: 0.7, side: THREE.DoubleSide });
        const coat = add(new THREE.Mesh(new THREE.CylinderGeometry(0.272, 0.32, 0.44, 20, 1, true, 0.35, Math.PI * 2 - 0.7), wm), 0, 0.3, 0);
        coat.scale.z = 0.9;
        add(new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.04, 6, 20), wm), 0, 0.6, 0).rotation.x = Math.PI / 2;
        add(cyl(0.008, 0.008, 0.08, M(0x2d6fe0)), 0.14, 0.42, 0.22);
        break;
      }
      case 'atome': {
        at = 'side';
        const a = add(new THREE.Group(), 0.52, 1.12, 0);
        add(sph(0.045, glow(0xff5a5a, 1.2)), 0, 0, 0, a);
        const orbs = [];
        for (let i = 0; i < 3; i++) {
          const o = add(new THREE.Group(), 0, 0, 0, a);
          o.rotation.set(Math.PI / 2 + i * 0.9, i * 1.1, 0);
          add(new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.005, 4, 32), glow(0x7fd0ff, 1)), 0, 0, 0, o);
          orbs.push({ o, e: add(sph(0.02, glow(0x7fd0ff, 2), 8), 0.13, 0, 0, o) });
        }
        tick = (t) => { a.position.y = 1.12 + Math.sin(t * 1.8) * 0.03; orbs.forEach((x, i) => { const k = t * (2.5 + i * 0.7) + i * 2; x.e.position.set(Math.cos(k) * 0.13, Math.sin(k) * 0.13, 0); }); };
        break;
      }
      /* ---- Monde 4 : Nexus ---- */
      case 'nuage': {
        at = 'side';
        const c = add(new THREE.Group(), 0.52, 1.15, 0);
        const cm = M(0xffffff, { emissive: 0x9fb8d8, emissiveIntensity: 0.35, roughness: 0.9 });
        [[0, 0, 0.085], [-0.09, -0.02, 0.065], [0.09, -0.02, 0.065], [0.04, 0.05, 0.06], [-0.045, 0.04, 0.055]].forEach(([x, y, r]) => add(sph(r, cm), x, y, 0, c));
        const drops = [0, 1, 2].map((i) => add(new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.04, 0.01), glow(0x7fd0ff, 1.5)), -0.05 + i * 0.05, -0.1, 0, c));
        tick = (t) => { c.position.y = 1.15 + Math.sin(t * 1.5) * 0.03; drops.forEach((d, i) => { const k = (t * 1.3 + i * 0.33) % 1; d.position.y = -0.08 - k * 0.22; d.visible = k < 0.9; }); };
        break;
      }
      case 'holo': {
        at = 'side';
        const h = add(new THREE.Group(), 0.5, 1.02, 0.08);
        const sc = add(screen('chart', 0.3, 0.22), 0, 0, 0, h);
        tick = (t) => { h.rotation.y = -0.3 + Math.sin(t * 0.8) * 0.15; sc.material.opacity = 0.75 + Math.sin(t * 13) * 0.08 + (Math.sin(t * 2.1) > 0.97 ? -0.4 : 0); h.position.y = 1.02 + Math.sin(t * 1.6) * 0.02; };
        break;
      }
      case 'eclair': {
        const sh = new THREE.Shape();
        [[0.0, 0.0], [0.07, 0.15], [0.025, 0.15], [0.08, 0.32], [-0.045, 0.12], [0.005, 0.12], [-0.035, 0.0]].forEach(([x, y], i) => (i ? sh.lineTo(x, y) : sh.moveTo(x, y)));
        const em = glow(0xffd84a, 1.6);
        const bolt = add(new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: 0.025, bevelEnabled: false }), em), -0.02, -0.03, -0.012);
        bolt.scale.setScalar(0.95);
        tick = (t) => { em.emissiveIntensity = 1.3 + Math.random() * (Math.sin(t * 7) > 0.6 ? 1.6 : 0.3); };
        break;
      }
      case 'jetpack': {
        at = 'back';
        const fl = [];
        for (const x of [-0.2, 0.2]) {
          add(cyl(0.075, 0.075, 0.38, MAT.steel, 14), x, 0.02, -0.02);
          add(sph(0.075, MAT.red, 12), x, 0.21, -0.02).scale.y = 0.6;
          add(cyl(0.045, 0.06, 0.06, black), x, -0.2, -0.02);
          const f = add(new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.18, 10), glow(0xff8a2b, 2.2)), x, -0.32, -0.02);
          f.rotation.x = Math.PI; fl.push(f);
        }
        add(box(0.34, 0.12, 0.06, black), 0, 0.02, 0.02);
        tick = (t) => fl.forEach((f, i) => { const k = 0.8 + Math.abs(Math.sin(t * 25 + i)) * 0.45; f.scale.set(1, k, 1); f.position.y = -0.24 - k * 0.09; });
        break;
      }
      case 'drone': {
        at = 'side';
        const d = add(new THREE.Group(), 0.55, 1.2, 0);
        add(box(0.13, 0.04, 0.13, black), 0, 0, 0, d);
        add(sph(0.03, glow(0x3cff9a, 1.5), 8), 0, -0.03, 0.05, d);
        const rot = [];
        for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
          const arm = add(box(0.11, 0.015, 0.015, MAT.steel), x * 0.07, 0.01, z * 0.07, d); arm.rotation.y = x * z > 0 ? -Math.PI / 4 : Math.PI / 4;
          const r = add(new THREE.Group(), x * 0.11, 0.035, z * 0.11, d);
          add(box(0.11, 0.004, 0.018, M(0xd8dde3)), 0, 0, 0, r);
          add(new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.003, 16), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.15 })), 0, 0, 0, r);
          rot.push(r);
        }
        d.rotation.x = 0.45;
        tick = (t) => { d.position.y = 1.25 + Math.sin(t * 2.3) * 0.04; d.rotation.z = Math.sin(t * 1.7) * 0.08; rot.forEach((r, i) => (r.rotation.y = t * 40 * (i % 2 ? 1 : -1))); };
        break;
      }
      /* ---- Monde 5 : OSWEL City ---- */
      case 'smartphone': {
        add(box(0.075, 0.14, 0.012, black), 0, 0.06, 0);
        add(screen('apps', 0.064, 0.122), 0, 0.06, 0.0065);
        break;
      }
      case 'ballon': {
        at = 'side';
        const piv = add(new THREE.Group(), 0.34, 0.32, 0.1);
        add(cyl(0.003, 0.003, 0.8, M(0xeeeeee)), 0, 0.4, 0, piv);
        const bm = M(0xff4a3a, { roughness: 0.25, metalness: 0.1 });
        add(sph(0.13, bm, 18), 0, 0.92, 0, piv).scale.y = 1.15;
        add(new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.04, 8), bm), 0, 0.79, 0, piv).rotation.x = Math.PI;
        tick = (t) => { piv.rotation.z = -0.12 + Math.sin(t * 1.6) * 0.1; piv.rotation.x = Math.sin(t * 1.1) * 0.06; };
        break;
      }
      case 'mallette': {
        const lm = M(0x5a3418, { roughness: 0.6 });
        add(box(0.22, 0.15, 0.06, lm), 0, -0.1, -0.06);
        add(new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.009, 6, 12, Math.PI), black), 0, -0.025, -0.06);
        add(box(0.02, 0.02, 0.065, MAT.gold), -0.06, -0.04, -0.06); add(box(0.02, 0.02, 0.065, MAT.gold), 0.06, -0.04, -0.06);
        break;
      }
      case 'sac': {
        at = 'back';
        const om = M(0xff8a2b, { roughness: 0.6 });
        add(box(0.44, 0.42, 0.24, om), 0, 0.1, -0.08);
        add(box(0.46, 0.04, 0.26, M(0x2a1d15)), 0, 0.3, -0.08);
        add(box(0.05, 0.3, 0.02, M(0x2a1d15)), -0.13, -0.02, 0.46); add(box(0.05, 0.3, 0.02, M(0x2a1d15)), 0.13, -0.02, 0.46);
        break;
      }
      case 'trophee': {
        add(box(0.09, 0.03, 0.09, M(0x3a2a1f)), 0, 0, 0);
        add(cyl(0.014, 0.022, 0.07, MAT.gold), 0, 0.05, 0);
        add(cyl(0.075, 0.035, 0.11, MAT.gold, 16), 0, 0.14, 0);
        add(new THREE.Mesh(new THREE.TorusGeometry(0.032, 0.009, 6, 12), MAT.gold), -0.08, 0.15, 0);
        add(new THREE.Mesh(new THREE.TorusGeometry(0.032, 0.009, 6, 12), MAT.gold), 0.08, 0.15, 0);
        const star = add(sph(0.02, glow(0xfff3c4, 2), 6), 0, 0.24, 0);
        tick = (t) => { star.scale.setScalar(0.7 + Math.abs(Math.sin(t * 3)) * 0.6); star.rotation.y = t * 2; };
        break;
      }
      default: return null;
    }
    G.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    if (BIG_SIDE[id]) { const k = BIG_SIDE[id]; G.children.forEach((c) => { c.scale.multiplyScalar(k); }); }
    return { obj: G, at, tick };
  }

  /* ---------- Personnage non joueur (avec son nom au-dessus) ---------- */
  function person(ch) {
    mats();
    // version 1.2 : les personnages non joueurs ont le même squelette animé que les héros
    if (window.OT && OT.Chars && OT.Chars.build) {
      const g = new THREE.Group();
      const hero = OT.Chars.build('npc', { color: ch.color, npc: ch, acc: 'aucun', gad: 'aucun' }, { marker: false });
      g.add(hero);
      const name = label(ch.name, { size: 26, h: 0.24, color: '#f3ead9', bg: 'rgba(14,11,9,0.72)' });
      name.position.set(0, (hero.userData.height || 1.3) + 0.3, 0.3);
      g.add(name);
      g.userData = { body: hero, head: new THREE.Object3D(), name, hero, anim: OT.Anim ? OT.Anim.create(hero) : null, charge: hero.userData.charge || null };
      return g;
    }
    const g = new THREE.Group();
    const cloth = new THREE.MeshStandardMaterial({ color: ch.color, roughness: 0.6 });
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.3, 0.72, 16), cloth);
    body.position.y = 0.5; body.castShadow = true;
    const shoulders = new THREE.Mesh(new THREE.SphereGeometry(0.24, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), cloth);
    shoulders.position.y = 0.86;
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.1, 8), MAT.skin); neck.position.y = 0.95;
    const head = new THREE.Group(); head.position.y = 1.15;
    const skull = new THREE.Mesh(new THREE.SphereGeometry(0.2, 20, 14), MAT.skin); skull.castShadow = true;
    const eyeGeo = new THREE.SphereGeometry(0.025, 8, 6);
    const eyeM = new THREE.MeshBasicMaterial({ color: 0x120c08 });
    const e1 = new THREE.Mesh(eyeGeo, eyeM); e1.position.set(-0.07, 0.03, 0.18);
    const e2 = e1.clone(); e2.position.x = 0.07;
    head.add(skull, e1, e2);
    const hatM = new THREE.MeshStandardMaterial({ color: ch.hat || 0x222222, roughness: 0.6 });
    if (ch.hatType === 'cap') {
      const c = new THREE.Mesh(new THREE.SphereGeometry(0.205, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), hatM); c.position.y = 0.04;
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.025, 0.14), hatM); b.position.set(0, 0.05, 0.22);
      head.add(c, b);
    } else if (ch.hatType === 'bun') {
      const hair = new THREE.Mesh(new THREE.SphereGeometry(0.21, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.55), hatM); hair.position.y = 0.01;
      const bun = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), hatM); bun.position.set(0, 0.2, -0.1);
      head.add(hair, bun);
    } else if (ch.hatType === 'scarf') {
      const s = new THREE.Mesh(new THREE.SphereGeometry(0.215, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.6), hatM); s.position.y = 0.02;
      const knot = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), hatM); knot.position.set(0, 0.2, -0.15);
      head.add(s, knot);
    } else if (ch.hatType === 'band') {
      const hair = new THREE.Mesh(new THREE.SphereGeometry(0.21, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.45), new THREE.MeshStandardMaterial({ color: 0x1a120c }));
      const band = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.025, 6, 20), hatM); band.rotation.x = Math.PI / 2; band.position.y = 0.06;
      head.add(hair, band);
    } else if (ch.hatType === 'short') {
      // cheveux courts, coupe nette
      const hair = new THREE.Mesh(new THREE.SphereGeometry(0.208, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.42), hatM); hair.position.y = 0.012;
      const back = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 8, Math.PI * 0.6, Math.PI * 0.8, 0, Math.PI * 0.62), hatM); back.position.y = 0.0;
      head.add(hair, back);
    } else if (ch.hatType === 'hood') {
      const hood = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.6, 16, 1, true), hatM); hood.position.y = 0.12;
      head.add(hood);
      skull.material = new THREE.MeshStandardMaterial({ color: 0x0c0c10 });
      e1.material = e2.material = new THREE.MeshBasicMaterial({ color: 0xb78cff });
    }
    g.add(body, shoulders, neck, head);
    // détails propres à certains personnages
    let charge = null;
    if (ch.eyes) {
      // regard perçant : les yeux brillent
      e1.material = e2.material = new THREE.MeshBasicMaterial({ color: ch.eyes, toneMapped: false });
      e1.scale.set(1.25, 0.8, 1); e2.scale.set(1.25, 0.8, 1);
    }
    if (ch.burns) {
      // veste usée par les étincelles : col relevé + petites brûlures orange
      const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.2, 0.12, 14, 1, true), cloth); collar.position.y = 0.95;
      g.add(collar);
      const burnM = new THREE.MeshBasicMaterial({ color: 0xff7a1a, toneMapped: false, transparent: true, opacity: 0.85 });
      [[0.1, 0.62, 0.24], [-0.14, 0.42, 0.25], [0.05, 0.3, 0.28], [-0.06, 0.74, 0.22]].forEach(([x, y, z], i) => {
        const b = new THREE.Mesh(new THREE.CircleGeometry(0.018 + (i % 2) * 0.01, 8), burnM); b.position.set(x, y, z); b.lookAt(x * 4, y, z * 4); g.add(b);
      });
      // fermeture éclair métallique
      const zip = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.6, 0.01), new THREE.MeshStandardMaterial({ color: 0x9aa3ad, metalness: 0.8, roughness: 0.3 }));
      zip.position.set(0, 0.55, 0.282); zip.rotation.x = -0.08; g.add(zip);
    }
    if (ch.gloves) {
      // gants d'électricien (ils s'illuminent quand il détourne l'énergie)
      const gm = new THREE.MeshStandardMaterial({ color: new THREE.Color(ch.gloves).convertSRGBToLinear(), roughness: 0.55, emissive: new THREE.Color(0x5fd4ff).convertSRGBToLinear(), emissiveIntensity: 0 });
      const hands = [-1, 1].map((sd) => {
        const h = new THREE.Mesh(new THREE.SphereGeometry(0.075, 12, 10), gm); h.scale.set(1, 1.15, 0.9);
        h.position.set(sd * 0.31, 0.5, 0.06); h.castShadow = true;
        const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.075, 0.06, 12), gm); cuff.position.set(sd * 0.31, 0.6, 0.06);
        g.add(h, cuff); return h;
      });
      let lvl = 0;
      charge = (v) => { lvl = Math.max(lvl, v); };
      g.userData.tickNpc = (t, dt) => {
        lvl = Math.max(0, lvl - dt * 0.35);
        gm.emissiveIntensity = lvl * (1.6 + Math.sin(t * 40) * 0.6) + (Math.sin(t * 1.3) > 0.97 ? 0.8 : 0);
        hands.forEach((h, i) => { h.position.y = 0.5 + Math.sin(t * 2 + i) * 0.01; });
      };
    }
    if (ch.prop === 'tablet') {
      // l'assistant : une tablette à la main
      const tab = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.3, 0.02), new THREE.MeshStandardMaterial({ color: 0x1a1a1f, roughness: 0.4 }));
      const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.19, 0.26), new THREE.MeshBasicMaterial({ color: 0x5fd4ff, toneMapped: false, transparent: true, opacity: 0.8 }));
      scr.position.z = 0.012; tab.add(scr);
      tab.position.set(0.26, 0.62, 0.22); tab.rotation.set(-0.5, -0.4, 0.1);
      const hand = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), MAT.skin); hand.position.set(0.3, 0.55, 0.16);
      g.add(tab, hand);
    }
    // Nom toujours visible
    const name = label(ch.name, { size: 26, h: 0.24, color: '#f3ead9', bg: 'rgba(14,11,9,0.72)' });
    name.position.set(0, 1.62, 0.3);
    g.add(name);
    g.userData = Object.assign(g.userData || {}, { body, head, name, charge });
    return g;
  }

  /* ---------- Le Bug : un amas de pixels qui tremble ---------- */
  function bug() {
    const g = new THREE.Group();
    const cubes = [];
    const cols = [0xff2a3a, 0xff2a3a, 0xffb000, 0xff3fb4, 0x2ff3ff];
    for (let i = 0; i < 34; i++) {
      const s = 0.18 + Math.random() * 0.22;
      const m = new THREE.Mesh(new THREE.BoxGeometry(s, s, s), new THREE.MeshBasicMaterial({ color: cols[i % cols.length], toneMapped: false }));
      const a = Math.random() * Math.PI * 2, r = Math.random() * 0.75, h = (Math.random() - 0.5) * 1.3;
      m.position.set(Math.cos(a) * r, h, Math.sin(a) * r * 0.6);
      m.userData.home = m.position.clone();
      cubes.push(m); g.add(m);
    }
    const eyeM = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
    const e1 = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.22, 0.05), eyeM); e1.position.set(-0.18, 0.15, 0.5);
    const e2 = e1.clone(); e2.position.x = 0.18;
    g.add(e1, e2);
    g.userData = { cubes, eyes: [e1, e2] };
    return g;
  }

  return { buildTextures, mats, TEX, MAT, slabGeo, label, gear, coin, door, hero, person, accessory, gadget, canvasTex, bug };
})();
