(function () {
  const J = (dir, landY, stopX, extra) => Object.assign({ jump: dir, landY, stopX, run: 1 }, extra || {});
  // ---- 1-2 : la chaîne de blocs rouillés ----
  window.L2route = function () {
    const st = [[11, 3], [16, 4], [21, 5], [26, 6], [30, 5], [34, 4], [39, 6], [44, 8], [49, 6], [54, 4], [59, 3], [63, 2]];
    const steps = [{ go: 8.4 }];
    for (const [x0, top] of st) steps.push(J(1, top, x0 + 0.45));
    let done = false;
    const w = walker();
    const rb = routeBot(() => (done ? [] : steps));
    return (env, i) => {
      if (env.p.x > 63 && env.p.onGround && Math.abs(env.p.y - 2) < 0.05) done = true;
      return done ? w(env, i) : rb(env, i);
    };
  };
  // ---- 1-4 : l'escalier caché vers la vraie pièce ----
  window.L4route = function (role) {
    const steps = [{ go: 12.9 }, J(-1, 3, 11.4), { go: 10.5 }, J(-1, 5, 7.5), J(-1, 7, 4.2), { go: 3.5 }];
    // sauter les pics 28-29 avec un saut moyen (sinon on retombe pile sur la caisse à outils de 33)
    const w = smartCeil((e, i, o, m) => {
      const p = e.p, tr = (e.R.ents.trigger || []).find((t) => t.act === 'ceiling');
      if (p.onGround && p.y > 2.5 && p.x > 49 && p.x < 51.2) return { jumpP: false, jump: false, right: true };   // sur le mur : descendre en marchant
      if (tr && !tr.fired && p.x > 51.2 && p.x < 53.1 && p.onGround) return { jumpP: false, jump: false, right: e.k % 3 === 0 };  // avancer à petits pas
    });
    const rb = routeBot(() => steps);
    return (env, i) => {
      if (env.R.hasPart) return w(env, i);
      if (role === 'wait') return {};
      return rb(env, i);
    };
  };
  // ---- 1-6 en coop : l'un tient l'interrupteur pendant que l'autre traverse ----
  window.L6coop = function () {
    // étapes partagées : 0 = traverser la 1re zone ; 1 = J1 tient 19, J2 va à 49 ; 2 = J2 tient 49, J1 rejoint ;
    // 3 = J1 tient 49, J2 va à 69 ; 4 = J2 tient 69, J1 rejoint ; 5 = sortie
    const eb = elecBot();
    return (env, i) => {
      const sh = env.shared, p = env.p, ps = env.players;
      sh.stage = sh.stage || 0;
      const go = (x, run) => { const dx = x - p.x; if (Math.abs(dx) < 0.15 && p.onGround) return {}; return { right: dx > 0.1, left: dx < -0.1, run: run ? 1 : 0 }; };
      const at = (q, x) => Math.abs(q.x - x) < 0.3 && q.onGround;
      if (sh.stage === 0) {
        if (ps.every((q) => q.x > 18.3)) sh.stage = 1;
        if (i === 0) return p.x < 18.4 ? eb(env, i) : go(19.5);
        // J2 attend avant la 1re zone que J1 tienne l'interrupteur, puis traverse
        if (p.x < 9.5) return eb(env, i);
        if (!at(ps[0], 19.5)) return go(10.6);
        return go(18.6, true);
      }
      if (sh.stage === 1) { if (i === 0) return go(19.5); if (!at(ps[0], 19.5)) return {}; if (at(p, 49.5)) { sh.stage = 2; return {}; } return p.x < 48 ? Object.assign(eb(env, i), env.R.powerOffT > 0 ? { right: true, left: false, run: 1 } : {}) : go(49.5); }
      if (sh.stage === 2) { if (i === 1) return go(49.5); if (at(p, 48.6)) { sh.stage = 3; return {}; } return go(48.6, true); }
      if (sh.stage === 3) { if (i === 0) { return go(49.5); } if (!at(ps[0], 49.5)) return go(50.4); if (at(p, 69.5)) { sh.stage = 4; return {}; } return go(69.5, true); }
      if (sh.stage === 4) { if (i === 1) return go(69.5); if (at(p, 70.6)) { sh.stage = 5; return {}; } return go(70.6, true); }
      return walker()(env, i);
    };
  };
})();
// coop sur les plateformes : J2 attend que J1 soit arrivé de l'autre côté, puis traverse à son tour
const p_out = (env) => env.p.x >= 6.5;
window.platSmart = function () {
  const pb = platBot(), sw = smartWalker();
  return (env, i) => {
    const R = env.R, p = env.p;
    const end = (R.ents.plat || []).reduce((m, pl) => Math.max(m, pl.x0 + pl.range + pl.w), 0) + 0.8;
    if (p.x < end - 0.5) env.mem.onEnd = false;
    if (env.mem.onEnd || (p.x > end && p.onGround)) { env.mem.onEnd = p.alive; return sw(env, i); }
    return pb(env, i);
  };
};
window.platCoop = function () {
  const a = platSmart(), b = platSmart();
  return (env, i) => {
    const ps = env.players, R = env.R;
    const end = (R.ents.plat || []).reduce((m, pl) => Math.max(m, pl.x0 + pl.range + pl.w), 0) + 1.5;
    if (i === 0) return (ps[1].x < 6.4 && R.ents.booth) ? {} : a(env, i);
    // J2 sort d'abord du boîtier (sinon c'est lui qui commande les plateformes), puis attend son tour
    if (R.ents.booth && ps[0].x < end && !ps[0].finished && p_out(env)) return {};
    if (R.ents.booth && ps[0].x < end && !ps[0].finished) return { right: true };
    if (!ps[0].finished && (ps[0].x < end || !ps[0].onGround)) return {};
    // attendre que les plateformes soient revenues à leur place avant de partir
    if (env.p.x < 9 && (R.ents.plat || []).some((pl) => Math.abs(pl.x - pl.x0) > 0.05)) return {};
    return b(env, i);
  };
};
