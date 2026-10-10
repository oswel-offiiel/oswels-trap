// Bots de test : appuient sur le bouton d'action devant la VRAIE porte et devant les BONNES caisses
(function () {
  const G = OT.Game;
  if (G._simRaw) return;
  G._simRaw = G._sim;
  G._sim = function (n, fn) {
    const d = G._dbg;
    return G._simRaw.call(G, n, (k, i) => {
      const o = Object.assign({}, (fn ? fn(k, i) : {}) || {});
      const R = d.R, p = d.players[i];
      if (p && R && p.alive && !p.finished && !o.talkP && k % 3 === 0) {
        const b = { x0: p.x - p.w / 2, y0: p.y, x1: p.x + p.w / 2, y1: p.y + p.h };
        let use = (R.ents.door || []).some((dd) => dd.x === dd.tx && !dd.trap && b.x0 < dd.x + 1.05 && b.x1 > dd.x - 0.05 && b.y0 < dd.y + 1.8 && b.y1 > dd.y);
        for (let y = Math.floor(p.y) - 1; y <= Math.floor(p.y) + 1 && !use; y++) for (let x = Math.floor(p.x) - 1; x <= Math.floor(p.x) + 1; x++) {
          const t = R.tiles[y] && R.tiles[y][x];
          if (t && t.ch === 'h' && t.state === 'idle' && Math.abs(p.x - (x + 0.5)) < 1 && Math.abs(p.y - y) < 1.2) use = true;
        }
        if (use) o.talkP = true;
      }
      return o;
    });
  };
})();
