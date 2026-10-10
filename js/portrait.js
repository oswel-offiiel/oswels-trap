/* =====================================================================
   OSWEL'S TRAP — portrait.js  (version 1.4)
   LE PORTRAIT 3D DANS LA BOÎTE DE DIALOGUE
   Le personnage qui parle apparaît en buste : il regarde, hoche la tête,
   ouvre la bouche pendant qu'il parle, change d'expression.
   Un petit rendu 3D séparé (il ne touche pas à la scène du jeu).
   Si la 3D n'est pas disponible, la pastille avec l'initiale reste.
   ===================================================================== */
window.OT = window.OT || {};

OT.Portrait = (function () {
  let r = null, sc = null, cam = null, cv = null, holder = null, model = null, ctl = null, key = '', raf = 0, last = 0, t = 0, failed = false;
  const cache = new Map();   // les modèles déjà fabriqués (12 au plus)

  function ensure() {
    if (r || failed) return !!r;
    try {
      cv = document.createElement('canvas'); cv.className = 'dlg-3d';
      r = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: true });
      r.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
      r.outputEncoding = THREE.sRGBEncoding; r.toneMapping = THREE.ACESFilmicToneMapping;
      sc = new THREE.Scene();
      cam = new THREE.PerspectiveCamera(24, 1, 0.05, 30);
      sc.add(new THREE.HemisphereLight(0xfff0dc, 0x2a1a12, 0.95));
      const d = new THREE.DirectionalLight(0xffffff, 1.1); d.position.set(1.5, 2.5, 3); sc.add(d);
      const rim = new THREE.DirectionalLight(0x5fd4ff, 0.7); rim.position.set(-2, 1.5, -2); sc.add(rim);
      return true;
    } catch (e) { failed = true; r = null; return false; }
  }

  // fabrique le modèle d'un personnage qui parle
  function build(id) {
    const P = (OT.Game && OT.Game._dbg && OT.Game._dbg.players) || [];
    const ch = (OT.CHARACTERS || {})[id];
    // le héros et l'Écho : le personnage choisi par le joueur
    if ((id === 'oswel' || id === 'echo') && P[id === 'oswel' ? 0 : 1] && P[id === 'oswel' ? 0 : 1].skin) return OT.Models.hero(Object.assign({}, P[id === 'oswel' ? 0 : 1].skin, { gad: 'aucun', fx: 'aucun' }), { marker: false });
    if (id === 'oswel' || id === 'chapitre') return OT.Models.hero({ char: 'oswel', color: 0x3d8bff, acc: 'aucun', gad: 'aucun' }, { marker: false });
    if (OT.Chars && OT.Chars.BY && OT.Chars.BY[id] && !ch) return OT.Models.hero({ char: id, color: OT.Chars.BY[id].accent || 0xff8a2b, acc: 'aucun', gad: 'aucun' }, { marker: false });
    if (ch && OT.UI && OT.UI.npcModel) return OT.UI.npcModel(id);
    return null;
  }

  function show(el, id) {
    if (!el || !window.THREE || !ensure()) return false;
    let m = cache.get(id);
    if (m === undefined) {
      try { m = build(id); } catch (e) { m = null; }
      cache.set(id, m);
      if (cache.size > 12) { const k = cache.keys().next().value; if (k !== id) cache.delete(k); }
    }
    if (!m) { hide(); return false; }
    if (holder !== el) { el.appendChild(cv); holder = el; }
    if (key !== id) {
      if (model) sc.remove(model);
      model = m; sc.add(model); key = id;
      ctl = OT.Anim && model.userData && model.userData.legL ? (model.userData.portraitCtl || (model.userData.portraitCtl = OT.Anim.create(model))) : null;
      if (ctl) { ctl.loop(null); ctl.expr('happy', 0.8); }
    }
    cv.hidden = false;
    const w = el.clientWidth || 64, h = el.clientHeight || 64;
    r.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix();
    if (!raf) { last = performance.now(); raf = requestAnimationFrame(frame); }
    return true;
  }
  function hide() { if (cv) cv.hidden = true; stop(); }
  function talk(dur) { if (ctl) ctl.talk(dur); }
  function stopTalk() { if (ctl) ctl.stopTalk(); }
  function emotion(e, dur) { if (ctl && e) ctl.expr(e, dur || 1.5); }

  function frame(now) {
    raf = requestAnimationFrame(frame);
    if (!holder || !holder.isConnected || holder.offsetParent === null || !model) { stop(); return; }
    const dt = Math.min(0.05, (now - last) / 1000 || 0); last = now; t += dt;
    const H = (model.userData && model.userData.height) || 1.3;
    // cadrage du buste : un peu de côté, regard vers la caméra
    const look = H * 0.82;
    cam.position.set(Math.sin(0.35 + Math.sin(t * 0.4) * 0.05) * 1.55, look + 0.08, Math.cos(0.35) * 1.55);
    cam.lookAt(0, look - 0.04, 0);
    if (ctl) ctl.update(dt, { speed: 0, ground: true });
    else if (model.userData && model.userData.gadTick) model.userData.gadTick(t);
    r.render(sc, cam);
  }
  function stop() { if (raf) { cancelAnimationFrame(raf); raf = 0; } }
  return { show, hide, talk, stopTalk, emotion };
})();
