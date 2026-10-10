// =====================================================================
// Robot de validation — les NOUVEAUX PIÈGES (js/pieges3.js), version 1.5.
// Chargé APRÈS secbots.js. Le robot n'appuie toujours que sur des touches
// (gauche, droite, saut, course). Pour chaque piège, on lui apprend :
//  - ce qui est solide au temps t (le trou baladeur, les plateformes fantômes,
//    la 4e plateforme qui glisse) en IMAGINANT ce que ses propres actions déclenchent ;
//  - ce qui est dangereux au temps t (pics cachés, plafond qui descend, scie qui
//    poursuit, bombes) avec les MÊMES règles que js/pieges3.js ;
//  - pour trois sections, un « robot particulier » (zone battement, salle « bord =
//    autre bord », fausse sortie : il faut passer par le haut).
// Les informations d'un piège imaginé sont rangées dans l'état imaginé « s » sous
// forme de nombres (s['p3h' + i]…), car cet état est recopié avec Object.assign.
// =====================================================================
(function () {
  const XB = (window.SECBOT_EXT = window.SECBOT_EXT || { tileSolid: [], solids: [], danger: [], step: [], sections: {}, oneByOne: [] });
  const G = () => OT.Game._dbg;
  const PW = 0.66, PH = 0.9;
  const ov = (a, b) => a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0;
  const feetOnS = (s, x0, x1, gy) => s.g && (s.gs || 1) > 0 && Math.abs(s.y - gy) < 0.12 && s.x + 0.28 > x0 && s.x - 0.28 < x1;
  const L = (R, k) => R.ents[k] || [];

  /* ---------- 1. ce que le robot déclenche en imagination ---------- */
  XB.step.push((R, s, inp, t, first) => {
    // un saut qui COMMENCE (vitesse de départ d'un saut) ; un atterrissage (au sol après avoir été en l'air)
    const jumpNow = !!s.jumping && s.vy > 12.5 && !s.p3jl; s.p3jl = !!s.jumping && s.vy > 12.5;
    if (s.p3gp === undefined) s.p3gp = !!s.g;
    const landNow = s.g && !s.p3gp; s.p3gp = !!s.g;
    // trou baladeur : un saut dans la zone de déclenchement le fait glisser
    L(R, 'hole').forEach((H, i) => {
      if (H.shifted || s['p3h' + i] !== undefined || !jumpNow) return;
      if (s.x > H.h0 - 4.6 && s.x < H.h0 + 0.4 && s.y < H.y + 2.2) s['p3h' + i] = t;
    });
    // plateformes fantômes : s'y arrêter plus de 0,3 s
    L(R, 'ghost').forEach((Gh, i) => {
      if (Gh.st === 'gone' || s['p3gx' + i] !== undefined) return;
      const on = feetOnS(s, Gh.x0, Gh.x1 + 1, Gh.y + 1);
      if (!on) { s['p3g' + i] = undefined; return; }
      if (s['p3g' + i] === undefined) s['p3g' + i] = Gh.st === 'trust' ? t - (0.3 - Gh.t) : t;
      if (t - s['p3g' + i] > 0.3) s['p3gx' + i] = t;
    });
    // pics cachés : marcher dessus / atterrir dessus / passer dessous
    L(R, 'popspike').forEach((P, i) => {
      if (P.st !== 'idle' || s['p3s' + i] !== undefined) return;
      let hit = false;
      if (P.mode === 'step') hit = feetOnS(s, P.x0, P.x1 + 1, P.y + 1);
      else if (P.mode === 'land') hit = landNow && feetOnS(s, P.x0, P.x1 + 1, P.y + 1);
      else hit = s.x + 0.28 > P.x0 && s.x - 0.28 < P.x1 + 1 && s.y < P.y && s.y > P.y - 4;
      if (hit) s['p3s' + i] = t;
    });
    // plafond qui descend : entrer dans le couloir
    L(R, 'ceilpress').forEach((C, i) => {
      if (C.st !== 'idle' || s['p3c' + i] !== undefined) return;
      if (s.x > C.x0 + 0.3 && s.x < C.x1 + 0.7) s['p3c' + i] = t;
    });
    // même rythme ? : se poser sur la 3e plateforme
    L(R, 'pattern').forEach((P, i) => {
      if (P.kTarget || s['p3p' + i] !== undefined) return;
      if (feetOnS(s, P.xs[2], P.xs[2] + P.w, P.y)) s['p3p' + i] = t;
    });
    // scie qui poursuit : elle se lance quand on dépasse le déclencheur, puis vient vers nous (4,6 cases/s)
    L(R, 'chasesaw').forEach((C, i) => {
      if (s['p3w' + i] === undefined) s['p3w' + i] = C.x;
      const on = C.on || s['p3wo' + i] || s.x > C.tx;
      if (on) { s['p3wo' + i] = 1; const d = s.x - s['p3w' + i]; s['p3w' + i] = Math.max(C.x0, Math.min(C.x1, s['p3w' + i] + Math.sign(d) * Math.min(Math.abs(d), C.sp / 120))); }
    });
    // salle « bord = autre bord » (même test que le jeu)
    for (const Wr of L(R, 'wrap')) {
      if (s.y < Wr.y0 || s.y > Wr.y1) continue;
      if (s.x < Wr.x0 + 0.05 && s.vx <= 0 && s.x > Wr.x0 - 1.2) s.x = Wr.x1 - 0.45;
      else if (s.x > Wr.x1 - 0.05 && s.vx >= 0 && s.x < Wr.x1 + 1.2) s.x = Wr.x0 + 0.45;
    }
    // zone battement : un appui sur SAUT en l'air donne un coup d'aile (8,4)
    if (first && inp.jumpP && !s.g && L(R, 'flappy').some((f) => s.x > f.x0 && s.x < f.x1 && s.y + 0.45 > f.y0 && s.y + 0.45 < f.y1)) { s.vy = 8.4; s.cut = false; }
  });

  /* ---------- 2. tuiles : le trou baladeur et les plateformes fantômes ---------- */
  XB.tileSolid.push((R, x, y, t, s, tl) => {
    if (tl.ch0 === 'O') {
      const i = L(R, 'hole').findIndex((H) => H.y === y && x >= H.x0 && x <= H.x1);
      if (i < 0) return undefined;
      const H = R.ents.hole[i];
      const shifted = H.shifted || (s['p3h' + i] !== undefined && t >= s['p3h' + i]);
      const hx = H.h0 + (shifted ? H.sh : 0);
      return !(x >= hx && x < hx + H.w);
    }
    if (tl.ch0 === 'S') {
      const i = L(R, 'ghost').findIndex((Gh) => Gh.y === y && x >= Gh.x0 && x <= Gh.x1);
      if (i < 0) return undefined;
      const Gh = R.ents.ghost[i];
      if (Gh.st === 'gone') return false;
      return !(s['p3gx' + i] !== undefined && t >= s['p3gx' + i]);
    }
    return undefined;
  });

  /* ---------- 3. solides imaginés : la 4e plateforme qui glisse ---------- */
  XB.solids.push((R, b, t, s, out) => {
    const list = L(R, 'pattern'); if (!list.length) return;
    for (let k = out.length - 1; k >= 0; k--) if (out[k].pattern) out.splice(k, 1);   // on remplace l'état actuel…
    list.forEach((P, i) => {                                                          // …par l'état imaginé au temps t
      const tt = s['p3p' + i];
      let kk = P.k;
      if (P.kTarget) kk = Math.min(1, P.k + Math.max(0, t - G().time) / 0.35);
      else if (tt !== undefined && t > tt) kk = Math.min(1, (t - tt) / 0.35);
      P.xs.forEach((px, j) => {
        const x0 = px + (j === 3 ? kk * P.shift : 0);
        if (b.x1 > x0 - 1 && b.x0 < x0 + P.w + 1) out.push({ x0, y0: P.y - 1, x1: x0 + P.w, y1: P.y, plat: true, pattern: P });
      });
    });
  });

  /* ---------- 4. dangers ---------- */
  XB.danger.push((R, t, x, y, s, m, b, bm) => {
    const now = G().time;
    // pics cachés : dangereux pendant qu'ils sont sortis (déclenchés pour de vrai, ou en imagination)
    for (let i = 0; i < L(R, 'popspike').length; i++) {
      const P = R.ents.popspike[i];
      let a = null, z = null;
      if (P.st === 'up') a = [now - 0.05, now + P.t + 0.05];
      else if (P.st === 'arm') a = [now + P.t, now + P.t + P.up + 0.05];
      else if (s['p3s' + i] !== undefined) a = [s['p3s' + i] + P.arm, s['p3s' + i] + P.arm + P.up + 0.05];
      if (!a || t < a[0] - 0.02 || t > a[1]) continue;
      z = P.mode === 'ceil' ? { x0: P.x0 + 0.08, x1: P.x1 + 0.92, y0: P.y - 0.5, y1: P.y } : { x0: P.x0 + 0.08, x1: P.x1 + 0.92, y0: P.y + 1, y1: P.y + 1.5 };
      if (ov(bm, z)) return 'popspike';
    }
    // plafond qui descend
    for (let i = 0; i < L(R, 'ceilpress').length; i++) {
      const C = R.ents.ceilpress[i];
      let u = null;
      if (C.st === 'down') u = Math.max(C.gy + 0.4, C.u - C.sp * (t - now));
      else if (C.st === 'idle' && s['p3c' + i] !== undefined && t > s['p3c' + i]) u = Math.max(C.gy + 0.4, C.top - C.sp * (t - s['p3c' + i]));
      if (u === null) continue;
      if (x + 0.3 > C.x0 && x - 0.3 < C.x1 + 1 && y + PH > u - 0.12 && y < u) return 'ceilpress';
    }
    // scie qui poursuit
    for (let i = 0; i < L(R, 'chasesaw').length; i++) {
      const C = R.ents.chasesaw[i];
      const sx = s['p3w' + i] !== undefined ? s['p3w' + i] : C.x;
      if (!C.on && !s['p3wo' + i]) continue;
      const cx = Math.max(b.x0, Math.min(sx, b.x1)), cy = Math.max(b.y0, Math.min(C.y, b.y1));
      if (Math.hypot(cx - sx, cy - C.y) < C.r * 0.86 + m + 0.12) return 'chasesaw';
    }
    // bombes de la pièce appât (seulement celles qui tombent déjà)
    for (const Bc of L(R, 'bombcoin')) for (const bb of Bc.bombs) {
      if (bb.dead) continue;
      let tau;
      if (bb.t < bb.delay) tau = (bb.delay - bb.t) + Math.sqrt(Math.max(0, 2 * (bb.y - bb.gy - 0.3) / 30));
      else tau = (bb.vy + Math.sqrt(Math.max(0, bb.vy * bb.vy + 60 * (bb.y - bb.gy - 0.3)))) / 30;
      const tl = now + tau;
      if (Math.abs(t - tl) < 0.14 && Math.abs(x - bb.x) < 1.25 && y < bb.gy + 1.4 && y + PH > bb.gy - 0.2) return 'bomb';
    }
    return null;
  });

  /* ---------- 5. robots particuliers ---------- */
  // ZONE BATTEMENT : on avance au pas, et on bat des ailes pour rester au milieu de la prochaine ouverture
  XB.sections.flappyPipes = (env, sec, m, T) => {
    const p = env.p;
    if (p.x > sec.end + 0.6 && p.onGround) return T.planner(env, sec.x1 + 2);
    if (p.onGround && p.x < sec.x0 + 3.2) {
      if (p.x < sec.x0 + 2.4) return { right: true };
      return { right: true, jumpP: true, jump: true };          // on s'élance du bord
    }
    const next = sec.pipes.find((q) => q.x + 2 > p.x - 0.45);
    const ty = next ? (next.g0 + next.g1 + 1) / 2 - PH / 2 : 1.6;
    const flap = !p.onGround && p.y < ty - 0.1 && p.vy < 1.2;
    // (on ralentit si l'ouverture suivante est loin en hauteur, pour avoir le temps de s'aligner)
    const far = next && Math.abs(p.y - ty) > 0.9 && next.x - (p.x + PW / 2) < 1.4;
    return { right: !far, jumpP: flap, jump: flap };
  };
  // BORD = AUTRE BORD : marche → passerelle de gauche → sortir à GAUCHE → on revient à droite → le trou → la suite
  XB.sections.wrapRoom = (env, sec, m, T) => {
    const p = env.p, W2 = T.W2;
    if (p.x > sec.wall + 0.6 && p.y < 4) return T.planner(env, sec.x1 + 2);              // de l'autre côté, en bas
    if (p.x > sec.wall + 0.6 && p.y >= 4) { const w = W2.walk(env, sec.hole + 0.5, 0, 0.1); return w.stop ? {} : w; }   // passerelle de droite : on descend par le trou
    if (!p.onGround) return {};
    if (Math.abs(p.y - 5) < 0.15) return { left: true };                                // passerelle de gauche : on sort à gauche
    if (Math.abs(p.y - 3) < 0.15) { if (p.x < sec.step + 1.3) return { right: true }; return W2.jump(env, 1, sec.left + 1.6, 40, 0); }
    // au sol : se placer devant la marche, puis sauter dessus
    if (p.x > sec.step - 0.9) { const w = W2.walk(env, sec.step - 1.0, 0, 0.12); return w.stop ? {} : w; }
    if (p.x < sec.step - 1.4) { const w = W2.walk(env, sec.step - 1.0, 0, 0.12); return w.stop ? {} : w; }
    return W2.jump(env, 1, sec.step + 1.2, 40, 0);
  };
  // FAUSSE SORTIE : la vraie route passe en haut (marches → corniche → passerelle)
  XB.sections.kickDoor = (env, sec, m, T) => {
    const p = env.p, W2 = T.W2;
    if (p.y > 6.5 || p.x > sec.bridge[1] - 3) return T.planner(env, sec.x1 + 2);
    if (!p.onGround) return {};
    if (Math.abs(p.y - 5) < 0.15 && p.x > sec.ledge[0] - 0.4) {                         // sur la corniche
      if (p.x < sec.ledge[1] - 0.6) { const w = W2.walk(env, sec.ledge[1] - 0.5, 0, 0.12); return w.stop ? {} : w; }
      return W2.jump(env, 1, sec.bridge[0] + 1.6, 40, 0);
    }
    if (Math.abs(p.y - 3) < 0.15) {                                                     // sur la 2e marche
      if (Math.abs(p.x - (sec.stair + 0.5)) > 0.2) { const w = W2.walk(env, sec.stair + 0.5, 0, 0.1); return w.stop ? {} : w; }
      return W2.jump(env, 1, sec.ledge[0] + 1.4, 40, 0);
    }
    if (Math.abs(p.y - 2) < 0.15 && p.x < sec.stair) return W2.jump(env, 1, sec.stair + 0.5, 16, 0);   // 1re marche → 2e marche
    if (p.y < 1.5) {
      if (p.x < sec.stair - 2.2) { const w = W2.walk(env, sec.stair - 1.6, 0, 0.12); return w.stop ? {} : w; }
      return W2.jump(env, 1, sec.stair + 0.5, 40, 0);
    }
    return T.planner(env, sec.stair + 0.5);
  };
  // PORTE TIMIDE : on va à la porte là où elle EST (elle a pu faire un pas de côté)
  const shyExit = (env, sec, m, T) => {
    const d = (env.R.ents.door || []).find((q) => q.shy && Math.abs((q.ox !== undefined ? q.ox : q.x) - sec.dx) < 0.6);
    const tx = (d ? d.x : sec.dx) + 0.5;
    const w = T.W2.walk(env, tx, 0, 0.1);
    return w.stop ? {} : w;
  };
  XB.sections.exit = shyExit;
  XB.sections.gate = shyExit;
})();
