/* =====================================================================
   OSWEL'S TRAP — sections.js  (version 1.3)
   LES GRANDS NIVEAUX.
   Chaque niveau d'origine est GARDÉ tel quel : il devient la ZONE 1.
   Sa porte de sortie devient une PORTE DE ZONE (lumière bleue) qui mène
   à la suite : 2 à 4 nouvelles zones, faites de SECTIONS qui ont chacune
   un rôle (apprendre, piéger, combiner, surprendre, respirer, finir).
   Une porte de zone = un point de reprise (tous les modes).

   Une section = une petite fonction qui dessine dans la grille du niveau
   à partir de la colonne x, et qui renvoie la colonne où elle se termine.
   Elle note aussi ce qu'elle a construit dans L.secs (utilisé par les
   tests automatiques, qui vérifient qu'un robot peut finir le niveau avec
   les mêmes commandes qu'un joueur).

   Coordonnées : comme partout, y = 0 est la rangée du bas ; un joueur
   debout sur la rangée 0 a les pieds à y = 1.
   ===================================================================== */
window.OT = window.OT || {};

OT.Sections = (function () {
  const S = {};
  // ---- petits outils ----
  const floor = (L, x0, x1, y = 0) => L.rect(x0, y, x1, y, '#');
  const note = (L, k, x0, x1, extra) => { L.secs.push(Object.assign({ k, x0, x1 }, extra || {})); };
  const pick = (arr, i) => arr[((i % arr.length) + arr.length) % arr.length];

  /* -------------------------------------------------------------------
     RESPIRATION : un coin calme. Un panneau (souvent une référence à
     l'histoire), parfois La Rumeur, deux pièces sur une corniche, un
     point de reprise. « Calme → tension → chaos → récompense → calme. »
     ------------------------------------------------------------------- */
  S.rest = (L, x, o) => {
    const len = o.len || 12, x0 = x;
    floor(L, x, x + len - 1);
    if (o.sign) L.sign(x + 2, 1, o.sign);
    if (o.npc) { L.npc(x + 5, 1, o.npc); if (o.talk && o.talk !== o.npc && L.ents) { const last = L.ents[L.ents.length - 1]; if (last && last.type === 'npc') last.talk = o.talk; } }   // un personnage de l'histoire (ses dialogues sont dans le plan)
    else if (o.rumeur) L.rumeur(x + 5, 1, o.rumeur);
    // la corniche (dessus à 3) : on y monte d'un saut depuis le sol, la pièce est au-dessus
    // (1.5 : avant, la corniche était à 4 — trop haut pour un saut : la pièce était inaccessible)
    if (o.coins !== false) { L.rect(x + len - 6, 2, x + len - 4, 2, '#'); L.coin(x + len - 5, 4); }
    if (o.cp) L.flag(x + len - 2, 1);
    note(L, 'rest', x0, x + len);
    return x + len;
  };

  /* -------------------------------------------------------------------
     SAUTS : une suite de piliers au-dessus du vide (ou de pics).
     steps = [[trou, largeur, hauteur des pieds, type]] ; type 'c' = bloc
     rouillé qui s'effondre (il faut enchaîner), 's' = pics au fond.
     ------------------------------------------------------------------- */
  S.gaps = (L, x, o) => {
    const x0 = x, ledges = [];
    floor(L, x, x + 2); ledges.push({ x0: x, x1: x + 3, y: 1 });
    x += 3;
    o.steps.forEach(([gap, wid, top, kind], i) => {
      if (o.spikes || kind === 's') L.rect(x, 0, x + gap - 1, 0, '^');
      if (o.coins && gap >= 2 && i % 2 === 1) L.coin(x + Math.floor(gap / 2), Math.max(top, ledges[ledges.length - 1].y) + 2);
      x += gap;
      if (kind === 'c') L.crumble(x, x + wid - 1, top - 1, o.delay);
      else L.rect(x, 0, x + wid - 1, top - 1, '#');
      ledges.push({ x0: x, x1: x + wid, y: top, crumble: kind === 'c' });
      x += wid;
    });
    const last = ledges[ledges.length - 1];
    if (last.y > 1) {   // on redescend au sol
      L.rect(x, 0, x + 1, 0, '#'); ledges.push({ x0: x, x1: x + 2, y: 1, drop: true }); x += 2;
    }
    floor(L, x, x + 1); ledges.push({ x0: x, x1: x + 2, y: 1 });
    x += 2;
    note(L, 'gaps', x0, x, { ledges });
    return x;
  };

  /* -------------------------------------------------------------------
     PICS : une course au sol avec des pics simples et doubles ; des pics
     au plafond (W) peuvent limiter la hauteur des sauts.
     pattern = suite de 1 (pic), 2 (double), 0 (sol)
     ------------------------------------------------------------------- */
  S.spikes = (L, x, o) => {
    const x0 = x, pat = o.pattern || [0, 0, 1, 0, 0, 0, 2, 0, 0, 0, 1, 0, 0, 2, 0, 0];
    floor(L, x, x + pat.length * 2);
    const hazards = [];
    let cx = x + 1;
    for (const v of pat) {
      if (v === 1) { L.set(cx, 1, '^'); hazards.push([cx, cx]); cx += 1; }
      else if (v === 2) { L.set(cx, 1, '^').set(cx + 1, 1, '^'); hazards.push([cx, cx + 1]); cx += 2; }
      else cx += 1;
    }
    if (o.ceil) L.rect(x + 2, o.ceil, cx - 1, o.ceil, 'W');
    if (o.coins) hazards.forEach(([a, b], i) => i % 3 === 1 && L.coin(a, 3));
    note(L, 'spikes', x0, cx + 1, { hazards });
    return cx + 1;
  };

  /* -------------------------------------------------------------------
     PONT ROUILLÉ : un long pont de blocs qui s'effondrent au-dessus des
     pics. Un fil tendu peut faire tomber des blocs du plafond au milieu.
     ------------------------------------------------------------------- */
  S.crumbleBridge = (L, x, o) => {
    const len = o.len || 14, x0 = x;
    floor(L, x, x + 2);
    L.rect(x + 3, 0, x + 2 + len, 0, '^');
    L.crumble(x + 3, x + 2 + len, 1, o.delay || 0.45);
    if (o.coins) L.coins(x + 6, x + 8, 3);
    floor(L, x + 3 + len, x + 5 + len); L.rect(x + 3 + len, 1, x + 5 + len, 1, '#');
    note(L, 'crumbleBridge', x0, x + 6 + len, { bx0: x + 3, bx1: x + 3 + len, top: 2 });
    return x + 6 + len;
  };

  /* -------------------------------------------------------------------
     PISTONS : un couloir bas ; les pistons tombent du plafond en vague.
     Le piston tremble et la manette vibre juste avant de frapper.
     ------------------------------------------------------------------- */
  S.pistons = (L, x, o) => {
    const n = o.n || 5, gapX = o.gap || 3, ceil = o.ceil || 5, x0 = x;
    const len = 3 + n * gapX + 2;
    floor(L, x, x + len - 1);
    L.rect(x + 2, ceil, x + len - 3, L.h - 1, '#');
    const ps = [];
    for (let i = 0; i < n; i++) {
      const px = x + 3 + i * gapX, ph = (o.phase0 || 0) + i * (o.dph === undefined ? 0.35 : o.dph);
      L.piston(px, ph, { top: ceil - 1, bottom: 1, h: ceil + 1 });
      ps.push({ x: px, phase: ph });
      if (o.coins && i === n - 2) L.coin(px + 1, 1);
    }
    note(L, 'pistons', x0, x + len, { ps });
    return x + len;
  };

  /* -------------------------------------------------------------------
     MARTEAUX : des pendules accrochés au plafond. Leur arc est tracé au
     mur ; ils grincent à chaque aller-retour.
     ------------------------------------------------------------------- */
  S.hammers = (L, x, o) => {
    const n = o.n || 3, sp = o.space || 5, x0 = x, py = o.py || 7;
    const len = 4 + n * sp;
    floor(L, x, x + len - 1);
    const hs = [];
    for (let i = 0; i < n; i++) {
      const hx = x + 4 + i * sp, ph = (o.phase0 || 0) + i * (o.dph === undefined ? 1.6 : o.dph);
      L.hammer(hx, py, { len: py - 1.4, amp: o.amp || 1.0, period: o.period || 2.6, phase: ph });
      hs.push({ x: hx, phase: ph, period: o.period || 2.6, amp: o.amp || 1.0, len: py - 1.4, py });
      if (o.coins && i === 1) L.coin(hx, 4);
    }
    note(L, 'hammers', x0, x + len, { hs });
    return x + len;
  };

  /* -------------------------------------------------------------------
     ÉCRASEURS : des blocs suspendus qui tombent quand on passe dessous.
     Ils tremblent (tic tic tic) et leur ombre rougit : NE T'ARRÊTE PAS.
     ------------------------------------------------------------------- */
  S.crushers = (L, x, o) => {
    const n = o.n || 3, x0 = x, ceil = o.ceil || 6, hang = o.hang || 3;
    const sp = o.space || 5, len = 3 + n * sp + 2;
    floor(L, x, x + len - 1);
    L.rect(x + 1, ceil, x + len - 2, L.h - 1, '#');
    const ks = [];
    for (let i = 0; i < n; i++) { const kx = x + 3 + i * sp; L.crusher(kx, hang, { w: 2, h: ceil - hang }); ks.push(kx); }
    if (o.coins) L.coin(x + 3 + sp - 1, 2);
    note(L, 'crushers', x0, x + len, { ks });
    return x + len;
  };

  /* -------------------------------------------------------------------
     PIQUES RYTHMÉES : des piques sortent du sol l'une après l'autre.
     Les pointes dépassent un instant (clic) avant de jaillir.
     ------------------------------------------------------------------- */
  S.pikes = (L, x, o) => {
    const n = o.n || 6, x0 = x, sp = o.space || 2;
    const len = 3 + n * sp + 2;
    floor(L, x, x + len - 1);
    const pk = [];
    for (let i = 0; i < n; i++) {
      const px = x + 3 + i * sp, ph = (o.phase0 || 0) + i * (o.dph === undefined ? 0.25 : o.dph);
      L.pike(px, 1, { period: o.period || 2.2, phase: ph, len: 1.4 });
      pk.push({ x: px, phase: ph, period: o.period || 2.2 });
    }
    note(L, 'pikes', x0, x + len, { pk });
    return x + len;
  };

  /* -------------------------------------------------------------------
     SCIES : des scies sur rail. 'floor' = elles roulent sur le sol d'une
     fosse (on saute par-dessus quand elles s'éloignent) ; 'up' = elles
     montent et descendent dans un passage (on passe quand elle est en haut).
     ------------------------------------------------------------------- */
  S.saws = (L, x, o) => {
    const x0 = x, list = o.list || ['up', 'pit', 'up'];
    floor(L, x, x + 2); x += 3;
    const ss = [];
    list.forEach((kind, i) => {
      if (kind === 'up') {
        floor(L, x, x + 4);
        L.saw(x + 2, 1, x + 2, 4, { speed: o.speed || 2.4, phase: i * 0.3 });
        L.rect(x + 1, 6, x + 3, L.h - 1, '#');
        ss.push({ kind, x: x + 2, y0: 1, y1: 4, speed: o.speed || 2.4, phase: i * 0.3 });
        x += 5;
      } else {
        // fosse peu profonde avec une scie qui va et vient au fond ; on la franchit d'un saut
        floor(L, x, x + 1);
        L.rect(x + 2, 0, x + 6, 0, '#');
        L.saw(x + 2, 1, x + 6, 1, { speed: o.speed || 2.6, phase: i * 0.5, r: 0.55 });
        ss.push({ kind, x0: x + 2, x1: x + 6, speed: o.speed || 2.6, phase: i * 0.5 });
        floor(L, x + 7, x + 8);
        if (o.coins) L.coin(x + 4, 4);
        x += 9;
      }
    });
    floor(L, x, x + 1); x += 2;
    note(L, 'saws', x0, x, { ss });
    return x;
  };

  /* -------------------------------------------------------------------
     BIDONS : des bidons explosifs le long du chemin. Ils s'allument quand
     on s'approche (grésillement, étincelles) et explosent 1 s plus tard.
     Il faut passer vite… sans tomber dans le trou juste derrière.
     ------------------------------------------------------------------- */
  S.barrels = (L, x, o) => {
    const x0 = x, n = o.n || 3, sp = o.space || 6;
    const len = 3 + n * sp + 2;
    floor(L, x, x + len - 1);
    const bs = [];
    for (let i = 0; i < n; i++) {
      const bx = x + 4 + i * sp;
      L.barrel(bx, 1); bs.push(bx);
      if (o.pits && i % 2 === 1) { L.rect(bx + 2, 0, bx + 3, 0, ' '); }
    }
    note(L, 'barrels', x0, x + len, { bs });
    return x + len;
  };

  /* -------------------------------------------------------------------
     SOL PIÉGÉ « facile » : un couloir calme… avec quelques dalles fines
     fissurées. Celui qui marche dessus tombe. Il faut sauter par-dessus.
     ------------------------------------------------------------------- */
  S.troll = (L, x, o) => {
    const x0 = x, len = o.len || 16;
    floor(L, x, x + len - 1);
    const tx = x + (o.at || 7), w = o.w || 3;
    L.trapFloor(tx, tx + w - 1, 0);
    L.trigger(tx, 1, 'drop');
    if (o.sign) L.sign(x + 2, 1, o.sign);
    if (o.coins !== false) L.coins(tx, tx + 1, 3);
    note(L, 'troll', x0, x + len, { tx, w });
    return x + len;
  };

  /* -------------------------------------------------------------------
     FIL TENDU : un fil rouge bien visible au sol. Le franchir fait tomber
     les blocs du plafond un peu plus loin. Malin : on le franchit, on
     recule, on laisse tomber, puis on repart.
     ------------------------------------------------------------------- */
  S.wireCeil = (L, x, o) => {
    const x0 = x, len = o.len || 14;
    floor(L, x, x + len - 1);
    const wx = x + 4;
    L.wire(wx, 1, 'ceiling');
    const top = Math.min(L.h - 2, o.top || 7);
    for (let k = wx + 2; k <= wx + 6; k++) L.set(k, top, 'v');
    if (o.coins) L.coin(wx + 4, 2);
    note(L, 'wireCeil', x0, x + len, { wx, v0: wx + 2, v1: wx + 6 });
    return x + len;
  };

  /* -------------------------------------------------------------------
     FAUSSES PIÈCES : une rangée de pièces au-dessus d'un sol fissuré.
     L'une d'elles ne flotte pas et tourne à l'envers : la prendre fait
     s'effondrer le sol. Les vraies pièces sont plus haut, à gauche et à droite.
     ------------------------------------------------------------------- */
  S.fakeCoins = (L, x, o) => {
    const x0 = x, len = 14;
    floor(L, x, x + len - 1);
    L.trapFloor(x + 5, x + 9, 0);
    L.coin(x + 3, 3); L.fakeCoin(x + 7, 2, 'drop'); L.coin(x + 11, 3);
    note(L, 'fakeCoins', x0, x + len, { fx: x + 7 });
    return x + len;
  };

  /* -------------------------------------------------------------------
     FAUX DRAPEAU : un drapeau sans lampe, au mât tordu, sur un sol fissuré.
     Le vrai point de reprise est un peu plus loin (avec sa lampe).
     ------------------------------------------------------------------- */
  S.fakeFlag = (L, x, o) => {
    const x0 = x, len = 14;
    floor(L, x, x + len - 1);
    L.trapFloor(x + 3, x + 7, 0);
    L.fakeFlag(x + 5, 1, 'drop');
    L.flag(x + 11, 1);
    note(L, 'fakeFlag', x0, x + len, { fx: x + 5 });
    return x + len;
  };

  /* -------------------------------------------------------------------
     PORTE CHRONOMÉTRÉE : le bouton ouvre la porte quelques secondes
     (tic-tac). Il faut COURIR (□ / Maj / stick à fond) pour passer.
     ------------------------------------------------------------------- */
  S.timedGate = (L, x, o) => {
    const x0 = x, d = o.dist || 12, t = o.time || 2.0;
    floor(L, x, x + d + 6);
    L.button(x + 2, 1, false, { time: t, g: 'tg' + x });
    L.gate(x + 2 + d, 1, Math.min(L.h - 2, 5), false, { g: 'tg' + x });
    L.rect(x + 2 + d, 6, x + 2 + d, L.h - 1, '#');
    if (o.obst) { L.set(x + 2 + Math.floor(d / 2), 1, '^'); }
    note(L, 'timedGate', x0, x + d + 7, { bx: x + 2, gx: x + 2 + d, obst: o.obst ? x + 2 + Math.floor(d / 2) : null });
    return x + d + 7;
  };

  /* -------------------------------------------------------------------
     CAISSE SUR LE BOUTON : la barrière reste ouverte tant que quelque
     chose appuie sur le bouton. Pousse la caisse dessus, saute par-dessus.
     ------------------------------------------------------------------- */
  S.crateBtn = (L, x, o) => {
    const x0 = x;
    floor(L, x, x + 18);
    L.crate(x + 4, 1);
    L.button(x + 10, 1, false, { g: 'cb' + x });
    L.gate(x + 14, 1, Math.min(L.h - 2, 5), false, { g: 'cb' + x });
    L.rect(x + 14, 6, x + 14, L.h - 1, '#');
    note(L, 'crateBtn', x0, x + 19, { cx: x + 4, bx: x + 10, gx: x + 14 });
    return x + 19;
  };

  /* -------------------------------------------------------------------
     CAISSE-MARCHE : une corniche trop haute pour un saut. Pousse la caisse
     contre le mur, monte dessus, puis saute.
     ------------------------------------------------------------------- */
  S.crateStep = (L, x, o) => {
    const x0 = x;
    floor(L, x, x + 20);
    L.crate(x + 3, 1);
    L.rect(x + 10, 1, x + 20, 3, '#');           // corniche (pieds à 4)
    if (o.coins !== false) L.coins(x + 13, x + 14, 5);
    L.rect(x + 21, 0, x + 22, 0, '#');
    note(L, 'crateStep', x0, x + 23, { cx: x + 3, wall: x + 10 });
    return x + 23;
  };

  /* -------------------------------------------------------------------
     LEVIERS : le levier fait apparaître le pont… mais ferme la barrière
     d'en face. De l'autre côté, un 2e levier remet tout à l'envers.
     ------------------------------------------------------------------- */
  S.levers = (L, x, o) => {
    const x0 = x, g = o.g || 0;
    floor(L, x, x + 4);
    L.lever(x + 2, 1, g);
    L.lblocks(x + 5, x + 10, 0, g);
    if (o.spikes !== false) L.rect(x + 5, -1, x + 10, -1, '^');
    floor(L, x + 11, x + 18);
    L.lever(x + 13, 1, g);
    L.gate(x + 16, 1, Math.min(L.h - 2, 5), false, { lv: g, inv: true });
    L.rect(x + 16, 6, x + 16, L.h - 1, '#');
    if (o.coins) L.coin(x + 8, 3);
    note(L, 'levers', x0, x + 19, { l1: x + 2, l2: x + 13, gx: x + 16, b0: x + 5, b1: x + 10 });
    return x + 19;
  };

  /* -------------------------------------------------------------------
     DEUX CHEMINS : en haut, le chemin RAPIDE (pics, blocs rouillés, plus de
     pièces) ; en bas, le chemin SÛR (plus long, une petite fosse à franchir).
     Ils se rejoignent à la fin.
     ------------------------------------------------------------------- */
  S.fork = (L, x, o) => {
    const x0 = x, len = Math.max(26, o.len || 30);
    floor(L, x, x + len - 1);
    // chemin du HAUT (rapide, risqué, plus de pièces) : une marche flottante, puis une corniche pleine de dangers
    L.rect(x + 3, 2, x + 4, 2, '#');
    L.rect(x + 7, 4, x + len - 7, 4, '#');
    for (let k = x + 10; k < x + len - 8; k += 5) L.set(k, 5, '^');
    if (o.crumble !== false) L.crumble(x + 12, x + 13, 4, 0.25);
    L.coin(x + 15, 7); L.coins(x + len - 9, x + len - 8, 6);
    // chemin du BAS (sûr, plus lent) : sous la corniche, une petite fosse à franchir sous le plafond bas
    const px = x + Math.floor(len / 2);
    L.rect(px, 0, px + 1, 0, '^');
    L.coin(px, 2);
    note(L, 'fork', x0, x + len, { px, top: 5, hi0: x + 7, hi1: x + len - 7 });
    return x + len;
  };

  /* -------------------------------------------------------------------
     SALLE SECRÈTE : au-dessus du chemin, un faux mur (on passe au travers)
     cache une petite salle avec des pièces. Un indice : le mur n'a pas
     tout à fait la même texture.
     ------------------------------------------------------------------- */
  S.secret = (L, x, o) => {
    const x0 = x, len = 16;
    floor(L, x, x + len - 1);
    L.rect(x + 4, 1, x + 5, 2, '#');                 // marche pour monter
    L.rect(x + 6, 3, x + 11, 3, '#');                // plancher de la salle (un trou au fond pour redescendre)
    L.rect(x + 6, 7, x + 14, 7, '#');                // plafond
    L.rect(x + 14, 3, x + 14, 6, '#');               // mur du fond
    L.set(x + 6, 4, 'o').set(x + 6, 5, 'o').set(x + 6, 6, 'o');   // le faux mur
    L.coins(x + 8, x + 10, 4);
    if (o.extra) L.coin(x + 10, 6);
    note(L, 'secret', x0, x + len);
    return x + len;
  };

  /* -------------------------------------------------------------------
     TOUR : on grimpe en zigzag (corniches à gauche et à droite), puis on
     redescend de l'autre côté par une glissade. La caméra recule.
     ------------------------------------------------------------------- */
  S.tower = (L, x, o) => {
    const x0 = x, w = 9, ytop = Math.min(o.h || 9, L.h - 4);
    floor(L, x, x + w + 6);
    const ledges = [{ x0: x, x1: x + w, y: 1 }];
    let y = 1, side = 0;
    // corniches en zigzag (gauche, droite, gauche…) ; la dernière est toujours à droite, collée au mur
    let n = Math.max(2, Math.floor((ytop - 1) / 2)); if (n % 2) n--;
    for (let k = 0; k < n; k++) {
      y += 2;
      const lx0 = side ? x + w - 4 : x + 1, lx1 = side ? x + w - 1 : x + 4;
      L.rect(lx0, y - 1, lx1, y - 1, '#');
      ledges.push({ x0: lx0, x1: lx1 + 1, y });
      if (o.coins !== false && side) L.coin(lx0 + 1, y + 1);
      side ^= 1;
    }
    L.rect(x + w, 1, x + w, y - 1, '#');                      // le mur : on passe par-dessus, tout en haut
    if (o.coins !== false) L.coins(x + w, x + w + 1, y + 1);
    note(L, 'tower', x0, x + w + 7, { ledges, top: y, wall: x + w });
    L.camz(x0 - 2, x + w + 7, 1.25, { yb: Math.max(0, (y - 4) * 0.55) });
    return x + w + 7;
  };

  /* -------------------------------------------------------------------
     PLATEFORMES : des plateformes automatiques au-dessus d'une fosse de pics.
     ------------------------------------------------------------------- */
  S.platRide = (L, x, o) => {
    const x0 = x, n = o.n || 2, len = 4 + n * 7 + 3;
    floor(L, x, x + 3);
    L.rect(x + 4, 0, x + len - 4, 0, '^');
    const ps = [];
    for (let i = 0; i < n; i++) {
      const px = x + 6 + i * 7;
      L.plat(px, 1, 'M', 2, { speed: o.speed || 1.4, phase: i * 1.6 });
      ps.push({ x: px, range: 2, speed: o.speed || 1.4, phase: i * 1.6 });
      if (o.coins && i === n - 1) L.coin(px + 1, 4);
    }
    floor(L, x + len - 3, x + len - 1);
    note(L, 'platRide', x0, x + len, { ps, end: x + len - 3 });
    return x + len;
  };

  /* -------------------------------------------------------------------
     SOL BRÛLANT : des plaques qui chauffent en rythme (elles rougeoient et
     grésillent avant de brûler), séparées par des îlots sûrs.
     ------------------------------------------------------------------- */
  S.heatRun = (L, x, o) => {
    const x0 = x, n = o.n || 3, w = o.w || 4;
    floor(L, x, x + 2); x += 3;
    const hs = [];
    for (let i = 0; i < n; i++) {
      const ph = (o.dph || 0) * i;
      L.heat(x, x + w - 1, 0, { period: o.period || 3, phase: ph });
      hs.push({ x0: x, x1: x + w, period: o.period || 3, phase: ph, hot: 0.9 });
      x += w;
      floor(L, x, x + 1); x += 2;
    }
    note(L, 'heatRun', x0, x, { hs });
    return x;
  };

  /* -------------------------------------------------------------------
     MURS QUI SE REFERMENT : des presses de chaque côté du passage.
     ------------------------------------------------------------------- */
  S.presses = (L, x, o) => {
    const x0 = x, n = o.n || 2, sp = 6, len = 3 + n * sp;
    floor(L, x, x + len - 1);
    const pr = [];
    for (let i = 0; i < n; i++) {
      const px = x + 3 + i * sp, ph = i * (o.dph || 1.1);
      L.rect(px - 1, 4, px - 1, L.h - 1, '#'); L.rect(px + 2, 4, px + 2, L.h - 1, '#');
      L.rect(px, 4, px + 1, 4, '#');
      L.press(px, 1, { gap: 2, h: 3, period: o.period || 2.8, phase: ph });
      pr.push({ x: px, phase: ph, period: o.period || 2.8 });
    }
    note(L, 'presses', x0, x + len, { pr });
    return x + len;
  };

  /* -------------------------------------------------------------------
     POURSUITE : la lave (ou le virus, ou l'effondrement) arrive. Il faut
     courir et sauter sans hésiter jusqu'à la zone sûre. Rare !
     ------------------------------------------------------------------- */
  S.chase = (L, x, o) => {
    const x0 = x, steps = o.steps || [[2, 6, 1], [3, 5, 1], [2, 4, 2], [3, 6, 1], [2, 5, 1], [3, 8, 1]];
    floor(L, x, x + 5);
    L.sign(x + 1, 1, o.sign || '⚠ NE TRAÎNE PAS');
    x += 6;
    const ledges = [{ x0: x0, x1: x, y: 1 }];
    for (const [gap, wid, top] of steps) {
      if (gap) L.rect(x, 0, x + gap - 1, 0, '^');
      x += gap;
      if (o.collapse) { L.rect(x, 0, x + wid - 1, top - 1, '#'); L.rect(x, top - 1, x + wid - 1, top - 1, '~'); }
      else L.rect(x, 0, x + wid - 1, top - 1, '#');
      ledges.push({ x0: x, x1: x + wid, y: top });
      x += wid;
    }
    floor(L, x, x + 7);
    L.chase(x0 + 2, x + 2, { speed: o.speed || 6, kind: o.kind || 'lava', y0: 0, y1: Math.min(L.h - 1, 9) });
    L.camz(x0, x + 2, 1.25);
    note(L, 'chase', x0, x + 8, { ledges, end: x + 2 });
    return x + 8;
  };

  /* -------------------------------------------------------------------
     TRIPLE PORTE : avant la zone suivante, trois portes. La fausse (son
     tourbillon tourne à l'envers), la piégée (lumière rouge pâle, elle
     renvoie en arrière) et la vraie (lumière bleue). À utiliser comme
     sortie de zone : renvoie la colonne de fin, la vraie porte est posée
     par l'appelant.
     ------------------------------------------------------------------- */
  S.doorTrio = (L, x, o) => {
    const x0 = x;
    floor(L, x, x + 13);
    L.fakeDoor(x + 3, 1, o.label || 'SORTIE');
    L.door(x + 7, 1, { to: [x0 + 1, 1], trap: true, label: o.label || 'SORTIE' });
    note(L, 'doorTrio', x0, x + 10, { fake: x + 3, trap: x + 7, realAt: x + 11 });
    return x + 10;
  };


  /* -------------------------------------------------------------------
     SOL ÉLECTRIQUE : des dalles électrifiées en rythme (1,3 s allumé,
     1,3 s coupé ; elles grésillent juste avant), séparées par des îlots.
     ------------------------------------------------------------------- */
  S.elecRun = (L, x, o) => {
    const x0 = x, n = o.n || 3, w = o.w || 4;
    floor(L, x, x + 2); x += 3;
    for (let i = 0; i < n; i++) { L.rect(x, 0, x + w - 1, 0, 'E'); x += w; floor(L, x, x + 1); x += 2; }
    note(L, 'elecRun', x0, x);
    return x;
  };
  /* -------------------------------------------------------------------
     LIENS (Monde 2) : deux liens. L'un a une faute de frappe (il renvoie au
     début) ; l'autre mène à la suite. Lis bien l'adresse !
     ------------------------------------------------------------------- */
  S.linkPick = (L, x, o) => {
    const x0 = x, len = 20;
    floor(L, x, x + len - 1);
    L.rect(x + 12, 1, x + 12, L.h - 2, '#');
    L.link(x + 4, 1, x0 + 1, 1, o.bad || 'www.osweI.cm', false);
    L.link(x + 9, 1, x + 14, 1, o.good || 'www.oswel.cm', true);
    if (o.coins !== false) L.coin(x + 16, 3);
    note(L, 'linkPick', x0, x + len, { bad: x + 4, good: x + 9, out: x + 14 });
    return x + len;
  };
  /* -------------------------------------------------------------------
     GLACE ET RESSORTS (Monde 2) : une piste de glace (on freine mal) qui
     finit au bord d'un trou, et des blocs-ressorts pour remonter.
     ------------------------------------------------------------------- */
  S.iceRun = (L, x, o) => {
    const x0 = x, len = 24;
    floor(L, x, x + 2);
    L.style(x + 3, x + 10, 0, 'R');
    L.rect(x + 11, 0, x + 13, 0, '^');
    L.style(x + 14, x + 15, 0, 'Y');
    L.rect(x + 18, 0, x + len - 1, 3, '#');
    if (o.coins !== false) L.coin(x + 20, 5);
    note(L, 'iceRun', x0, x + len, { ice0: x + 3, pit: x + 11, spring: x + 14, top: x + 18 });
    return x + len;
  };
  /* -------------------------------------------------------------------
     APESANTEUR (Monde 3) : une bulle de gravité réduite au-dessus d'un grand
     bassin d'acide ; des pics au plafond : on flotte… mais pas trop haut.
     ------------------------------------------------------------------- */
  S.lowgJump = (L, x, o) => {
    const x0 = x, len = o.len || 22, ceil = Math.min(L.h - 2, o.ceil || 7);
    floor(L, x, x + 2);
    L.acid(x + 3, x + len - 4, 0);
    L.rect(x + Math.floor(len / 2) - 1, 0, x + Math.floor(len / 2), 1, '#');   // un îlot au milieu
    L.rect(x + 3, ceil, x + len - 4, ceil, 'W');
    L.rect(x + 2, ceil + 1, x + len - 3, L.h - 1, '#');
    L.lowg(x + 2, 1, x + len - 3, ceil);
    floor(L, x + len - 3, x + len - 1);
    if (o.coins !== false) L.coin(x + Math.floor(len / 2), 4);
    note(L, 'lowgJump', x0, x + len);
    return x + len;
  };

  /* ===================================================================
     MONDE 2 — LE CODE
     =================================================================== */
  // blocs glitch qui disparaissent DANS L'ORDRE (une vague) au-dessus du vide
  S.glitchSeq = (L, x, o) => {
    const x0 = x, n = o.n || 8, per = o.period || 2.4;
    floor(L, x, x + 2); x += 3;
    for (let i = 0; i < n; i++) L.glitch(x + i, x + i, 0, i * (o.dph || 0.18), per);
    if (o.coins) L.coin(x + Math.floor(n / 2), 3);
    note(L, 'glitchSeq', x0, x + n + 3, { gx0: x, n, period: per, dph: o.dph || 0.18 });
    x += n;
    floor(L, x, x + 2);
    return x + 3;
  };
  // balises : <div> ouvre des blocs pour 5 s ; on referme avec </div> pour qu'ils restent
  S.tags = (L, x, o) => {
    const x0 = x, g = 'S' + x, len = 18;
    floor(L, x, x + 2);
    L.rect(x + 3, 0, x + 14, 0, '^');
    L.tags(x + 3, x + 14, 1, g);
    L.tagOpen(x + 1, 1, g, '<section>', o.time || 4);
    if (o.close !== false) L.tagClose(x + 9, 2, g, '</section>');
    floor(L, x + 15, x + len - 1);
    if (o.coins) L.coin(x + 7, 3);
    note(L, 'tags', x0, x + len, { g, t0: x + 1, b0: x + 3, b1: x + 14 });
    return x + len;
  };
  // le pont qui n'existe que si personne ne saute, et des pics qui sortent quand on saute
  S.jumpEvents = (L, x, o) => {
    const x0 = x, len = 20;
    floor(L, x, x + 2);
    L.rect(x + 3, 0, x + 9, 0, ' '); L.bridge(x + 3, x + 9, 0);
    floor(L, x + 10, x + len - 1);
    L.jumpSpikes(x + 12, x + 14, 1);
    L.set(x + 16, 1, '^');
    note(L, 'jumpEvents', x0, x + len, { br0: x + 3, br1: x + 9, j0: x + 12, j1: x + 14, sp: x + 16 });
    return x + len;
  };
  // le compilateur : le bouton construit un pont bloc par bloc (il faut attendre la fin)
  S.compileBridge = (L, x, o) => {
    const x0 = x, len = 18, g = 'cg' + x;
    floor(L, x, x + 3);
    L.rect(x + 4, 0, x + 13, 0, '^');
    const cells = []; for (let k = x + 4; k <= x + 13; k++) cells.push([k, 1]);
    L.compile(x + 2, 1, cells, { g, rate: o.rate || 0.22, say: 'Compilation…', done: 'Compilé : 0 erreur.' });
    floor(L, x + 14, x + len - 1);
    note(L, 'compileBridge', x0, x + len, { b0: x + 4, b1: x + 13, btn: x + 2 });
    return x + len;
  };
  // fenêtres qui montent et descendent (ascenseurs) pour grimper
  S.windows = (L, x, o) => {
    const x0 = x, len = 18;
    floor(L, x, x + 2);
    L.rect(x + 3, 0, x + 13, 0, '^');
    L.plat(x + 4, 1, 'V', 3, { speed: 1.2 });
    L.plat(x + 9, 1, 'V', 3, { speed: 1.2, phase: 1.3 });
    L.rect(x + 14, 0, x + len - 1, 3, '#');
    L.coin(x + 11, 6);
    note(L, 'windows', x0, x + len, { p1: x + 4, p2: x + 9, top: x + 14 });
    return x + len;
  };
  // commandes inversées : un BUG a inversé gauche et droite dans cette zone
  S.invertRun = (L, x, o) => {
    const x0 = x, len = o.len || 18;
    floor(L, x, x + len - 1);
    L.zone('invert', x + 2, 1, x + len - 2, 6);
    L.set(x + 7, 1, '^'); L.set(x + 12, 1, '^').set(x + 13, 1, '^');
    if (o.coins !== false) L.coin(x + 12, 3);
    note(L, 'invertRun', x0, x + len, { sp: [x + 7, x + 12] });
    return x + len;
  };

  /* ===================================================================
     MONDE 3 — LE LABORATOIRE
     =================================================================== */
  // lasers de plus en plus exigeants : lent, rapide, deux synchronisés
  S.laserRun = (L, x, o) => {
    const x0 = x, list = o.list || [[2.4, 0.5, 0], [1.6, 0.5, 0.4], [2.0, 0.55, 1.0]];
    const len = 4 + list.length * 5;
    floor(L, x, x + len - 1);
    const lz = [];
    list.forEach(([per, on, ph], i) => {
      const lx = x + 4 + i * 5;
      L.laser(lx, 1, lx, Math.min(L.h - 2, 6), { period: per, on, phase: ph });
      L.rect(lx, Math.min(L.h - 2, 6) + 1, lx, L.h - 1, '#');
      lz.push({ x: lx, period: per, on, phase: ph });
    });
    note(L, 'laserRun', x0, x + len, { lz });
    return x + len;
  };
  // tapis roulants à contre-sens au-dessus de l'acide
  S.beltAcid = (L, x, o) => {
    const x0 = x, len = 20;
    floor(L, x, x + 2);
    L.acid(x + 3, x + 16, 0);
    L.belt(x + 4, x + 8, 1, -1); L.rect(x + 4, 0, x + 8, 0, '#');
    L.belt(x + 11, x + 15, 1, -1); L.rect(x + 11, 0, x + 15, 0, '#');
    floor(L, x + 17, x + len - 1);
    note(L, 'beltAcid', x0, x + len, { b: [[x + 4, x + 9], [x + 11, x + 16]], end: x + 17 });
    return x + len;
  };
  // gelée qui ralentit + tapis accélérateur pour franchir un grand trou
  S.gooBoost = (L, x, o) => {
    const x0 = x, len = 24;
    floor(L, x, x + 2);
    L.goo(x + 3, x + 7, 0);
    floor(L, x + 8, x + 9); L.boost(x + 10, x + 11, 0, 1);
    L.rect(x + 12, 0, x + 17, 0, '^');
    floor(L, x + 18, x + len - 1);
    L.coin(x + 15, 4);
    note(L, 'gooBoost', x0, x + len, { boost: x + 10, land: x + 18 });
    return x + len;
  };
  // gravité forte : les sauts sont courts ; des marches basses et un fossé étroit
  S.heavy = (L, x, o) => {
    const x0 = x, len = 18;
    floor(L, x, x + len - 1);
    L.zone('heavy', x + 2, 1, x + len - 2, 7);
    L.rect(x + 5, 1, x + 6, 1, '#'); L.rect(x + 9, 0, x + 10, 0, '^'); L.rect(x + 12, 1, x + 13, 1, '#');
    note(L, 'heavy', x0, x + len, { s1: x + 5, pit: x + 9, s2: x + 12 });
    return x + len;
  };
  // la caisse bouclier : un laser horizontal balaie le couloir depuis la marche du fond ;
  // on pousse la caisse devant soi (elle arrête le rayon), puis on monte dessus pour atteindre la marche
  S.crateShield = (L, x, o) => {
    const x0 = x, len = 22;
    floor(L, x, x + len - 1);
    L.crate(x + 3, 1);
    L.laser(x + 2, 1, x + 16, 1, { on: 1, from: 1 });
    L.rect(x + 16, 1, x + len - 1, 2, '#');
    if (o.coins !== false) L.coins(x + 17, x + 18, 4);
    note(L, 'crateShield', x0, x + len, { cx: x + 3, step: x + 16 });
    return x + len;
  };
  // tourelles : elles tirent le long du couloir (l'œil rougit et bipe avant) ; on saute les tirs
  S.turrets = (L, x, o) => {
    const x0 = x, len = o.len || 20;
    floor(L, x, x + len - 1);
    L.turret(x + len - 2, 1, -1, { period: o.period || 2.2, speed: 6 });
    if (o.two) L.turret(x + len - 2, 3, -1, { period: o.period || 2.2, phase: 1.1, speed: 6 });
    L.rect(x + len - 2, 2, x + len - 2, 2, o.two ? '#' : ' ');
    L.rect(x + len - 1, 1, x + len - 1, 4, ' ');
    note(L, 'turrets', x0, x + len, { tx: x + len - 2 });
    return x + len;
  };

  /* ===================================================================
     MONDE 4 — NEXUS
     =================================================================== */
  // blocs rose / bleu : chaque saut fait basculer lesquels existent
  S.kqHop = (L, x, o) => {
    const x0 = x, len = 22;
    floor(L, x, x + 2);
    L.rect(x + 3, 0, x + 18, 0, '^');
    L.blocks(x + 4, 1, x + 6, 1, 'Q'); L.blocks(x + 9, 2, x + 11, 2, 'K'); L.blocks(x + 14, 1, x + 16, 1, 'Q');
    floor(L, x + 19, x + len - 1);
    note(L, 'kqHop', x0, x + len, { q1: x + 4, kx: x + 9, q2: x + 14, end: x + 19 });
    return x + len;
  };
  // gravité inversée : on marche au plafond au-dessus d'une fosse de pics
  S.flipRoom = (L, x, o) => {
    const x0 = x, len = 22, ceil = Math.min(L.h - 2, 7);
    floor(L, x, x + 2);
    L.rect(x + 3, 0, x + 18, 0, '^');
    L.rect(x + 2, ceil, x + 19, L.h - 1, '#');
    L.zone('flip', x + 2, 1, x + 19, ceil);
    L.rect(x + 9, ceil - 1, x + 9, ceil - 1, 'W');
    floor(L, x + 19, x + len - 1);
    L.coins(x + 12, x + 13, ceil - 1);
    note(L, 'flipRoom', x0, x + len, { z0: x + 2, z1: x + 19, ceil, w: x + 9 });
    return x + len;
  };
  // vent : il pousse en arrière au-dessus des trous
  S.windRun = (L, x, o) => {
    const x0 = x, len = 22, p = o.power || -3;
    floor(L, x, x + len - 1);
    L.zone('wind', x + 2, 1, x + len - 3, 8, { power: p });
    L.rect(x + 6, 0, x + 8, 0, ' '); L.rect(x + 13, 0, x + 15, 0, ' ');
    note(L, 'windRun', x0, x + len, { pits: [x + 6, x + 13], power: p });
    return x + len;
  };
  // portails : un piège (orange, il vacille, il renvoie au début de la section) et le bon (bleu)
  S.portalPick = (L, x, o) => {
    const x0 = x, len = 20;
    floor(L, x, x + len - 1);
    L.rect(x + 12, 1, x + 12, L.h - 2, '#');
    L.portal(x + 4, 1, x0 + 1, 1, { color: 0xff8a3a, label: 'RACCOURCI ?', trap: true });
    L.portal(x + 9, 1, x + 14, 1, { color: 0x3fd8ff, label: 'NEXUS' });
    if (o.coins !== false) L.coins(x + 15, x + 16, 3);
    note(L, 'portalPick', x0, x + len, { trap: x + 4, good: x + 9, out: x + 14 });
    return x + len;
  };
  // ventilateur qui soulève vers une corniche haute
  S.fanLift = (L, x, o) => {
    const x0 = x, len = 16;
    floor(L, x, x + len - 1);
    L.fan(x + 4, 1, 7, 70);
    L.rect(x + 7, 1, x + len - 1, 5, '#');
    L.coins(x + 9, x + 10, 7);
    note(L, 'fanLift', x0, x + len, { fan: x + 4, ledge: x + 7, top: 6 });
    return x + len;
  };

  /* ===================================================================
     MONDE 5 — OSWEL CITY
     =================================================================== */
  // traverser la route : les voitures viennent du fond, on saute ou on s'abrite
  S.street = (L, x, o) => {
    const x0 = x, len = o.len || 24;
    floor(L, x, x + len - 1);
    L.rect(x + 9, 2, x + 11, 2, '#');               // abribus
    L.traffic(1, x + 2, x + len - 3, o.speed || 7, [{ off: 0, len: 2.2, h: 0.9 }, { off: 11, len: 3, h: 1.1 }]);
    note(L, 'street', x0, x + len, { s0: x + 9, s1: x + 12, r0: x + 2, r1: x + len - 3 });
    return x + len;
  };
  // les toits : des sauts entre immeubles, une grue (plateforme) et un peu de vent
  S.rooftops = (L, x, o) => {
    const x0 = x, ledges = [{ x0: x, x1: x + 3, y: 1 }];
    floor(L, x, x + 2); x += 3;
    const steps = o.steps || [[2, 4, 2], [3, 3, 3], [2, 5, 2], [3, 4, 1]];
    for (const [gap, wid, top] of steps) {
      x += gap;
      L.rect(x, 0, x + wid - 1, top - 1, '#');
      ledges.push({ x0: x, x1: x + wid, y: top });
      x += wid;
    }
    floor(L, x, x + 1); ledges.push({ x0: x, x1: x + 2, y: 1 }); x += 2;
    note(L, 'rooftops', x0, x, { ledges });
    return x;
  };

  /* -------------------------------------------------------------------
     CONSTRUCTION D'UN GRAND NIVEAU
     plan = { h, par, zones: [{ name, goal, secs: [[type, options], …] }, …] }
     ------------------------------------------------------------------- */
  function grow(L, w, h) {
    for (const row of L.grid) while (row.length < w) row.push(' ');
    while (L.grid.length < h) L.grid.push(new Array(w).fill(' '));
    L.w = w; L.h = h;
  }
  function trim(L, w) {
    for (const row of L.grid) row.length = w;
    L.w = w;
    L.rect(w - 1, 0, w - 1, L.h - 1, '#');
    L.rect(0, L.h - 1, w - 1, L.h - 1, '#');
  }
  function extend(def, plan) {
    const L = def.build;
    if (L.extended) return;
    const W0 = L.w, H0 = L.h, H = Math.max(H0, plan.h || 13);
    grow(L, W0 + 900, H);
    if (H > H0) L.rect(0, H0, W0 - 1, H - 1, '#');        // la zone 1 garde son plafond d'origine
    // les pistons de la zone 1 gardent leur course d'origine
    for (const e of L.ents) if (e.type === 'piston' && e.top === undefined) { e.top = H0 - 3; e.h = H0; }
    L.secs = []; L.zonesX = [W0];
    const doors = L.ents.filter((e) => e.type === 'door' && !e.to);
    let x = W0;
    if (plan.escape) x += 10;   // boss : un vide entre l'arène et la fuite (on ne voit pas la suite pendant le combat)
    plan.zones.forEach((z, zi) => {
      const zoneN = zi + 2;
      if (zi === 0) doors.forEach((d) => Object.assign(d, { to: [x + 1, 1], zoneN, zoneName: z.name, zoneGoal: z.goal, zoneSay: z.say || null }));
      // boss : pas de porte dans l'arène. Quand le boss est vaincu, l'équipe est envoyée ici (la fuite)
      if (zi === 0 && plan.escape) L.escape = { to: [x + 1, 1], zoneN: (plan.approach ? plan.approach.length : 0) + 2, zoneName: z.name, zoneGoal: z.goal, say: plan.escapeSay, goal: plan.escapeGoal };
      floor(L, x, x + 3);                                   // palier d'arrivée
      x += 4;
      for (const [kind, o] of z.secs) {
        if (!S[kind]) { console.warn('Section inconnue :', kind); continue; }
        x = S[kind](L, x, o || {});
      }
      if (zi < plan.zones.length - 1) {
        // fin de zone : une cloison et sa porte de zone (point de reprise)
        const nz = plan.zones[zi + 1];
        floor(L, x, x + 4);
        L.rect(x + 4, 1, x + 4, H - 2, '#');
        L.gateDoor(x + 2, 1, [x + 5, 1], { zoneN: zoneN + 1, zoneName: nz.name, zoneGoal: nz.goal, zoneSay: nz.say || null, label: z.gateLabel || 'SUITE' });
        note(L, 'gate', x, x + 5, { dx: x + 2 });
        x += 5;
        L.zonesX.push(x);
      } else {
        // la vraie sortie du niveau
        floor(L, x, x + 7);
        L.door(x + 4, 1, plan.exitLabel ? { label: plan.exitLabel } : undefined);
        note(L, 'exit', x, x + 8, { dx: x + 4 });
        x += 8;
      }
    });
    // boss : L'ANTICHAMBRE. On commence le niveau ici (tout au bout, à droite) ; la dernière porte
    // mène à l'arène, où le combat commence. Elle compte comme les premières zones du niveau.
    if (plan.approach && plan.approach.length) {
      const arena = { x: L.spawn.x, y: L.spawn.y };
      L.zonesX.push(x);
      x += 9; L.rect(x - 9, 0, x - 1, H - 1, '#');        // un gros mur entre la fuite et l'antichambre
      L.approach = { x0: x, goal: plan.approach[0].goal, name: plan.approach[0].name };
      L.spawn = { x: x + 1, y: 1 };
      plan.approach.forEach((z, zi) => {
        floor(L, x, x + 3); x += 4;
        for (const [kind, o] of z.secs) {
          if (!S[kind]) { console.warn('Section inconnue :', kind); continue; }
          x = S[kind](L, x, o || {});
        }
        floor(L, x, x + 4);
        L.rect(x + 4, 1, x + 4, H - 2, '#');
        const last = zi === plan.approach.length - 1, nz = last ? null : plan.approach[zi + 1];
        if (last) L.gateDoor(x + 2, 1, [arena.x, arena.y], { zoneN: plan.approach.length + 1, zoneName: plan.arenaName || 'L\'arène', zoneGoal: def.goal || '', label: plan.arenaLabel || 'ARÈNE', arena: true });
        else L.gateDoor(x + 2, 1, [x + 5, 1], { zoneN: zi + 2, zoneName: nz.name, zoneGoal: nz.goal, label: z.gateLabel || 'SUITE' });
        note(L, 'gate', x, x + 5, { dx: x + 2 });
        x += 5;
        if (!last) L.zonesX.push(x);
      });
    }
    trim(L, x + 1);
    L.extended = true;
    if (plan.par) def.par = plan.par;
    if (plan.dialogs) def.dialogs = Object.assign({}, def.dialogs || {}, plan.dialogs);
    def.zones = plan.zones.map((z) => z.name);
  }
  // version 1.5 : les petits outils sont partagés avec les modules (js/pieges3.js, js/coop.js, js/gadgets.js…)
  return { S, extend, grow, trim, floor, note, pick };
})();
