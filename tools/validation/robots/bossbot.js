(function () {
  const S = { floor: { y: 1 }, A: { x0: 5, x1: 8, y: 3 }, B: { x0: 10, x1: 13, y: 5 }, C: { x0: 15, x1: 18, y: 3 }, D: { x0: 20, x1: 22, y: 5 }, E: { x0: 23, x1: 26, y: 3 }, F: { x0: 26, x1: 28, y: 5 } };
  function surfaceOf(p) {
    if (!p.onGround) return null;
    if (Math.abs(p.y - 1) < 0.05) return 'floor';
    for (const k of ['A', 'B', 'C', 'D', 'E', 'F']) { const s = S[k]; if (Math.abs(p.y - s.y) < 0.05 && p.x > s.x0 - 0.4 && p.x < s.x1 + 0.4) return k; }
    return null;
  }
  const J = (dir, landY, stopX, extra) => Object.assign({ jump: dir, landY, stopX }, extra || {});
  const routes = {
    A: [{ go: 3.6 }, J(1, 3, 6.0)],
    B: [{ go: 3.6 }, J(1, 3, 6.0), { go: 7.3 }, J(1, 5, 11.0)],
    C: [{ go: 13.6 }, J(1, 3, 16.0)],
    D: [{ go: 13.6 }, J(1, 3, 16.0), { go: 17.3 }, J(1, 5, 20.8)],
    E: [{ go: 22.4 }, J(1, 3, 23.9)],
    F: [{ go: 22.4 }, J(1, 3, 23.9), { go: 25.0 }, J(1, 5, 26.6)],
  };
  // aller sur la surface « target » depuis n'importe où
  function pathTo(p, target) {
    const cur = surfaceOf(p);
    const land = { until: (env) => (env.p.onGround ? { done: true, inp: {} } : { inp: {} }) };
    if (cur === null) return [land].concat(pathTo({ x: p.x, y: 1, onGround: true }, target));
    if (cur === target) return [];
    if (cur === 'E' && target === 'F') return [{ go: 25.0 }, J(1, 5, 26.6)];
    if (cur === 'A' && target === 'B') return [{ go: 7.3 }, J(1, 5, 11.0)];
    if (cur === 'C' && target === 'D') return [{ go: 17.3 }, J(1, 5, 20.8)];
    const down = cur === 'floor' ? [] : [{ go: S[cur].x1 + 0.55 }, land];
    return target === 'floor' ? down : down.concat(routes[target]);
  }
  window.bossPlan = function (role) {
    return (env) => {
      const { p, B } = env;
      if (!B || B.outro > 0) return [];
      if (role === 'helper') {
        if (B.phase === 2) return pathTo(p, 'floor').concat([{ go: 13.5 }, { stay: 99999 }]);
        return pathTo(p, 'A').concat([{ go: 5.6 }, { stay: 99999 }]);
      }
      if (B.phase === 0) {
        const bolt = B.bolts[B.hits];
        if (bolt.y <= 4.1) return pathTo(p, 'floor').concat([{ go: 28.55 }, { jump: 0, hold: 40 }]);
        return pathTo(p, 'F').concat([{ go: 27.75 }, { jump: 0, hold: 40 }]);
      }
      if (B.phase === 1) {
        const m = B.motors[B.realMotor];
        const surf = m.i === 0 ? 'A' : m.i === 1 ? 'B' : m.i === 2 ? 'floor' : 'D';
        return pathTo(p, surf).concat([{ go: m.x }, { jump: 0, hold: 40 }]);
      }
      if (B.phase === 2) {
        if (B.shieldOffT > 0.05) return pathTo(p, 'floor').concat([{ go: 28.55, run: 1 }, { jump: 0, hold: 40 }]);
        if (role === 'striker') return pathTo(p, 'floor').concat([{ go: 24 }, { stay: 99999 }]);
        return pathTo(p, 'floor').concat([{ go: 13.5 }, { stay: 2 }]);
      }
      return [];
    };
  };
  window.bossKey = (env) => { const B = env.B; return B ? [B.phase, B.hits, B.coreHits, B.shieldOffT > 0.05 ? 1 : 0, B.realMotor].join('|') : ''; };
  // éviter les ondes de choc (saut quand une onde arrive)
  const wmem = [0, 0];
  window.waveHook = (env, i, inp) => {
    const { p, R } = env;
    if (wmem[i] > 0) { wmem[i]--; return { jump: true }; }
    if (!p.onGround || p.y > 1.05) return null;
    for (const h of R.hazards) if (h.type === 'wave' && h.x - p.x > 0.35 && h.x - p.x < 1.7) { wmem[i] = 30; return { jump: true, jumpP: true }; }
    return null;
  };
})();
