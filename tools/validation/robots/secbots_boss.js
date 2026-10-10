// =====================================================================
// Robot de validation — version 1.5 : les ATTAQUES ANNONCÉES des boss (R.bfx).
// Le robot ne triche pas : il lit seulement ce que le joueur voit (la marque au sol,
// la colonne translucide, le cercle d'éclair, la lueur d'un projectile) et réagit
// avec les mêmes touches qu'un joueur : s'écarter, sauter, attendre.
// =====================================================================
(function () {
  const XB = () => (window.SECBOT_EXT = window.SECBOT_EXT || { tileSolid: [], solids: [], danger: [], step: [], sections: {}, oneByOne: [] });
  const G = () => OT.Game._dbg;
  const PW = 0.66, PH = 0.9;
  XB().bossDodge = function (env) {
    const R = env.R, p = env.p, L = R.bfx;
    if (!L || !L.length || !p.alive) return null;
    const now = G().time, AW = R.AW || R.W;
    const m = env.mem; m.dodge = m.dodge || {};
    // zones VERTES affichées + colonnes qui arrivent (la « surcharge » du Bug) : aller dans la zone verte la plus proche
    const safes = L.filter((h) => h.k === 'safe' && !h.dead);
    if (safes.length) {
      const inSafe = safes.some((s) => p.x - PW / 2 > s.zone.x0 + 0.1 && p.x + PW / 2 < s.zone.x1 - 0.1);
      const threat = L.some((h) => h.k === 'column' && !h.dead && now < h.on1 + 0.05);
      if (threat && !inSafe) {
        let best = null;
        for (const s of safes) { const c = (s.zone.x0 + s.zone.x1) / 2; if (!best || Math.abs(c - p.x) < Math.abs(best - p.x)) best = c; }
        return { left: best < p.x, right: best > p.x, run: 1 };
      }
      if (threat && inSafe) return {};
    }
    for (const h of L) {
      if (h.harmless || h.dead) continue;
      // projectile horizontal : sauter quand il arrive (lueur visible avant son départ)
      if (h.k === 'lance') {
        const started = h.t >= h.warn;
        const x = h.x, vx = h.vx;
        const ahead = (p.x - x) * Math.sign(vx);
        // vitesse de rapprochement : le projectile ET le robot qui court vers lui
        const close = Math.abs(vx) - p.vx * Math.sign(vx);
        const tReach = (started ? 0 : h.warn - h.t) + Math.max(0, ahead - 0.8) / Math.max(1, close);
        const sameRow = p.y < h.y + h.hh / 2 + 0.15 && p.y + PH > h.y - h.hh / 2 - 0.15;
        // (on garde aussi sa direction : un saut sur place laisserait le projectile arriver pendant la retombée)
        const dir = { right: p.vx > 0.5, left: p.vx < -0.5 };
        if (ahead > -0.3 && sameRow && tReach < 0.32 && p.onGround) { m.dodge.hold = 30; m.dodge.dir = dir; return Object.assign({ jumpP: true, jump: true }, dir); }
        // en l'air : on GARDE le bouton de saut (sinon le saut est écourté et on retombe dessus)
        if (ahead > -0.6 && (sameRow || m.dodge.hold > 0) && !p.onGround) { m.dodge.hold = Math.max(0, (m.dodge.hold || 0) - 1); return Object.assign({ jump: true }, m.dodge.dir || {}); }
        continue;
      }
      const soon = h.on0 - now;
      if (now > h.on1 + 0.05 || soon > 1.15) continue;
      const z = h.zone, mg = h.k === 'strip' ? 0.15 : 0.45, near = h.k === 'strip' ? 0.85 : 1.6;
      const inside = p.x + PW / 2 + mg > z.x0 && p.x - PW / 2 - mg < z.x1 && p.y < z.y1 + 0.1 && p.y + PH > z.y0 - 0.1;
      if (!inside) {
        // sur le point d'y entrer : on s'arrête au bord (une bande au sol : tout près du bord, comme un joueur)
        const goingIn = Math.abs(p.vx) > 0.5 && ((p.vx > 0 && p.x < z.x0 && z.x0 - p.x < near) || (p.vx < 0 && p.x > z.x1 && p.x - z.x1 < near));
        if (goingIn && p.y < z.y1 && p.y + PH > z.y0 && p.onGround) return {};
        continue;
      }
      // sortir par le côté le plus court (sans foncer dans le mur de l'arène)
      let dir = p.x - z.x0 < z.x1 - p.x ? -1 : 1;
      if (z.x0 < 1.6) dir = 1;
      if (z.x1 > AW - 1.6) dir = -1;
      m.dodge.dir = dir;
      return { left: dir < 0, right: dir > 0, run: 1 };
    }
    return null;
  };
})();
