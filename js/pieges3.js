/* =====================================================================
   OSWEL'S TRAP — pieges3.js  (version 1.5 : les NOUVEAUX PIÈGES)

   Des pièges qui SURPRENNENT, mais qui suivent toujours une règle qu'on peut
   comprendre après coup (esprit « Level Devil », version Oswel's Trap).
   Chaque piège a :
     - un INDICE discret (fente dans le sol, petits trous, plateforme trop claire,
       portail qui tourne à l'envers…) ;
     - un DÉLAI de réaction (rien ne surgit directement dans le joueur) ;
     - une zone mortelle qui correspond EXACTEMENT à ce qu'on voit ;
     - une remise à zéro complète quand l'équipe recommence.

   Les pièges (type d'entité ou tuile → section qui le construit) :
     'O' + hole       → shiftHole   TROU BALADEUR : il se décale de 2 cases quand on saute près de lui
     popspike         → popSpikes   PICS CACHÉS : ils sortent quand on marche / atterrit / passe dessous
     'S' + ghost      → ghostRoute  PLATEFORMES FANTÔMES : elles lâchent si on s'y arrête (0,3 s)
     popwall          → popWall     MUR SURGISSANT + le sol s'effondre derrière (il redescend après 3 s)
     ceilpress        → ceilPress   PLAFOND QUI DESCEND dès qu'on entre dans le couloir
     kickdoor         → kickDoor    FAUSSE SORTIE qui te renvoie en arrière (la vraie route passe en haut)
     flappy           → flappyPipes ZONE « BATTEMENT » : chaque appui sur SAUT donne un petit coup d'aile
     chasesaw         → sawChase    SCIE QUI POURSUIT (logique fixe : elle va vers toi, moins vite que toi)
     bombcoin         → baitCoin    PIÈCE APPÂT : la ramasser fait tomber des bombes (ombres rouges)
     backcoin         → backCoin    PIÈCE OUBLIÉE : elle apparaît derrière toi… le sol y est piégé
     pattern          → patternPlat MÊME RYTHME ? la 4e plateforme se décale quand tu es sur la 3e
     wrap             → wrapRoom    BORD = AUTRE BORD (seulement dans cette salle, cadres bleus)
   + la porte « timide » (hook) : une porte de zone qui fait un pas de côté quand on saute près d'elle.

   Placement : chaque monde introduit un piège, puis le varie, puis le combine
   (voir la fin de ce fichier : OT.PIEGES3_PLACEMENT). Le robot de test sait les
   franchir (tools/validation/robots/secbots_pieges.js).
   ===================================================================== */
window.OT = window.OT || {};

(function () {
  const GX = OT.GameExt, SEC = OT.Sections;
  if (!GX || !SEC) return;
  const S = SEC.S, floor = SEC.floor, note = SEC.note;
  const T = () => window.THREE;

  /* ---------- petits outils partagés ---------- */
  const GEO = {}, MAT = {};
  const STILL = { dx: 0, dy: 0, auto: true };   // « ref » d'un solide immobile (le moteur lit ref.dx / ref.dy)
  // géométries partagées (jamais libérées au changement de niveau)
  function geo(k, mk) { if (!GEO[k]) { GEO[k] = mk(); GEO[k].userData.shared = true; } return GEO[k]; }
  function mat(k, mk) { return MAT[k] || (MAT[k] = mk()); }
  const basic = (c, o) => new (T().MeshBasicMaterial)(Object.assign({ color: c, toneMapped: false }, o || {}));
  const slab = (X) => { const g = X.M.slabGeo(1); g.userData.shared = true; return g; };
  const tm = (X) => X.R.TM || { plate: X.M.MAT.steel, top: X.M.MAT.steel, rust: X.M.MAT.steel };
  const feetOn = (p, x0, x1, gy) => p.onGround && Math.abs(p.y - gy) < 0.12 && p.x + 0.28 > x0 && p.x - 0.28 < x1;
  const say = (X, x, y, text, color, who) => X.bubble(x, y, text, 2.4, color || '#ffd23f', who);
  // une réaction du héros (une seule fois par piège et par tentative, sans bavardage)
  function react(X, kind, p, delay) {
    const R0 = X.R;
    setTimeout(() => { if (X.R === R0 && X.state === 'play') X.heroBark(kind, p || null); }, (delay || 0.5) * 1000);
  }
  // les événements « saut » et « atterrissage » de chaque joueur (calculés à la fin de chaque pas)
  GX.on('update', (alive, dt, X) => {
    for (const p of X.players) {
      p.j3 = !!(p.jumped && !p.j3prev); p.j3prev = !!p.jumped;
      p.land3 = !!(p.onGround && !p.g3prev); p.g3prev = !!p.onGround;
      p.x3prev = p.x3 === undefined ? p.x : p.x3; p.x3 = p.x;
    }
  });

  /* ==================================================================
     1. LE TROU BALADEUR  (tuile 'O' + entité 'hole')
     Le sol 'O' ressemble au sol normal ; une fine fente court le long de son bord
     (l'indice). Quand un joueur SAUTE à moins de 4,5 cases avant le trou, le trou
     glisse de 2 cases vers l'avant… exactement là où il comptait atterrir.
     Pour passer : un petit saut AVANT (il se décale tôt), ou un grand saut en courant.
     ================================================================== */
  GX.tile('O', {
    make(t, X) {
      t.mesh = new (T().Mesh)(slab(X), [tm(X).plate, tm(X).top]);
      const seam = new (T().Mesh)(geo('seam', () => new (T().BoxGeometry)(1.0, 0.035, 0.04)), mat('seam', () => basic(0x0d0a08, { transparent: true, opacity: 0.75 })));
      seam.position.set(0.5, 1.005, 0.86); t.mesh.add(seam);
      t.hole = false;
    },
    solid: (t) => !t.hole,
  });
  function holeApply(H, X, fx) {
    const hx = H.h0 + (H.shifted ? H.sh : 0);
    for (const t of H.tiles) {
      const was = t.hole;
      t.hole = t.x >= hx && t.x < hx + H.w;
      t.mesh.visible = !t.hole;
      if (fx && was !== t.hole) X.burst(t.x + 0.5, H.y + 1, 6, [0x9c8f80, 0x5d5148], 3, { up: 1, life: 0.4 });
    }
  }
  GX.type('hole', {
    make(e, group, X) {
      const H = { x0: e.x0, x1: e.x1, y: e.y, h0: e.h0, w: e.w || 2, sh: e.sh || 2, shifted: false, tiles: [] };
      for (let x = e.x0; x <= e.x1; x++) { const t = X.R.tiles[e.y] && X.R.tiles[e.y][x]; if (t && t.ch0 === 'O') H.tiles.push(t); }
      holeApply(H, X, false);
      return H;
    },
    update(list, alive, dt, X) {
      for (const H of list) {
        if (H.shifted || H.frzT > 0) continue;   // (COMPILÉ par Tony : il ne glisse pas pendant 2 s)
        const p = alive.find((q) => q.j3 && q.x > H.h0 - 4.6 && q.x < H.h0 + 0.4 && q.y < H.y + 2.2);
        if (!p) continue;
        H.shifted = true; holeApply(H, X, true);
        OT.Sound.slam(); X.rumble(-1, 0.3, 0.4, 140); X.shake(0.08);
        X.R.seen3 = X.R.seen3 || {};
        if (!X.R.seen3.hole) { X.R.seen3.hole = true; react(X, 't_hole', p, 0.7); }
      }
    },
    reset(list, X) { for (const H of list) { H.shifted = false; holeApply(H, X, false); } },
  });
  S.shiftHole = (L, x, o) => {
    const x0 = x, len = 18;
    floor(L, x, x + 5);
    for (let k = x + 6; k <= x + 13; k++) L.set(k, 0, 'O');
    const h0 = x + 8;
    L.add('hole', h0, 0, { x0: x + 6, x1: x + 13, y: 0, h0, w: 2, sh: 2 });
    floor(L, x + 14, x + len - 1);
    // combinaison : des pics cachés là où l'on atterrit après un grand saut (ils préviennent : 0,3 s)
    if (o.landSpikes) L.add('popspike', x + 14, 0, { x0: x + 14, x1: x + 15, y: 0, mode: 'land' });
    if (o.coins) L.coin(h0 + 1, 4);
    note(L, 'shiftHole', x0, x + len, { h0, w: 2, sh: 2, land: !!o.landSpikes });
    return x + len;
  };

  /* ==================================================================
     2. LES PICS CACHÉS  (entité 'popspike')
     mode 'step' : ils sortent quand on MARCHE dessus (de petits trous dans le sol)
     mode 'land' : seulement quand on ATTERRIT dessus
     mode 'ceil' : au plafond, ils descendent quand on passe DESSOUS (ne saute pas là)
     off : panneau « HORS SERVICE »… sa lampe clignote juste avant qu'ils sortent
     Toujours : un « clic » et les pointes qui dépassent 0,32 s (0,5 s si « hors service »)
     avant de devenir mortels. Ils restent 1,1 s, puis rentrent.
     ================================================================== */
  const spikeGeo = () => geo('spk', () => new (T().ConeGeometry)(0.13, 0.5, 6));
  const spikeMat = () => mat('spk', () => new (T().MeshStandardMaterial)({ color: 0xc9ced6, metalness: 0.8, roughness: 0.3 }));
  GX.type('popspike', {
    make(e, group, X) {
      const P = { x0: e.x0, x1: e.x1, y: e.y, mode: e.mode || 'step', off: !!e.off, arm: e.off ? 0.5 : 0.32, up: 1.1, st: 'idle', t: 0, e: 0 };
      const g = new (T().Group)();
      P.cones = [];
      const ceil = P.mode === 'ceil';
      for (let x = P.x0; x <= P.x1; x++) for (let k = 0; k < 3; k++) {
        const c = new (T().Mesh)(spikeGeo(), spikeMat());
        c.position.set(x + 0.2 + k * 0.3, 0, 0.2 - k * 0.2);
        if (ceil) c.rotation.z = Math.PI;
        g.add(c); P.cones.push(c);
      }
      // l'indice : de petits trous sombres dans le sol (ou au plafond)
      const holeM = mat('pkhole', () => basic(0x050505, { transparent: true, opacity: 0.55 }));
      const hg = geo('pkh', () => new (T().CircleGeometry)(0.06, 8));
      for (let x = P.x0; x <= P.x1; x++) for (let k = 0; k < 3; k++) {
        const h = new (T().Mesh)(hg, holeM);
        h.rotation.x = ceil ? Math.PI / 2 : -Math.PI / 2;
        h.position.set(x + 0.2 + k * 0.3, ceil ? P.y - 0.006 : P.y + 1.006, 0.2 - k * 0.2);
        g.add(h);
      }
      g.position.set(0, ceil ? P.y : P.y + 1, 0);
      if (ceil) g.children.forEach((c) => { if (c.geometry === hg) c.position.y = -0.006; });
      else g.children.forEach((c) => { if (c.geometry === hg) c.position.y = 0.006; });
      group.add(g); P.g = g;
      if (P.off) {
        const lab = X.M.label('HORS SERVICE', { size: 22, h: 0.26, color: '#ffd23f', bg: 'rgba(20,20,20,0.85)', border: '#ffd23f' });
        lab.position.set((P.x0 + P.x1 + 1) / 2, P.y + 2.6, 0.6); group.add(lab);
        P.lamp = new (T().Mesh)(geo('lamp', () => new (T().SphereGeometry)(0.12, 10, 8)), basic(0x333333));
        P.lamp.position.set((P.x0 + P.x1 + 1) / 2, P.y + 2.25, 0.6); group.add(P.lamp);
      }
      this.pose(P);
      return P;
    },
    pose(P) {
      const ceil = P.mode === 'ceil';
      for (const c of P.cones) {
        c.visible = P.e > 0.02;
        const s = Math.max(0.02, P.e);
        c.scale.set(1, s, 1);
        c.position.y = ceil ? -0.25 * s : 0.25 * s;
      }
    },
    update(list, alive, dt, X) {
      for (const P of list) {
        if (P.frzT > 0) continue;   // COMPILÉS par Tony : figés (et inoffensifs) 2 s
        P.t -= dt;
        if (P.st === 'idle') {
          let p = null;
          if (P.mode === 'step') p = alive.find((q) => feetOn(q, P.x0, P.x1 + 1, P.y + 1));
          else if (P.mode === 'land') p = alive.find((q) => q.land3 && feetOn(q, P.x0, P.x1 + 1, P.y + 1));
          else p = alive.find((q) => q.x + 0.28 > P.x0 && q.x - 0.28 < P.x1 + 1 && q.y < P.y && q.y > P.y - 4);
          if (p) { P.st = 'arm'; P.t = P.arm; P.who = p; OT.Sound.click(); X.rumble(p.i, 0, 0.3, 80); }
          P.e = 0;
        } else if (P.st === 'arm') {
          P.e = 0.18;   // les pointes dépassent : c'est l'avertissement
          if (P.lamp) P.lamp.material.color.set(Math.sin(X.time * 40) > 0 ? 0xff3020 : 0x331010);
          if (P.t <= 0) {
            P.st = 'up'; P.t = P.up; OT.Sound.slam ? OT.Sound.slam() : 0;
            X.burst((P.x0 + P.x1 + 1) / 2, P.mode === 'ceil' ? P.y - 0.2 : P.y + 1.1, 8, [0xc9ced6, 0xffffff], 3, { up: 1, life: 0.3 });
            X.R.seen3 = X.R.seen3 || {};
            if (!X.R.seen3['spk' + P.x0]) { X.R.seen3['spk' + P.x0] = true; react(X, P.mode === 'ceil' ? 't_ceil' : 't_spikes', P.who, 0.5); }
          }
        } else if (P.st === 'up') {
          P.e = Math.min(1, P.e + dt * 14);
          if (P.lamp) P.lamp.material.color.set(0xff3020);
          if (P.e > 0.6) {
            const z = P.mode === 'ceil'
              ? { x0: P.x0 + 0.08, x1: P.x1 + 0.92, y0: P.y - 0.5 * P.e, y1: P.y }
              : { x0: P.x0 + 0.08, x1: P.x1 + 0.92, y0: P.y + 1, y1: P.y + 1 + 0.5 * P.e };
            for (const p of alive) if (X.overlap(X.pbox(p), z)) X.kill(p, 'spike');
          }
          if (P.t <= 0) { P.st = 'down'; P.t = 0.3; }
        } else if (P.st === 'down') {
          P.e = Math.max(0, P.e - dt * 4);
          if (P.t <= 0) { P.st = 'cool'; P.t = 0.8; if (P.lamp) P.lamp.material.color.set(0x333333); }
        } else if (P.st === 'cool') { P.e = 0; if (P.t <= 0) P.st = 'idle'; }
        this.pose(P);
      }
    },
    reset(list) { for (const P of list) { P.st = 'idle'; P.t = 0; P.e = 0; if (P.lamp) P.lamp.material.color.set(0x333333); this.pose(P); } },
  });
  S.popSpikes = (L, x, o) => {
    // un couloir calme… avec des groupes de pics cachés ; o.mode, o.off (hors service), o.ceil (hauteur du plafond)
    const x0 = x, len = o.len || 18, groups = [];
    floor(L, x, x + len - 1);
    const at = o.at || [5, 11];
    for (const a of at) {
      const gx = x + a, w = o.w || 2;
      if (o.mode === 'ceil') {
        const cy = o.ceil || 3;
        L.rect(gx - 1, cy, gx + w, L.h - 1, '#');                 // un plafond bas, les pics dessous
        L.add('popspike', gx, cy, { x0: gx, x1: gx + w - 1, y: cy, mode: 'ceil' });
      } else L.add('popspike', gx, 0, { x0: gx, x1: gx + w - 1, y: 0, mode: o.mode || 'step', off: !!o.off });
      groups.push([gx, gx + w - 1]);
    }
    if (o.coins) L.coin(x + at[0] + 1, o.mode === 'ceil' ? 2 : 3);
    if (o.sign) L.sign(x + 1, 1, o.sign);
    note(L, 'popSpikes', x0, x + len, { groups, mode: o.mode || 'step', ceil: o.ceil || 3 });
    return x + len;
  };

  /* ==================================================================
     3. LES PLATEFORMES FANTÔMES  (tuile 'S' + entité 'ghost')
     Un peu plus claires que les autres, elles « respirent » doucement et n'ont pas
     d'ombre (l'indice). Si on s'y ARRÊTE plus de 0,3 s, elles disparaissent 2,6 s.
     On peut les enchaîner en sautant sans s'arrêter.
     ================================================================== */
  GX.tile('S', {
    make(t, X) {
      const R = X.R;
      if (!R.ghostMats) {
        const a = tm(X).plate.clone(), b = tm(X).top.clone();
        for (const m of [a, b]) { m.transparent = true; m.opacity = 0.9; if (m.emissive) { m.emissive = new (T().Color)(0x9fd8ff); m.emissiveIntensity = 0.12; } }
        R.ghostMats = [a, b];
      }
      t.mesh = new (T().Mesh)(slab(X), R.ghostMats);
      t.mesh.castShadow = false; t.gone = false;
    },
    solid: (t) => !t.gone,
  });
  GX.type('ghost', {
    make(e, group, X) {
      const G = { x0: e.x0, x1: e.x1, y: e.y, st: 'idle', t: 0, tiles: [] };
      for (let x = e.x0; x <= e.x1; x++) { const t = X.R.tiles[e.y] && X.R.tiles[e.y][x]; if (t && t.ch0 === 'S') G.tiles.push(t); }
      return G;
    },
    update(list, alive, dt, X) {
      const mats = X.R.ghostMats;
      if (mats) { const o = 0.86 + Math.sin(X.time * 2.2) * 0.06; mats[0].opacity = o; mats[1].opacity = o; }
      for (const G of list) {
        if (G.frzT > 0 && G.st !== 'gone') { G.st = 'idle'; continue; }   // COMPILÉE : elle tient 2 s même si on s'y arrête
        G.t -= dt;
        const on = alive.find((p) => feetOn(p, G.x0, G.x1 + 1, G.y + 1));
        if (G.st === 'idle') { if (on) { G.st = 'trust'; G.t = 0.3; G.who = on; } }
        else if (G.st === 'trust') {
          if (!on) G.st = 'idle';   // on est reparti à temps
          else if (G.t <= 0) {
            G.st = 'gone'; G.t = 2.6;
            for (const t of G.tiles) { t.gone = true; t.mesh.visible = false; }
            X.burst((G.x0 + G.x1 + 1) / 2, G.y + 0.5, 14, [0x9fd8ff, 0xffffff], 3, { grav: -0.2, life: 0.5 });
            OT.Sound.whoosh();
            X.R.seen3 = X.R.seen3 || {};
            if (!X.R.seen3.ghost) { X.R.seen3.ghost = true; react(X, 't_ghost', G.who, 0.4); }
          }
        } else if (G.st === 'gone' && G.t <= 0) {
          const blocked = X.players.some((p) => p.alive && p.x + 0.33 > G.x0 && p.x - 0.33 < G.x1 + 1 && p.y < G.y + 1 && p.y + 0.9 > G.y);
          if (!blocked) { G.st = 'idle'; for (const t of G.tiles) { t.gone = false; t.mesh.visible = true; } }
        }
      }
    },
    reset(list) { for (const G of list) { G.st = 'idle'; G.t = 0; for (const t of G.tiles) { t.gone = false; t.mesh.visible = true; } } },
  });
  const ghostRow = (L, x0, x1, y) => { for (let k = x0; k <= x1; k++) L.set(k, y, 'S'); L.add('ghost', x0, y, { x0, x1, y }); };
  S.ghostRoute = (L, x, o) => {
    // deux chemins : en bas des îlots sûrs au-dessus des pics ; en haut des plateformes FANTÔMES avec des pièces
    const x0 = x;
    floor(L, x, x + 4);
    L.rect(x + 3, 1, x + 3, 1, '#');                          // deux marches (dessus à 2, puis à 4)…
    L.rect(x + 4, 1, x + 4, 3, '#');                          // …d'où partent les deux chemins
    const isl = [], gh = [];
    let cx = x + 5;
    for (let i = 0; i < 4; i++) {
      L.rect(cx, 0, cx + 1, 0, '^');                          // pics
      L.rect(cx + 2, 0, cx + 3, 0, '#'); isl.push([cx + 2, cx + 4]);   // îlot sûr
      cx += 4;
    }
    for (let i = 0; i < 3; i++) { const gx = x + 6 + i * 5; ghostRow(L, gx, gx + 1, 5); gh.push([gx, gx + 2]); if (o.coins !== false) L.coin(gx + 1, 7); }
    L.rect(cx, 0, cx + 3, 0, '#');
    if (o.sign !== false) L.sign(x + 1, 1, o.sign || 'Il paraît que les plateformes claires sont les plus sûres.');
    note(L, 'ghostRoute', x0, cx + 4, { isl, gh, step: x + 3 });
    return cx + 4;
  };

  /* ==================================================================
     4. LE MUR SURGISSANT  (entité 'popwall')
     Une fente dans le sol (l'indice). Quand on dépasse le déclencheur, un mur jaillit
     (0,35 s) quatre cases plus loin… et le sol fissuré derrière toi s'effondre.
     Pas de panique : le mur redescend au bout de 3 s. On attend sur le palier.
     ================================================================== */
  GX.type('popwall', {
    make(e, group, X) {
      const W = { tx: e.tx, wx: e.wx, gy: e.gy || 1, h: e.h || 3, bx0: e.bx0, bx1: e.bx1, st: 'idle', t: 0, e: 0 };
      const m = new (T().Mesh)(geo('pw', () => new (T().BoxGeometry)(0.96, 1, 1.6)), tm(X).plate);
      const stripe = new (T().Mesh)(geo('pws', () => new (T().BoxGeometry)(1.0, 0.18, 1.65)), mat('pws', () => basic(0xffd23f)));
      m.add(stripe); stripe.position.y = 0.45;
      group.add(m); W.mesh = m; W.stripe = stripe;
      const slit = new (T().Mesh)(geo('seam', () => new (T().BoxGeometry)(1.0, 0.035, 0.04)), mat('seam', () => basic(0x0d0a08, { transparent: true, opacity: 0.75 })));
      slit.scale.set(0.9, 1, 30); slit.position.set(W.wx + 0.5, W.gy + 0.006, 0); group.add(slit);
      this.pose(W);
      return W;
    },
    pose(W) {
      const hh = Math.max(0.01, W.e * W.h);
      W.mesh.visible = W.e > 0.01;
      W.mesh.scale.set(1, hh, 1); W.mesh.position.set(W.wx + 0.5, W.gy + hh / 2, 0);
      W.stripe.scale.set(1, 1 / hh * 0.18 / 0.18, 1); W.stripe.position.y = 0.5 - 0.09 / hh;
    },
    update(list, alive, dt, X) {
      for (const W of list) {
        if (W.frzT > 0) continue;   // COMPILÉ : il ne bouge plus 2 s
        W.t -= dt;
        if (W.st === 'idle') {
          const p = alive.find((q) => q.x3prev !== undefined && q.x3prev <= W.tx && q.x > W.tx && q.y < W.gy + 2);
          const inCol = alive.some((q) => q.x + 0.33 > W.wx && q.x - 0.33 < W.wx + 1);
          if (p && !inCol) {
            W.st = 'rise'; W.t = 0.35; OT.Sound.slam(); X.rumble(-1, 0.5, 0.4, 200); X.shake(0.12);
            X.burst(W.wx + 0.5, W.gy, 12, [0x9c8f80, 0xffd23f], 4, { up: 2 });
            for (let x = W.bx0; x <= W.bx1; x++) X.dropTile(x, W.gy - 1);   // le chemin s'effondre derrière
            X.R.seen3 = X.R.seen3 || {};
            if (!X.R.seen3.wall) { X.R.seen3.wall = true; react(X, 't_wall', p, 0.6); }
          }
        } else if (W.st === 'rise') { W.e = Math.min(1, W.e + dt / 0.35); if (W.t <= 0) { W.st = 'up'; W.t = 3.0; W.e = 1; } }
        else if (W.st === 'up') { if (W.t < 0.6 && Math.sin(X.time * 30) > 0) W.stripe.material.color.set(0xff3020); if (W.t <= 0) { W.st = 'down'; W.t = 0.4; OT.Sound.whoosh(); } }
        else if (W.st === 'down') { W.e = Math.max(0, W.e - dt / 0.4); if (W.t <= 0) { W.st = 'cool'; W.t = 1.0; W.e = 0; } }
        else if (W.st === 'cool' && W.t <= 0) W.st = 'idle';
        if (W.st !== 'up') W.stripe.material.color.set(0xffd23f);
        this.pose(W);
      }
    },
    solids(list, b, out) {
      for (const W of list) if (W.e > 0.02 && b.x1 > W.wx - 1 && b.x0 < W.wx + 2) out.push({ x0: W.wx + 0.02, y0: W.gy, x1: W.wx + 0.98, y1: W.gy + W.e * W.h, plat: true, popwall: W, ref: STILL });
    },
    reset(list) { for (const W of list) { W.st = 'idle'; W.t = 0; W.e = 0; this.pose(W); } },
  });
  S.popWall = (L, x, o) => {
    const x0 = x, len = 20;
    floor(L, x, x + len - 1);
    L.trapFloor(x + 5, x + 7, 0);                              // le sol fissuré, derrière le déclencheur
    const tx = x + 9, wx = x + 13;
    L.add('popwall', wx, 1, { tx: tx + 0.5, wx, gy: 1, h: 3, bx0: x + 5, bx1: x + 7 });
    if (o.coins !== false) L.coin(x + 11, 2);
    note(L, 'popWall', x0, x + len, { tx: tx + 0.5, wx });
    return x + len;
  };

  /* ==================================================================
     5. LE PLAFOND QUI DESCEND  (entité 'ceilpress')
     Quand on entre dans le couloir, tout le plafond descend lentement (0,75 case/s) :
     il grince, la poussière tombe, la manette tremble. Il ne faut pas traîner…
     ni revenir en arrière. Il remonte quand tout le monde est sorti.
     ================================================================== */
  GX.type('ceilpress', {
    make(e, group, X) {
      // (en coop, le plafond descend un peu moins vite : le partenaire qui suit n'est pas écrasé pour 1 s de retard)
      const C = { x0: e.x0, x1: e.x1, gy: e.gy || 1, top: e.top || 4.2, sp: (e.sp || 0.75) * (X.mode === 'coop' ? 0.72 : 1), u: e.top || 4.2, st: 'idle', t: 0 };
      const H = X.R.H;
      const m = new (T().Mesh)(geo('cp', () => new (T().BoxGeometry)(1, 1, 1.8)), tm(X).plate);
      m.scale.set(C.x1 - C.x0 + 1, 1, 1); group.add(m); C.mesh = m; C.H = H;
      const red = new (T().Mesh)(geo('cpr', () => new (T().BoxGeometry)(1, 0.08, 1.85)), mat('cpr', () => basic(0xff3020)));
      red.scale.x = C.x1 - C.x0 + 1; group.add(red); C.red = red;
      this.pose(C);
      return C;
    },
    pose(C) {
      const h = C.H - C.u;
      C.mesh.scale.y = h; C.mesh.position.set((C.x0 + C.x1 + 1) / 2, C.u + h / 2, 0);
      C.red.position.set((C.x0 + C.x1 + 1) / 2, C.u + 0.04, 0);
    },
    update(list, alive, dt, X) {
      for (const C of list) {
        if (C.frzT > 0) continue;   // COMPILÉ : le plafond s'arrête 2 s
        const inside = alive.filter((p) => p.x > C.x0 + 0.3 && p.x < C.x1 + 0.7);
        if (C.st === 'idle' && inside.length) {
          C.st = 'down'; OT.Sound.crumble(); X.rumble(-1, 0.2, 0.5, 300);
          X.R.seen3 = X.R.seen3 || {};
          if (!X.R.seen3.ceil) { X.R.seen3.ceil = true; react(X, 't_press', inside[0], 0.8); }
        }
        if (C.st === 'down') {
          // en COOP il faut faire passer deux joueurs (et le 2e trouve souvent les pics déjà sortis) : il descend moins vite
          C.u = Math.max(C.gy + 0.4, C.u - C.sp * (X.mode === 'coop' ? 0.6 : 1) * dt);
          if (Math.random() < 0.3) X.burst(C.x0 + Math.random() * (C.x1 - C.x0 + 1), C.u - 0.05, 1, [0x9c8f80], 1, { life: 0.6 });
          C.red.visible = Math.sin(X.time * 12) > 0;
          for (const p of alive) if (p.x + 0.3 > C.x0 && p.x - 0.3 < C.x1 + 1 && p.y + 0.9 > C.u - 0.02 && p.y < C.u) X.kill(p, 'crush');
          const allOut = !alive.some((p) => p.x > C.x0 - 0.5 && p.x < C.x1 + 1.3);
          if ((C.u <= C.gy + 0.41 && (C.t += dt) > 1) || (allOut && C.u < C.top - 0.3)) { C.st = 'up'; C.t = 0; }
        } else if (C.st === 'up') {
          C.red.visible = false;
          C.u = Math.min(C.top, C.u + 2 * dt);
          if (C.u >= C.top) { C.st = alive.some((p) => p.x > C.x0 + 0.3 && p.x < C.x1 + 0.7) ? 'up' : 'idle'; C.t = 0; }
        }
        this.pose(C);
      }
    },
    solids(list, b, out) {
      for (const C of list) if (b.x1 > C.x0 - 1 && b.x0 < C.x1 + 2) out.push({ x0: C.x0, y0: C.u, x1: C.x1 + 1, y1: C.H, plat: true, press: C, ref: STILL });
    },
    reset(list) { for (const C of list) { C.st = 'idle'; C.u = C.top; C.t = 0; C.red.visible = false; this.pose(C); } },
  });
  S.ceilPress = (L, x, o) => {
    const x0 = x, len = o.len || 16;
    floor(L, x, x + len + 5);
    const c0 = x + 3, c1 = x + 2 + len;
    L.rect(c0 - 1, 5, c0 - 1, L.h - 1, '#'); L.rect(c1 + 1, 5, c1 + 1, L.h - 1, '#');   // les montants du couloir
    L.add('ceilpress', c0, 1, { x0: c0, x1: c1, gy: 1, top: 4.4, sp: o.sp || 0.75 });
    if (o.spikes) L.add('popspike', c0 + 6, 0, { x0: c0 + 6, x1: c0 + 7, y: 0, mode: 'step' });
    if (o.coins) L.coin(c0 + 3, 2);
    note(L, 'ceilPress', x0, x + len + 6, { c0, c1, spikes: o.spikes ? [c0 + 6, c0 + 7] : null });
    return x + len + 6;
  };

  /* ==================================================================
     6. LA FAUSSE SORTIE QUI RENVOIE  (entité 'kickdoor')
     Une porte « SORTIE » au bout du chemin du bas. Son tourbillon tourne à l'envers
     (comme toutes les fausses portes du jeu : l'indice). Si on veut y entrer
     (bouton ACTION), elle te renvoie en arrière… au-dessus d'un sol qui s'effondre.
     On survit si on court aussitôt. La vraie route passe en HAUT (une marche, une corniche).
     ================================================================== */
  GX.type('kickdoor', {
    make(e, group, X) {
      const d = X.M.door('SORTIE'); d.position.set(e.x + 0.5, e.y, -0.5); group.add(d);
      return { x: e.x, y: e.y, mesh: d, portal: d.userData.portal, tex: d.userData.portalTex, used: 0 };
    },
    update(list, alive, dt, X) {
      for (const K of list) {
        if (K.tex) K.tex.offset.y = ((-X.time * 0.4) % 1 + 1) % 1;   // il tourne à l'envers
        K.used = Math.max(0, K.used - dt);
        for (const p of alive) {
          if (!(Math.abs(p.x - (K.x + 0.5)) < 0.7 && Math.abs(p.y - K.y) < 0.6)) continue;
          if (!(p.useT > 0) || K.used > 0) continue;
          p.useT = 0; K.used = 1;
          p.vx = -6.5; p.vy = 8; p.onGround = false; p.ctrlLock = 0.3; p.cut = true;   // projeté en arrière, au bord du vide
          OT.Sound.spring ? OT.Sound.spring() : OT.Sound.whoosh(); X.rumble(p.i, 0.5, 0.6, 200); X.shake(0.15);
          say(X, K.x, K.y + 2.8, 'Sortie ? Non. Retour à l\'envoyeur !', '#ff5533');
          X.R.seen3 = X.R.seen3 || {}; X.R.seen3.kick = true;
          react(X, 'fake', p, 0.9);
        }
      }
    },
  });
  S.kickDoor = (L, x, o) => {
    // en bas : un pont rouillé puis la fausse sortie ; en haut : marches → corniche → passerelle → la suite
    const x0 = x;
    floor(L, x, x + 3);
    L.rect(x + 2, 1, x + 2, 1, '#'); L.rect(x + 3, 1, x + 3, 2, '#');   // deux marches (dessus à 2 puis 3)
    L.rect(x + 4, 0, x + 11, 0, '^');
    L.crumble(x + 4, x + 11, 1, 0.55);                        // le pont rouillé (dessus à 2) : il revient 3 s après
    L.rect(x + 12, 0, x + 16, 1, '#');                        // palier de la fausse porte (dessus à 2)
    L.add('kickdoor', x + 16, 2, {});
    L.rect(x + 17, 0, x + 17, L.h - 2, '#');                 // un mur : la vraie suite n'est pas par là
    L.rect(x + 6, 4, x + 9, 4, '#');                          // la corniche (dessus à 5)
    L.rect(x + 12, 6, x + 21, 6, '#');                        // la passerelle du haut (dessus à 7), au-dessus du mur
    L.rect(x + 17, 7, x + 17, 8, ' ');
    L.rect(x + 18, 0, x + 23, 0, '#');                        // on redescend de l'autre côté
    if (o.coins !== false) L.coin(x + 7, 6);
    note(L, 'kickDoor', x0, x + 24, { stair: x + 3, ledge: [x + 6, x + 10], bridge: [x + 12, x + 22], door: x + 16 });
    return x + 24;
  };

  /* ==================================================================
     7. LA ZONE « BATTEMENT »  (entité 'flappy')
     Une zone bleue clairement signalée : dedans, CHAQUE appui sur SAUT donne un petit
     coup d'aile (même en l'air). La gravité ne change pas. On traverse des « tuyaux ».
     ================================================================== */
  GX.type('flappy', {
    make(e, group, X) {
      const Fz = { x0: e.x0, x1: e.x1, y0: e.y0, y1: e.y1 };
      const m = new (T().Mesh)(geo('fz', () => new (T().PlaneGeometry)(1, 1)), mat('fz', () => basic(0x5ad1ff, { transparent: true, opacity: 0.1, depthWrite: false })));
      m.scale.set(e.x1 - e.x0, e.y1 - e.y0, 1); m.position.set((e.x0 + e.x1) / 2, (e.y0 + e.y1) / 2, -1.0); group.add(m);
      const lab = X.M.label('ZONE BATTEMENT · chaque SAUT = un coup d\'aile', { size: 22, h: 0.26, color: '#bff0ff', bg: 'rgba(6,20,30,0.85)', border: '#5ad1ff' });
      lab.position.set(e.x0 + 4.5, e.y1 - 0.6, 0.5); group.add(lab);
      Fz.mesh = m;
      return Fz;
    },
    update(list, alive, dt, X) {
      for (const Fz of list) if (Math.random() < 0.25) X.burst(Fz.x0 + Math.random() * (Fz.x1 - Fz.x0), Fz.y0 + 0.3, 1, [0xbff0ff], 1, { grav: -0.6, life: 1.2, size: 0.6 });
    },
  });
  const inFlappy = (X, p) => (X.R.ents.flappy || []).some((f) => p.x > f.x0 && p.x < f.x1 && p.y + 0.45 > f.y0 && p.y + 0.45 < f.y1);
  GX.on('airJump', (p, X) => {
    if (!X.R || !X.R.ents.flappy || !inFlappy(X, p)) return false;
    p.airJumpV = 8.4;   // un petit coup d'aile (le moteur l'utilise à la place du double saut)
    X.R.seen3 = X.R.seen3 || {};
    if (!X.R.seen3.flap) { X.R.seen3.flap = true; react(X, 't_flap', p, 0.6); }
    return true;
  });
  S.flappyPipes = (L, x, o) => {
    // des « tuyaux » (haut et bas) avec une ouverture à franchir ; le vide en dessous
    const x0 = x, gaps = o.gaps || [[3, 6], [5, 8], [2, 5]], H = L.h;
    floor(L, x, x + 3);
    let cx = x + 4;
    const pipes = [];
    gaps.forEach(([g0, g1], i) => {
      cx += 3;
      L.rect(cx, 0, cx + 1, g0 - 1, '#');                    // tuyau du bas (dessus à g0)
      L.rect(cx, g1 + 1, cx + 1, H - 1, '#');                // tuyau du haut (dessous à g1 + 1)
      if (o.spikes) { L.rect(cx, g0 - 1, cx + 1, g0 - 1, '^'); }
      pipes.push({ x: cx, g0, g1 });
      if (o.coins !== false && i === 1) L.coin(cx + 1, (g0 + g1) / 2 + 0.5 | 0);
      cx += 2;
    });
    cx += 3;
    floor(L, cx, cx + 3);
    L.add('flappy', x + 3, 0, { x0: x + 3, x1: cx + 0.5, y0: 0, y1: H - 1 });
    if (o.sign !== false) L.sign(x + 1, 1, 'ZONE BATTEMENT : SAUTE ENCORE EN L\'AIR');
    note(L, 'flappyPipes', x0, cx + 4, { pipes, end: cx });
    return cx + 4;
  };

  /* ==================================================================
     8. LA SCIE QUI POURSUIT  (entité 'chasesaw')
     Quand on passe le déclencheur, une scie se lance sur son rail. Sa règle est
     simple : elle avance vers le joueur le plus proche à 4,6 cases/s (tu marches à 7,2).
     Elle ne quitte jamais son rail. Il ne faut pas s'arrêter… même quand le sol craque.
     ================================================================== */
  GX.type('chasesaw', {
    make(e, group, X) {
      const C = { x0: e.x0, x1: e.x1, y: e.y, tx: e.tx, sp: e.sp || 4.6, r: 0.55, x: e.x0, on: false };
      const g = new (T().Group)();
      const disc = new (T().Mesh)(geo('saw', () => new (T().CylinderGeometry)(0.55, 0.55, 0.12, 18)), mat('saw', () => new (T().MeshStandardMaterial)({ color: 0xd8dde4, metalness: 0.9, roughness: 0.25 })));
      disc.rotation.x = Math.PI / 2; g.add(disc);
      for (let k = 0; k < 10; k++) { const th = new (T().Mesh)(geo('tooth', () => new (T().ConeGeometry)(0.08, 0.2, 4)), mat('saw2', () => new (T().MeshStandardMaterial)({ color: 0xff5a3a, metalness: 0.6 }))); const a = (k / 10) * Math.PI * 2; th.position.set(Math.cos(a) * 0.6, Math.sin(a) * 0.6, 0); th.rotation.z = a - Math.PI / 2; g.add(th); }
      group.add(g); C.mesh = g;
      const rail = new (T().Mesh)(geo('rail', () => new (T().BoxGeometry)(1, 0.06, 0.06)), mat('rail', () => basic(0x444a52)));
      rail.scale.x = e.x1 - e.x0; rail.position.set((e.x0 + e.x1) / 2, e.y, -0.3); group.add(rail);
      g.position.set(C.x, C.y, 0);
      return C;
    },
    update(list, alive, dt, X) {
      for (const C of list) {
        if (C.frzT > 0) continue;   // COMPILÉE : elle s'arrête 2 s (et ne coupe plus)
        if (!C.on) {
          const p = alive.find((q) => q.x > C.tx && q.x < C.x1 + 2);
          if (p) { C.on = true; OT.Sound.whoosh(); X.rumble(-1, 0.2, 0.5, 200); X.R.seen3 = X.R.seen3 || {}; if (!X.R.seen3.csaw) { X.R.seen3.csaw = true; react(X, 't_chase', p, 0.5); } }
        } else {
          let best = null;
          for (const p of alive) if (!best || Math.abs(p.x - C.x) < Math.abs(best.x - C.x)) best = p;
          if (best) { const d = best.x - C.x; C.x += Math.sign(d) * Math.min(Math.abs(d), C.sp * dt); }
          C.x = Math.max(C.x0, Math.min(C.x1, C.x));
          C.mesh.rotation.z -= dt * 14;
          if (Math.random() < 0.4) X.burst(C.x, C.y - 0.5, 1, [0xffd28a, 0xff7a1a], 2, { up: 1, life: 0.25 });
          for (const p of alive) {
            const cx = Math.max(p.x - 0.33, Math.min(C.x, p.x + 0.33)), cy = Math.max(p.y, Math.min(C.y, p.y + 0.9));
            const d2 = (cx - C.x) ** 2 + (cy - C.y) ** 2;
            if (d2 < (C.r * 0.86) ** 2) X.kill(p, 'saw');
            else if (d2 < 1.0 && !p.sawClose) { p.sawClose = true; react(X, 't_close', p, 0.2); setTimeout(() => (p.sawClose = false), 6000); }
          }
        }
        C.mesh.position.set(C.x, C.y, 0);
      }
    },
    reset(list) { for (const C of list) { C.on = false; C.x = C.x0; C.mesh.position.set(C.x, C.y, 0); } },
  });
  S.sawChase = (L, x, o) => {
    const x0 = x, len = 26;
    floor(L, x, x + len - 1);
    L.add('chasesaw', x + 1, 1, { x0: x + 1.5, x1: x + 21.5, y: 1.55, tx: x + 5 });
    // le sol craque en chemin (on ne s'arrête pas) et un petit trou à sauter
    L.crumble(x + 10, x + 13, 0, 0.6);
    L.rect(x + 17, 0, x + 18, 0, ' ');
    if (o.coins) L.coin(x + 17, 3);
    note(L, 'sawChase', x0, x + len, { tx: x + 5, crumble: [x + 10, x + 13], gap: [x + 17, x + 18] });
    return x + len;
  };

  /* ==================================================================
     9. LA PIÈCE APPÂT  (entité 'bombcoin')
     Trois pièces brillent sur un perchoir. Celle du milieu est un appât : la ramasser
     fait tomber 4 bombes (une ombre rouge 0,9 s avant chacune). On peut aussi ignorer
     le perchoir : le chemin du bas est sûr.
     ================================================================== */
  const bombGeo = () => geo('bomb', () => new (T().SphereGeometry)(0.32, 12, 10));
  GX.type('bombcoin', {
    make(e, group, X) { return { cx: e.cx, cy: e.cy, xs: e.xs, gy: e.gy || 1, fired: false, bombs: [] }; },
    update(list, alive, dt, X) {
      for (const B of list) {
        if (B.frzT > 0) continue;   // COMPILÉES : les bombes restent suspendues 2 s
        for (const b of B.bombs) {
          b.t += dt;
          if (b.t > b.delay) { b.vy -= 30 * dt; b.y += b.vy * dt; }
          b.mesh.position.set(b.x, b.y, 0); b.mesh.visible = b.t > b.delay - 0.5;
          b.sh.material.opacity = Math.min(0.7, 0.25 + b.t * 0.5);
          if (!b.dead && (b.y <= b.gy + 0.3 || (b.t > b.delay && X.solid(Math.floor(b.x), Math.floor(b.y - 0.33))))) {
            b.gy = Math.min(b.gy, b.y);
            b.dead = true; X.group().remove(b.mesh); X.group().remove(b.sh);
            OT.Sound.boom(); X.shake(0.18); X.burst(b.x, b.gy + 0.3, 20, [0xff7a1a, 0xffd28a, 0x333333], 7, { up: 2 });
            X.shock(b.x, b.gy + 0.1, 0xff7a1a, 1.6, 0.35, true);
            for (const p of alive) if (Math.abs(p.x - b.x) < 0.95 && p.y < b.gy + 1.2 && p.y + 0.9 > b.gy) X.kill(p, 'boom');
          }
        }
        B.bombs = B.bombs.filter((b) => !b.dead);
      }
    },
    reset(list, X) { for (const B of list) { for (const b of B.bombs) { X.group().remove(b.mesh); X.group().remove(b.sh); } B.bombs = []; B.fired = false; } },
  });
  GX.on('coinTaken', (c, p, X) => {
    for (const B of X.R.ents.bombcoin || []) {
      if (B.fired || Math.abs(c.x - (B.cx + 0.5)) > 0.6 || Math.abs((c.by !== undefined ? c.by : c.y) - B.cy) > 0.7) continue;
      B.fired = true;
      say(X, B.cx, B.cy + 1.6, 'Une pièce gratuite… vraiment ?', '#ff7a1a');
      B.xs.forEach((bx, i) => {
        const m = new (T().Mesh)(bombGeo(), mat('bombm', () => new (T().MeshStandardMaterial)({ color: 0x222226, metalness: 0.5, roughness: 0.4, emissive: 0x330000 })));
        const sh = new (T().Mesh)(geo('bsh', () => new (T().CircleGeometry)(0.85, 18)), basic(0xff3020, { transparent: true, opacity: 0.25, depthWrite: false }));
        const gy = X.groundBelow(bx, X.R.H - 2);   // la première surface sous la bombe (le perchoir ou le sol)
        sh.rotation.x = -Math.PI / 2; sh.position.set(bx, gy + 0.02, 0.3);
        X.group().add(m, sh);
        B.bombs.push({ x: bx, y: X.R.H - 1.5, vy: 0, t: 0, delay: 0.9 + i * 0.25, gy, mesh: m, sh });
      });
      X.R.seen3 = X.R.seen3 || {}; if (!X.R.seen3.bomb) { X.R.seen3.bomb = true; react(X, 't_bomb', p, 0.3); }
    }
    // la pièce oubliée (section 10) : la ramasser fait tomber le sol piégé
    for (const K of X.R.ents.backcoin || []) {
      if (K.picked || Math.abs(c.x - (K.bx + 0.5)) > 0.6) continue;
      K.picked = true; K.dropT = 0.28;
    }
  });
  S.baitCoin = (L, x, o) => {
    const x0 = x, len = 20;
    floor(L, x, x + len - 1);
    L.rect(x + 7, 3, x + 11, 3, '#');                         // le perchoir (dessus à 4), au-dessus du chemin du bas
    L.rect(x + 5, 1, x + 5, 1, '#');                          // une marche pour y monter (dessus à 2)
    L.coin(x + 8, 5); L.coin(x + 9, 5); L.coin(x + 10, 5);
    L.add('bombcoin', x + 9, 5, { cx: x + 9, cy: 5, xs: [x + 6.5, x + 9.5, x + 12.5, x + 15.5], gy: 1 });
    if (o.sign !== false) L.sign(x + 2, 1, o.sign || 'BONUS GRATUIT →');
    note(L, 'baitCoin', x0, x + len, { perch: [x + 7, x + 12], bait: x + 9, step: x + 5 });
    return x + len;
  };

  /* ==================================================================
     10. LA PIÈCE OUBLIÉE  (entité 'backcoin')
     Quand on dépasse le déclencheur, une pièce apparaît DERRIÈRE toi, sur un sol à
     fine fissure. Revenir la chercher : le sol tombe 0,28 s après qu'on l'a prise
     (on saute aussitôt et on survit). Le piège ne marche que si on recule.
     ================================================================== */
  GX.type('backcoin', {
    make(e, group, X) { return { tx: e.tx, bx: e.bx, gy: e.gy || 1, b0: e.b0, b1: e.b1, shown: false, picked: false, dropT: 0 }; },
    update(list, alive, dt, X) {
      for (const K of list) {
        if (!K.shown && alive.some((p) => p.x > K.tx)) {
          const c = (X.R.ents.coin || []).find((q) => Math.abs(q.x - (K.bx + 0.5)) < 0.6 && q.hidden);
          if (c) { c.hidden = false; c.mesh.visible = true; K.shown = true; X.burst(K.bx + 0.5, K.gy + 1.5, 14, [0xffd23f, 0xffffff], 4, { grav: -0.3 }); OT.Sound.coin ? OT.Sound.coin() : 0; say(X, K.bx, K.gy + 2.8, 'Psst… tu as oublié une pièce.', '#b78cff', 'La Rumeur'); }
        }
        if (K.dropT > 0) {
          K.dropT -= dt;
          if (K.dropT <= 0) { for (let x = K.b0; x <= K.b1; x++) X.dropTile(x, K.gy - 1); OT.Sound.crumble(); X.R.seen3 = X.R.seen3 || {}; if (!X.R.seen3.back) { X.R.seen3.back = true; react(X, 't_back', alive[0], 0.2); } }
        }
      }
    },
    reset(list) { for (const K of list) { K.shown = false; K.picked = false; K.dropT = 0; } },
  });
  S.backCoin = (L, x, o) => {
    const x0 = x, len = 18;
    floor(L, x, x + len - 1);
    L.trapFloor(x + 3, x + 6, 0);
    L.add('coin', x + 4, 2, { inBox: true });                 // cachée jusqu'au déclencheur
    L.add('backcoin', x + 4, 1, { tx: x + 11, bx: x + 4, gy: 1, b0: x + 3, b1: x + 6 });
    note(L, 'backCoin', x0, x + len, { tx: x + 11, bx: x + 4 });
    return x + len;
  };

  /* ==================================================================
     11. MÊME RYTHME ?  (entité 'pattern')
     Quatre petites plateformes identiques, également espacées, au-dessus des pics.
     Quand on se pose sur la 3e, la 4e glisse de 1,5 case (clac !) : on la voit bouger,
     on ajuste son saut. Le jeu punit l'habitude, pas la réflexion.
     ================================================================== */
  GX.type('pattern', {
    make(e, group, X) {
      const P = { xs: e.xs, y: e.y, w: 2, shift: 1.5, k: 0, kTarget: 0, ref4: { dx: 0, dy: 0, auto: true } };
      P.meshes = P.xs.map((px) => { const m = new (T().Mesh)(X.M.slabGeo(2), [tm(X).plate, tm(X).top]); m.geometry.userData.shared = true; m.position.set(px, P.y - 1, 0); group.add(m); return m; });
      return P;
    },
    update(list, alive, dt, X) {
      for (const P of list) {
        if (P.frzT > 0) { P.ref4.dx = 0; continue; }   // COMPILÉE : la 4e plateforme ne glisse pas 2 s
        const third = P.xs[2];
        if (P.kTarget === 0 && alive.some((p) => feetOn(p, third, third + P.w, P.y))) {
          P.kTarget = 1; OT.Sound.slam(); X.rumble(-1, 0.2, 0.3, 120);
          X.R.seen3 = X.R.seen3 || {}; if (!X.R.seen3.pat) { X.R.seen3.pat = true; react(X, 't_pattern', alive[0], 0.3); }
        }
        const k0 = P.k;
        P.k += Math.sign(P.kTarget - P.k) * Math.min(Math.abs(P.kTarget - P.k), dt / 0.35);
        P.ref4.dx = (P.k - k0) * P.shift;   // la plateforme qui glisse emporte celui qui est dessus
        P.meshes[3].position.x = P.xs[3] + P.k * P.shift;
      }
    },
    solids(list, b, out) {
      for (const P of list) P.xs.forEach((px, i) => {
        const x0 = px + (i === 3 ? P.k * P.shift : 0);
        if (b.x1 > x0 - 1 && b.x0 < x0 + P.w + 1) out.push({ x0, y0: P.y - 1, x1: x0 + P.w, y1: P.y, plat: true, pattern: P, ref: i === 3 ? P.ref4 : STILL });
      });
    },
    reset(list) { for (const P of list) { P.k = 0; P.kTarget = 0; P.meshes[3].position.x = P.xs[3]; } },
  });
  S.patternPlat = (L, x, o) => {
    const x0 = x, top = 2;
    floor(L, x, x + 2);
    const xs = [];
    let cx = x + 3;
    L.rect(cx, 0, cx + 21, 0, '^');
    for (let i = 0; i < 4; i++) { cx += 3; xs.push(cx); cx += 2; }
    // (la 4e plateforme glisse de 1,5 case : la fosse continue jusqu'à sa nouvelle place)
    const end = xs[3] + 2 + 1.5 + 2 | 0;
    L.rect(cx, 0, end, 0, '^');
    floor(L, end + 1, end + 4);
    L.add('pattern', xs[0], top, { xs, y: top });
    if (o.coins !== false) L.coin(xs[1] + 1, 4);
    note(L, 'patternPlat', x0, end + 5, { xs, top, shift: 1.5 });
    return end + 5;
  };

  /* ==================================================================
     12. BORD = AUTRE BORD  (entité 'wrap')
     Seulement dans cette salle (cadres bleus aux deux bords, panneau explicatif) :
     à l'étage, sortir par le bord gauche fait revenir par le bord droit, et
     inversement. Au rez-de-chaussée, rien de spécial. Collisions normales partout.
     ================================================================== */
  GX.type('wrap', {
    make(e, group, X) {
      const Wr = { x0: e.x0, x1: e.x1, y0: e.y0, y1: e.y1 };
      const fm = mat('wrapf', () => basic(0x5fd4ff, { transparent: true, opacity: 0.55, depthWrite: false }));
      for (const xx of [e.x0, e.x1]) {
        const f = new (T().Mesh)(geo('wf', () => new (T().BoxGeometry)(0.12, 1, 1.9)), fm);
        f.scale.y = e.y1 - e.y0; f.position.set(xx, (e.y0 + e.y1) / 2, 0); group.add(f);
        const lab = X.M.label('⇆', { size: 40, h: 0.5, color: '#bff0ff', bg: 'none' }); lab.position.set(xx, e.y1 + 0.3, 0.5); group.add(lab);
      }
      return Wr;
    },
    update(list, alive, dt, X) {
      for (const Wr of list) for (const p of alive) {
        if (p.y < Wr.y0 || p.y > Wr.y1) continue;
        let nx = null;
        if (p.x < Wr.x0 + 0.05 && p.vx <= 0 && p.x > Wr.x0 - 1.2) nx = Wr.x1 - 0.45;
        else if (p.x > Wr.x1 - 0.05 && p.vx >= 0 && p.x < Wr.x1 + 1.2) nx = Wr.x0 + 0.45;
        if (nx === null) continue;
        X.burst(p.x, p.y + 0.5, 10, [0x5fd4ff, 0xffffff], 3, { grav: 0, life: 0.4 });
        p.x = nx; p.x3prev = nx; p.x3 = nx;
        X.burst(p.x, p.y + 0.5, 10, [0x5fd4ff, 0xffffff], 3, { grav: 0, life: 0.4 });
        OT.Sound.whoosh();
        X.R.seen3 = X.R.seen3 || {}; if (!X.R.seen3.wrap) { X.R.seen3.wrap = true; react(X, 't_wrap', p, 0.4); }
      }
    },
  });
  S.wrapRoom = (L, x, o) => {
    // rez-de-chaussée : on entre, un grand mur coupe la salle en deux.
    // étage : une passerelle à gauche (bord gauche ⇆ bord droit), une passerelle à droite avec un trou pour redescendre.
    const x0 = x, H = L.h;
    floor(L, x, x + 24);
    L.rect(x + 3, 1, x + 4, 2, '#');                          // marche (dessus à 3)
    L.rect(x + 6, 4, x + 11, 4, '#');                         // passerelle gauche (dessus à 5)
    L.rect(x + 12, 1, x + 12, H - 2, '#');                    // le grand mur
    L.rect(x + 15, 4, x + 19, 4, '#');                        // passerelle droite (dessus à 5)…
    L.rect(x + 15, 4, x + 15, 4, ' ');                        // …avec un trou pour redescendre
    L.add('wrap', x + 6, 5, { x0: x + 6, x1: x + 20, y0: 4.6, y1: 7.5 });
    if (o.sign !== false) L.sign(x + 1, 1, 'À L\'ÉTAGE : BORD GAUCHE = BORD DROIT');
    if (o.coins !== false) L.coin(x + 18, 7);
    note(L, 'wrapRoom', x0, x + 25, { step: x + 3, left: x + 6, right: x + 20, hole: x + 15, wall: x + 12 });
    return x + 25;
  };

  /* ==================================================================
     13. LA PORTE TIMIDE  (une porte de zone choisie : d.shy)
     Elle fait un pas de 2 cases sur le côté quand quelqu'un SAUTE près d'elle. Elle
     reste tranquille si on arrive en marchant. (Elle ne sort jamais de son palier.)
     ================================================================== */
  GX.on('update', (alive, dt, X) => {
    for (const d of X.R.ents.door || []) {
      if (!d.shy) continue;
      const p = alive.find((q) => q.j3 && Math.abs(q.x - (d.x + 0.5)) < 4.5 && Math.abs(q.y - d.y) < 2);
      if (!p || d.x !== d.tx) continue;
      const nx = d.x === d.ox ? d.ox - 2 : d.ox;
      X.burst(d.x + 0.5, d.y + 1, 14, [0x5fd4ff, 0xffffff], 4, { up: 1 });
      d.x = d.tx = nx; d.mesh.position.set(nx + 0.5, d.y, -0.5);
      OT.Sound.whoosh();
      say(X, d.x, d.y + 2.8, 'Elle n\'aime pas qu\'on lui saute dessus…', '#5fd4ff');
      X.R.seen3 = X.R.seen3 || {}; if (!X.R.seen3.shy) { X.R.seen3.shy = true; react(X, 't_shy', p, 0.9); }
    }
  });

  /* ==================================================================
     LE PLACEMENT DANS LES MONDES (progression : découvrir → varier → combiner)
     Chaque entrée : [monde, niveau (1…9), zone (index dans le plan), position dans
     la zone (-1 = juste avant la fin), [section, options], bonus de temps de référence].
     Les zones d'origine (zone 1) ne sont jamais modifiées.
     ================================================================== */
  OT.PIEGES3_PLACEMENT = [
    // MONDE 1 — La Forge : les pics cachés, le trou baladeur, les fantômes, la presse, le mur
    [1, 2, 0, -1, ['popSpikes', { at: [5], w: 2, sign: 'SOL PERCÉ ? JUSTE DES TROUS D\'AÉRATION.' }], 6],
    [1, 3, 1, 1, ['shiftHole', { coins: true }], 6],
    [1, 4, 1, -1, ['popSpikes', { at: [4, 10], w: 2, off: true }], 6],
    [1, 5, 1, -1, ['ghostRoute', {}], 8],
    [1, 6, 1, 1, ['ceilPress', { len: 14 }], 6],
    [1, 7, 1, -1, ['popWall', {}], 8],
    [1, 8, 1, -1, ['shiftHole', { landSpikes: true }], 6],
    // MONDE 2 — Le Code : appâts, battement, boucle, rythme, porte timide
    [2, 2, 1, -1, ['baitCoin', { sign: 'BONUS GRATUIT : CLIQUE ICI →' }], 6],
    [2, 3, 1, -1, ['flappyPipes', {}], 8],
    [2, 5, 1, -1, ['wrapRoom', {}], 8],
    [2, 6, 1, -1, ['backCoin', {}], 5],
    [2, 7, 1, -1, ['patternPlat', {}], 6],
    [2, 9, 1, 1, ['flappyPipes', { gaps: [[4, 7], [2, 5], [6, 9], [3, 6]], spikes: true }], 9],
    // MONDE 3 — Le Laboratoire : la scie qui poursuit, les pics du plafond, la fausse sortie
    [3, 2, 1, -1, ['sawChase', {}], 7],
    [3, 4, 1, -1, ['popSpikes', { mode: 'ceil', at: [5, 11], w: 2, ceil: 3 }], 6],
    [3, 6, 1, -1, ['ghostRoute', { sign: 'PROTOTYPE DE PLATEFORME : NE PAS S\'ARRÊTER DESSUS' }], 8],
    [3, 7, 1, -1, ['sawChase', { coins: true }], 7],
    [3, 8, 1, -1, ['kickDoor', {}], 9],
    // MONDE 4 — Nexus : boucle, fantômes, rythme, trou baladeur
    [4, 2, 1, -1, ['wrapRoom', { sign: 'RÉSEAU EN BOUCLE : BORD GAUCHE = BORD DROIT (À L\'ÉTAGE)' }], 8],
    [4, 4, 1, -1, ['patternPlat', {}], 6],
    [4, 6, 1, -1, ['flappyPipes', { gaps: [[3, 6], [6, 9], [3, 6]] }], 8],
    [4, 8, 1, -1, ['shiftHole', { landSpikes: true, coins: true }], 6],
    // MONDE 5 — OSWEL City : tout se combine
    [5, 2, 1, -1, ['popWall', {}], 8],
    [5, 3, 1, -1, ['baitCoin', { sign: 'OFFRE SPÉCIALE : 3 PIÈCES GRATUITES' }], 6],
    [5, 3, 1, -1, ['backCoin', {}], 5],
    [5, 5, 1, -1, ['ceilPress', { len: 16, spikes: true }], 8],
    [5, 6, 1, -1, ['kickDoor', {}], 9],
    [5, 8, 1, -1, ['sawChase', { coins: true }], 7],
    [5, 8, 1, -1, ['ghostRoute', { sign: 'Il paraît que les plateformes claires sont les plus sûres.' }], 8],
  ];
  // les portes « timides » : la porte de fin de zone de ces niveaux (monde, niveau, zone)
  OT.PIEGES3_SHY = [[2, 8, 1], [4, 5, 1], [5, 7, 1]];

  (OT.PLAN_TRANSFORMS = OT.PLAN_TRANSFORMS || []).push((w, i, plan, boss) => {
    if (boss || !plan || !plan.zones) return;
    for (const [pw, pl, zi, pos, sec, bonus] of OT.PIEGES3_PLACEMENT) {
      if (pw !== w || pl !== i + 1) continue;
      const z = plan.zones[Math.min(zi, plan.zones.length - 1)];
      if (!z || !z.secs) continue;
      const at = pos < 0 ? Math.max(0, z.secs.length + 1 + pos) : Math.min(pos, z.secs.length);
      z.secs.splice(at, 0, [sec[0], Object.assign({}, sec[1])]);
      plan.parBonus = (plan.parBonus || 0) + (bonus || 0);
    }
    for (const [sw, sl, szi] of OT.PIEGES3_SHY) if (sw === w && sl === i + 1 && plan.zones[szi]) plan.zones[szi].shyGate = true;
  });
  // la porte de zone « timide » : on repère les portes de zone après la construction
  GX.on('build', (R, X) => {
    const lv = R.def, plan = OT.EXT_PLANS && OT.EXT_PLANS[X.worldId] && OT.EXT_PLANS[X.worldId][X.levelIndex];
    if (!plan || !plan.zones || !lv.build || !lv.build.zonesX) return;
    plan.zones.forEach((z, zi) => {
      if (!z.shyGate) return;
      const zx = lv.build.zonesX[zi + 1];   // fin de cette zone
      if (zx === undefined) return;
      const d = (R.ents.door || []).filter((q) => q.to && q.x < zx && q.x > zx - 8).pop();
      if (d) d.shy = true;
    });
  });
})();
