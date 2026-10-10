/* =====================================================================
   OSWEL'S TRAP — arena/podium.js
   Le PODIUM 3D des résultats et du champion de la Soirée OSWEL :
   les vrais personnages des joueurs montent sur les marches,
   le 1er fait son émote puis son animation de victoire, les 2e et 3e
   applaudissent, le 4e boude. Confettis, projecteurs, caméra qui se
   balance doucement. On peut le faire tourner (glisser) et zoomer (molette).
   Un seul petit moteur de rendu, réutilisé d'un écran à l'autre.
   ===================================================================== */
window.OT = window.OT || {};

OT.Podium = (function () {
  const lin = (h) => new THREE.Color(h).convertSRGBToLinear();
  let r = null, sc = null, cam = null, cv = null, holder = null, raf = 0, last = 0, t = 0;
  let stage = null, people = [], conf = null, opts = {};
  const V = { yaw: 0, ty: 0, zoom: 1, tz: 1, lastIn: -9 };
  const ptr = new Map();

  function ensure() {
    if (r) return;
    cv = document.createElement('canvas');
    r = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: true });
    r.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    r.outputEncoding = THREE.sRGBEncoding; r.toneMapping = THREE.ACESFilmicToneMapping;
    sc = new THREE.Scene();
    cam = new THREE.PerspectiveCamera(32, 2, 0.1, 80);
    sc.add(new THREE.HemisphereLight(0xffe8d0, 0x1a1020, 0.8));
    const key = new THREE.DirectionalLight(0xffffff, 1.2); key.position.set(2, 6, 5); sc.add(key);
    const rimA = new THREE.DirectionalLight(0xff8a2b, 0.9); rimA.position.set(-4, 3, -3); sc.add(rimA);
    const rimB = new THREE.DirectionalLight(0x5fd4ff, 0.7); rimB.position.set(4, 3, -3); sc.add(rimB);
    // confettis
    const N = 140;
    const m = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.07, 0.11), new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, toneMapped: false }), N);
    m.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(N * 3), 3);
    const cols = [0xffd23f, 0xff5fa2, 0x3cff9a, 0x5fd4ff, 0xff8a2b, 0xffffff];
    const data = [];
    for (let i = 0; i < N; i++) { m.setColorAt(i, lin(cols[i % cols.length])); data.push({ x: (Math.random() - 0.5) * 7, y: Math.random() * 6, z: (Math.random() - 0.5) * 3 - 0.5, s: 0.6 + Math.random() * 0.9, r: Math.random() * 6, w: 1 + Math.random() * 3 }); }
    m.frustumCulled = false; sc.add(m);
    const dummy = new THREE.Object3D();
    conf = (dt) => {
      for (let i = 0; i < N; i++) {
        const d = data[i];
        d.y -= dt * d.s; d.r += dt * d.w;
        if (d.y < -0.2) { d.y = 4.5 + Math.random() * 1.5; d.x = (Math.random() - 0.5) * 7; }
        dummy.position.set(d.x + Math.sin(t * 1.3 + i) * 0.15, d.y, d.z);
        dummy.rotation.set(d.r, d.r * 0.7, 0); dummy.updateMatrix(); m.setMatrixAt(i, dummy.matrix);
      }
      m.instanceMatrix.needsUpdate = true;
    };
    // commandes : glisser = tourner, molette / pincer = zoom
    cv.addEventListener('pointerdown', (e) => { ptr.set(e.pointerId, { x: e.clientX, y: e.clientY }); try { cv.setPointerCapture(e.pointerId); } catch (er) {} V.lastIn = t; });
    cv.addEventListener('pointermove', (e) => {
      const p = ptr.get(e.pointerId); if (!p) return;
      const dx = e.clientX - p.x; p.x = e.clientX; p.y = e.clientY;
      if (ptr.size === 1) V.ty = Math.max(-0.9, Math.min(0.9, V.ty - dx * 0.008));
      V.lastIn = t;
    });
    const up = (e) => ptr.delete(e.pointerId);
    cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
    cv.addEventListener('wheel', (e) => { e.preventDefault(); V.tz = Math.max(0.6, Math.min(1.4, V.tz * Math.exp(e.deltaY * 0.0012))); V.lastIn = t; }, { passive: false });
  }

  // entries : [{ skin, name, color, place }] dans l'ordre du classement
  function build(entries) {
    if (stage) { sc.remove(stage); stage = null; }
    stage = new THREE.Group(); people = [];
    const metal = new THREE.MeshStandardMaterial({ color: lin(0x2a2530), metalness: 0.5, roughness: 0.45 });
    const floor = new THREE.Mesh(new THREE.CircleGeometry(4.2, 48), new THREE.MeshStandardMaterial({ color: lin(0x141118), roughness: 0.9 }));
    floor.rotation.x = -Math.PI / 2; stage.add(floor);
    const glowRing = new THREE.Mesh(new THREE.RingGeometry(3.9, 4.05, 64), new THREE.MeshBasicMaterial({ color: lin(0xff8a2b), toneMapped: false, side: THREE.DoubleSide }));
    glowRing.rotation.x = -Math.PI / 2; glowRing.position.y = 0.01; stage.add(glowRing);
    // marches : 2e à gauche, 1er au centre (le plus haut), 3e à droite, les autres devant
    const SLOT = [{ x: 0, h: 1.0 }, { x: -1.35, h: 0.66 }, { x: 1.35, h: 0.42 }];
    const numTex = (n, col) => {
      const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
      g.fillStyle = col; g.font = '96px "Bungee", "Arial Black", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(String(n), 64, 70);
      const tx = new THREE.CanvasTexture(c); tx.encoding = THREE.sRGBEncoding; return tx;
    };
    const MED = ['#ffd23f', '#d8dde3', '#d08a4a'];
    entries.forEach((e, k) => {
      const place = Math.min(e.place !== undefined ? e.place : k, 3);
      let x, y;
      if (place < 3) {
        const S = SLOT[place];
        // plusieurs à la même place (égalité) : ils se serrent sur la marche
        const same = entries.filter((o, j) => j < k && Math.min(o.place !== undefined ? o.place : j, 3) === place).length;
        x = S.x + same * 0.45; y = S.h;
        if (!same) {
          const blk = new THREE.Mesh(new THREE.BoxGeometry(1.2, S.h, 1.1), metal); blk.position.set(S.x, S.h / 2, 0); stage.add(blk);
          const edge = new THREE.Mesh(new THREE.BoxGeometry(1.22, 0.05, 1.12), new THREE.MeshBasicMaterial({ color: lin(parseInt(MED[place].slice(1), 16)), toneMapped: false }));
          edge.position.set(S.x, S.h, 0); stage.add(edge);
          const num = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.5), new THREE.MeshBasicMaterial({ map: numTex(place + 1, MED[place]), transparent: true, toneMapped: false }));
          num.position.set(S.x, S.h / 2, 0.56); stage.add(num);
        }
      } else { x = -1.9 + (k - 3) * 0.8 + 3.2; y = 0; }
      const hero = OT.Models.hero(Object.assign({}, e.skin, { color: e.color }), { marker: false });
      hero.position.set(x, y, place < 3 ? 0 : 0.9);
      hero.rotation.y = place < 3 ? 0 : -0.3;
      stage.add(hero);
      const ctl = OT.Anim ? OT.Anim.create(hero) : null;
      if (ctl) {
        if (place === 0) { ctl.emote(); ctl.loop('victory'); }
        else if (place < 3) { ctl.play('celebrate', { dur: 1.6 }); }
        else { ctl.loop('defeat'); }
      }
      people.push({ hero, ctl, place, k });
    });
    // projecteur sur le champion
    const cone = new THREE.Mesh(new THREE.ConeGeometry(1.1, 5, 24, 1, true), new THREE.MeshBasicMaterial({ color: lin(0xfff0c8), transparent: true, opacity: 0.08, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }));
    cone.position.set(0, 3.5, 0); stage.add(cone);
    sc.add(stage);
  }

  function show(el, entries, o = {}) {
    if (!window.THREE || !el || !OT.Models) return;
    ensure(); opts = o;
    if (holder !== el) { el.innerHTML = ''; el.appendChild(cv); holder = el; }
    build(entries);
    V.ty = 0; V.yaw = 0.6; V.tz = 1; V.zoom = 1.35; t = 0;      // arrivée : la caméra pivote et s'approche
    const w = el.clientWidth || 300, h = el.clientHeight || 180;
    r.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix();
    if (!raf) { last = performance.now(); raf = requestAnimationFrame(frame); }
  }
  function frame(now) {
    raf = requestAnimationFrame(frame);
    if (!holder || !holder.isConnected || holder.offsetParent === null) { stop(); return; }
    const dt = Math.min(0.05, (now - last) / 1000 || 0); last = now; t += dt;
    // balancement doucement quand personne ne touche
    const sway = t - V.lastIn > 2.5 ? Math.sin(t * 0.45) * 0.35 : 0;
    const k = 1 - Math.exp(-dt * 3);
    V.yaw += (V.ty + sway - V.yaw) * k; V.zoom += (V.tz - V.zoom) * (1 - Math.exp(-dt * 2.2));
    // on cadre le podium (2,8 de haut, 4,6 de large) quelle que soit la forme du cadre
    const tf = Math.tan((cam.fov * Math.PI) / 360);
    const dist = Math.max(2.8 / (2 * tf), 4.6 / (2 * tf * cam.aspect)) * V.zoom * (opts.zoom || 1);
    cam.position.set(Math.sin(V.yaw) * dist, 1.5 + dist * 0.16, Math.cos(V.yaw) * dist);
    cam.lookAt(0, 1.2, 0);
    for (const p of people) {
      if (!p.ctl) continue;
      p.ctl.update(dt, { speed: 0, ground: true, face: p.place === 0 ? undefined : p.place < 3 ? 'happy' : 'sad' });
      // les 2e et 3e applaudissent de temps en temps
      if (p.place > 0 && p.place < 3 && Math.random() < dt * 0.25) p.ctl.play(Math.random() < 0.5 ? 'celebrate' : 'wave');
    }
    if (conf) conf(dt);
    r.render(sc, cam);
  }
  function stop() { if (raf) { cancelAnimationFrame(raf); raf = 0; } }
  return { show, stop };
})();
