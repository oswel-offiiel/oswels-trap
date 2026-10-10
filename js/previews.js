/* =====================================================================
   OSWEL'S TRAP — previews.js
   Fabrique les IMAGES D'APERÇU des 5 mondes avec le moteur 3D du jeu.
   Utilisé une seule fois (tools/previews.html) pour produire
   img/monde-1.jpg … img/monde-5.jpg. Le jeu lui-même charge les images.
   ===================================================================== */

window.OT = window.OT || {};

OT.renderWorldPreview = function (id, W, H) {
  const M = OT.Models;
  const MAT = M.mats();
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const r = new THREE.WebGLRenderer({ canvas: cv, antialias: true, preserveDrawingBuffer: true });
  r.outputEncoding = THREE.sRGBEncoding;
  r.toneMapping = THREE.ACESFilmicToneMapping;
  r.toneMappingExposure = 0.95;
  r.shadowMap.enabled = true;
  r.shadowMap.type = THREE.PCFSoftShadowMap;
  const sc = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(42, W / H, 0.1, 200);
  const std = (c, o = {}) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.5, metalness: 0.2 }, o));
  const glow = (c, i = 1.6) => new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: i });
  const add = (m, x, y, z) => { m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; sc.add(m); return m; };
  const box = (w, h, d, mat) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  const sky = (top, mid, bottom) => {
    const t = M.canvasTex(8, 256, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, top); gr.addColorStop(0.6, mid); gr.addColorStop(1, bottom); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
    sc.background = t;
  };
  const sun = (c, i, x, y, z) => { const d = new THREE.DirectionalLight(c, i); d.position.set(x, y, z); d.castShadow = true; d.shadow.mapSize.set(2048, 2048); const s = d.shadow.camera; s.left = -12; s.right = 12; s.top = 12; s.bottom = -12; sc.add(d); return d; };
  const points = (n, color, size, area) => {
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { pos[i * 3] = (Math.random() - 0.5) * area[0]; pos[i * 3 + 1] = Math.random() * area[1]; pos[i * 3 + 2] = (Math.random() - 0.5) * area[2] - 2; }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    sc.add(new THREE.Points(g, new THREE.PointsMaterial({ color, size, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false })));
  };
  const hero = (color, x, y, z, rot = 0.5, acc = 'aucun') => { const h = M.hero({ color, acc }, { marker: false }); h.position.set(x, y, z); h.rotation.y = rot; h.scale.setScalar(1.4); h.traverse((o) => (o.castShadow = true)); sc.add(h); return h; };
  const slab = (n, x, y, z, mats, h = 1, d = 2) => { const m = new THREE.Mesh(M.slabGeo(n, h, d), mats); return add(m, x, y, z); };
  const textPlane = (lines, w, h, colors, bg) => {
    const t = M.canvasTex(512, Math.round(512 * h / w), (g, cw, ch) => {
      g.fillStyle = bg; g.fillRect(0, 0, cw, ch);
      g.font = '700 26px "Chakra Petch", monospace';
      lines.forEach((l, i) => { g.fillStyle = colors[i % colors.length]; g.fillText(l, 24, 44 + i * 36); });
      g.strokeStyle = colors[0]; g.lineWidth = 6; g.strokeRect(3, 3, cw - 6, ch - 6);
    });
    return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: t, transparent: true, opacity: 0.95, toneMapped: false, side: THREE.DoubleSide }));
  };

  if (id === 1) {
    /* ---------- LA FORGE ---------- */
    sky('#0b0807', '#2a160d', '#6a2c0c');
    sc.fog = new THREE.Fog(0x2a160d, 12, 40);
    sc.add(new THREE.HemisphereLight(0xffd2a0, 0x1c120d, 0.6));
    sun(0xffd6a8, 1.2, -6, 12, 8);
    const fire = new THREE.PointLight(0xff7a1a, 4, 14, 2); fire.position.set(1.9, 1.2, -0.6); sc.add(fire);
    slab(10, -5, -1, 0, [MAT.plate, MAT.top]);
    slab(3, -2, 0, -2.4, [MAT.plate, MAT.top], 1, 1.4);
    // forge (four)
    add(box(2.4, 2.6, 1.6, std(0x3a2a22, { roughness: 0.8 })), 1.9, 1.3, -2.2);
    add(box(1.3, 1.0, 0.2, glow(0xff6a10, 4)), 1.9, 0.95, -1.35);
    add(new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.45, 4, 12), std(0x2a201b, { metalness: 0.6 })), 2.4, 4.4, -2.4);
    // enclume
    add(box(1.1, 0.25, 0.6, MAT.steel), -1.4, 0.95, 0.2); add(box(0.5, 0.5, 0.45, MAT.steel), -1.4, 0.55, 0.2); add(box(0.9, 0.2, 0.6, MAT.steel), -1.4, 0.2, 0.2);
    const g1 = M.gear(2.4, 18, MAT.brass, 0.4); g1.position.set(-3.5, 4.2, -5); g1.rotation.z = 0.2; sc.add(g1);
    const g2 = M.gear(1.4, 12, MAT.steel, 0.35); g2.position.set(-0.6, 5.6, -4.6); sc.add(g2);
    const g3 = M.gear(3.2, 22, std(0x4a3c30, { metalness: 0.8 }), 0.4); g3.position.set(4, 7, -8); sc.add(g3);
    for (let i = 0; i < 5; i++) { const s = new THREE.Mesh(new THREE.ConeGeometry(0.17, 0.6, 6), MAT.spike); add(s, 0.6 + i * 0.35, 0.3, 1.0); }
    hero(0x3d8bff, -0.2, 0, 0.6, 0.6, 'casque');
    const d = M.door(); d.position.set(-4, 0, -1.6); d.scale.setScalar(1.2); sc.add(d);
    points(300, 0xff9a40, 0.08, [14, 10, 6]);
    cam.position.set(0.4, 3.2, 8.2); cam.lookAt(0, 2.2, -1);
  } else if (id === 2) {
    /* ---------- LE CODE ---------- */
    sky('#03040c', '#081335', '#122a6a');
    sc.fog = new THREE.Fog(0x081335, 10, 36);
    sc.add(new THREE.HemisphereLight(0x8fd8ff, 0x0a0a20, 0.7));
    sun(0xbfe8ff, 0.9, 4, 10, 6);
    const grid = new THREE.GridHelper(40, 40, 0x2ff3ff, 0x1a5aa0); grid.position.y = 0; sc.add(grid);
    const lc = new THREE.PointLight(0x2ff3ff, 2, 12, 2); lc.position.set(-2, 3, 2); sc.add(lc);
    const lm = new THREE.PointLight(0xff3fb4, 2, 12, 2); lm.position.set(3, 4, -1); sc.add(lm);
    const cyan = glow(0x2ff3ff, 1.4), mag = glow(0xff3fb4, 1.4), blue = std(0x1a3a8a, { metalness: 0.5, roughness: 0.3 });
    for (let x = -3; x < 3; x++) add(box(0.95, 0.95, 0.95, x % 2 ? blue : std(0x24489a, { metalness: 0.5, roughness: 0.3 })), x + 0.5, 0.5, 0.3);
    const w1 = textPlane(['<!DOCTYPE html>', '<h1>Bonjour</h1>', 'body { color: #0ff; }', 'function saute() {', '  return vrai;', '}'], 3.4, 2.4, ['#2ff3ff', '#ff7ad1', '#ffe66d', '#9dff8a'], 'rgba(6,14,40,0.88)');
    w1.position.set(-2.6, 3.4, -2.4); w1.rotation.y = 0.35; sc.add(w1);
    const w2 = textPlane(['> npm start', 'ERREUR ligne 42', '> réessaie…', 'OK ✓'], 2.6, 1.6, ['#9dff8a', '#ff5a5a', '#ffe66d', '#2ff3ff'], 'rgba(6,14,40,0.88)');
    w2.position.set(2.8, 4.2, -3); w2.rotation.y = -0.4; sc.add(w2);
    for (let i = 0; i < 40; i++) { const s = 0.15 + Math.random() * 0.3; add(box(s, s, s, Math.random() < 0.5 ? cyan : mag), (Math.random() - 0.5) * 12, 1 + Math.random() * 7, -2 - Math.random() * 8); }
    // le Bug : amas de pixels rouges
    const bug = new THREE.Group();
    for (let i = 0; i < 26; i++) { const p = box(0.28, 0.28, 0.28, glow(i % 3 ? 0xff2a3a : 0xffb000, 1.2)); p.position.set((Math.random() - 0.5) * 1.4, (Math.random() - 0.5) * 1.4, (Math.random() - 0.5) * 1.4); bug.add(p); }
    bug.position.set(2.4, 1.6, -0.6); sc.add(bug);
    hero(0x3d8bff, -1.2, 1, 0.4, 0.7, 'lunettes');
    cam.position.set(0, 3.2, 8); cam.lookAt(0, 2.3, -1);
  } else if (id === 3) {
    /* ---------- LE LABORATOIRE ---------- */
    sky('#0d2a33', '#1d4a55', '#3f7f88');
    sc.fog = new THREE.Fog(0x1d4a55, 14, 40);
    sc.add(new THREE.HemisphereLight(0xdff8ff, 0x24434a, 0.55));
    sun(0xffffff, 1.0, -5, 12, 7);
    const white = std(0xc9d6db, { roughness: 0.35 }), teal = std(0x13968f, { roughness: 0.3, metalness: 0.4 });
    for (let x = -6; x < 6; x++) for (let z = -6; z < 2; z++) add(box(0.98, 0.1, 0.98, (x + z) % 2 ? white : std(0x9fb4bb, { roughness: 0.35 })), x + 0.5, -0.05, z + 0.5);
    add(box(9, 4.5, 0.4, std(0x2f5560, { roughness: 0.6 })), 0, 2.25, -5);
    add(box(9, 0.3, 0.42, teal), 0, 3.4, -4.8);
    // tubes en verre
    [-3.4, -2.6, -1.8].forEach((x, i) => {
      add(new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 2.2, 20), new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.25, roughness: 0.05, metalness: 0.1 })), x, 1.1, -3);
      add(new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 1.2 + i * 0.3, 20), glow([0x2fe0c0, 0x7a5cff, 0x3cff9a][i], 1.2)), x, 0.6 + i * 0.15, -3);
    });
    // bras robot
    const arm = new THREE.Group();
    const armBase = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.6, 0.4, 20), teal); armBase.position.set(0, 0.2, 0); arm.add(armBase);
    const a1 = box(0.35, 2, 0.35, white); a1.position.set(0, 1.3, 0); a1.rotation.z = -0.4; arm.add(a1);
    const a2 = box(1.6, 0.3, 0.3, white); a2.position.set(0.9, 2.2, 0); a2.rotation.z = -0.5; arm.add(a2);
    const claw = box(0.3, 0.4, 0.4, teal); claw.position.set(1.6, 1.8, 0); arm.add(claw);
    arm.position.set(2.2, 0, -2); arm.traverse((o) => (o.castShadow = true)); sc.add(arm);
    // hologramme
    const holo = new THREE.Mesh(new THREE.IcosahedronGeometry(1.1, 1), new THREE.MeshBasicMaterial({ color: 0x18c8ff, wireframe: true, transparent: true, opacity: 0.8 }));
    holo.position.set(0.2, 3.2, -2.6); sc.add(holo);
    add(new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.8, 0.2, 24), glow(0x18c8ff, 1)), 0.2, 0.1, -2.6);
    // lasers
    for (let i = 0; i < 3; i++) { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 12, 6), glow(0xff2a3a, 3)); l.rotation.z = Math.PI / 2; l.position.set(0, 0.6 + i * 0.7, 0.8 - i * 0.6); sc.add(l); }
    hero(0x3d8bff, -1.6, 0, 0.8, 0.5, 'lunettes');
    cam.position.set(0, 3, 8); cam.lookAt(0, 1.9, -1.5);
  } else if (id === 4) {
    /* ---------- NEXUS ---------- */
    sky('#1a0b3a', '#7a2a7a', '#ff8a5a');
    sc.fog = new THREE.Fog(0x7a2a7a, 12, 45);
    sc.add(new THREE.HemisphereLight(0xffb0e0, 0x2a0b3a, 0.8));
    sun(0xffd0b0, 1.1, 6, 10, 6);
    const rock = std(0x5a4a6a, { roughness: 0.9 }), grass = std(0x3fae7a, { roughness: 0.8 }), red = std(0xd8392b, { roughness: 0.5 });
    const island = (x, y, z, s) => {
      const r1 = new THREE.Mesh(new THREE.ConeGeometry(1.6 * s, 2.2 * s, 7), rock); r1.rotation.x = Math.PI; add(r1, x, y - 1.1 * s, z);
      add(new THREE.Mesh(new THREE.CylinderGeometry(1.65 * s, 1.6 * s, 0.25 * s, 7), grass), x, y, z);
    };
    island(0, 0, 0, 2.2); island(-5, 2.5, -5, 1); island(5, 3.5, -7, 1.3); island(-2, 5.5, -12, 0.9);
    // portique (deux piliers et deux poutres)
    add(box(0.35, 3.6, 0.35, red), -1.5, 1.9, -1.4); add(box(0.35, 3.6, 0.35, red), 1.5, 1.9, -1.4);
    add(box(4.4, 0.3, 0.5, red), 0, 3.75, -1.4); add(box(3.6, 0.22, 0.4, red), 0, 3.15, -1.4);
    add(box(4.8, 0.12, 0.6, std(0x2a1a1a)), 0, 3.95, -1.4);
    // portail lumineux
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.1, 0.08, 12, 48), glow(0xb78cff, 2.2)); ring.position.set(0, 1.9, -1.45); sc.add(ring);
    const disk = new THREE.Mesh(new THREE.CircleGeometry(1.05, 40), new THREE.MeshBasicMaterial({ color: 0xb78cff, transparent: true, opacity: 0.35, toneMapped: false })); disk.position.set(0, 1.9, -1.46); sc.add(disk);
    // lanternes
    [[-3, 0.2, 0.8], [3, 0.2, 0.8], [-2.8, 0.2, -2.6]].forEach(([x, y, z]) => { add(box(0.1, 0.9, 0.1, std(0x2a1a1a)), x, y + 0.45, z); add(box(0.4, 0.5, 0.4, glow(0xffa040, 1.8)), x, y + 1.1, z); });
    // bambous et arbre rose
    for (let i = 0; i < 7; i++) add(new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 3 + Math.random() * 2, 8), std(0x6fbf5a)), 3.4 + Math.random() * 1.2, 1.6, -2.2 + Math.random() * 1.5);
    add(new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.25, 2, 8), std(0x4a2a1a)), -3.6, 1, -1.8);
    for (let i = 0; i < 9; i++) add(new THREE.Mesh(new THREE.SphereGeometry(0.6 + Math.random() * 0.4, 14, 10), std(0xff9ac8, { roughness: 0.9 })), -3.6 + (Math.random() - 0.5) * 2, 2.4 + Math.random() * 1.2, -1.8 + (Math.random() - 0.5) * 1.5);
    points(220, 0xffc0e8, 0.07, [16, 10, 8]);
    hero(0x3d8bff, 0.9, 0.12, 1.4, -0.3, 'echarpe');
    cam.position.set(0, 3.4, 9); cam.lookAt(0, 2.2, -1.5);
  } else {
    /* ---------- OSWEL CITY ---------- */
    sky('#02030a', '#0c1640', '#2a1a5a');
    sc.fog = new THREE.Fog(0x0c1640, 16, 60);
    sc.add(new THREE.HemisphereLight(0x9fb8ff, 0x0a0a20, 0.6));
    sun(0xbfd0ff, 0.7, -6, 12, 6);
    const winTex = (c1) => M.canvasTex(64, 128, (g, w, h) => { g.fillStyle = '#0c1020'; g.fillRect(0, 0, w, h); for (let y = 6; y < h; y += 10) for (let x = 6; x < w; x += 12) { g.fillStyle = Math.random() < 0.6 ? c1 : '#1a2240'; g.fillRect(x, y, 7, 5); } }, true);
    const cols = ['#ffd27a', '#7fd8ff', '#ff9ad8', '#c8ffb0'];
    for (let i = 0; i < 26; i++) {
      const w = 1 + Math.random() * 1.6, h = 3 + Math.random() * 10, d = 1 + Math.random() * 1.5;
      const t = winTex(cols[i % cols.length]); t.repeat.set(1, h / 3);
      const m = new THREE.MeshStandardMaterial({ map: t, emissiveMap: t, emissive: 0xffffff, emissiveIntensity: 0.9, roughness: 0.6 });
      add(box(w, h, d, m), (Math.random() - 0.5) * 22, h / 2 - 1, -4 - Math.random() * 14);
    }
    // la tour OSWEL dorée
    add(box(2.2, 13, 2.2, std(0xf2c230, { metalness: 0.9, roughness: 0.25 })), 0.5, 5.5, -7);
    add(new THREE.Mesh(new THREE.ConeGeometry(1.4, 3, 4), std(0xf2c230, { metalness: 0.9, roughness: 0.25 })), 0.5, 13.5, -7);
    const sign = M.label('OSWEL', { size: 60, h: 1.3, color: '#ffe08a', bg: 'rgba(20,10,0,0.55)', border: '#ffcc33' });
    sign.position.set(0.5, 9, -5.85); sc.add(sign);
    // toit où se tient le héros
    slab(8, -4, -1, 1.2, [std(0x2a2f40, { metalness: 0.6, roughness: 0.4 }), std(0x3a4058, { metalness: 0.5, roughness: 0.4 })], 1, 3);
    add(box(0.12, 1.2, 0.12, MAT.steel), 3.2, 0.6, 1.8); add(box(0.6, 0.4, 0.1, glow(0x3cff9a, 1.5)), 3.2, 1.3, 1.8);
    // voitures volantes
    for (let i = 0; i < 6; i++) { const c = box(0.8, 0.25, 0.4, std(0xdfe6ff, { metalness: 0.8 })); add(c, -6 + Math.random() * 12, 4 + Math.random() * 6, -3 - Math.random() * 8); add(box(0.15, 0.08, 0.3, glow(i % 2 ? 0xff3a5a : 0x7fd8ff, 3)), c.position.x - 0.45, c.position.y, c.position.z); }
    points(260, 0xffffff, 0.05, [40, 20, 20]);
    hero(0xf2c230, -0.8, 0, 2, 0.6, 'couronne');
    const tl = new THREE.PointLight(0xffd27a, 3, 16, 2); tl.position.set(0.5, 6, -3.5); sc.add(tl);
    cam.position.set(0, 2.6, 10.5); cam.lookAt(0, 3.6, -2);
  }
  r.render(sc, cam);
  const url = cv.toDataURL('image/jpeg', 0.86);
  r.dispose();
  return url;
};
