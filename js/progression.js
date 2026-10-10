/* =====================================================================
   OSWEL'S TRAP — progression.js  (version 1.5 : ÉTOILES ★★★ ET PROGRESSION)

   Les trois étoiles d'un niveau, des critères simples et toujours les mêmes :
     ★ 1 : le niveau est terminé ;
     ★ 2 : toutes les pièces du niveau ont été ramassées (sur une ou plusieurs parties) ;
     ★ 3 : le temps de référence est battu (médaille d'or, en mode normal).
   Elles se calculent à partir de la sauvegarde existante (rien de nouveau à
   enregistrer : pas de risque de les perdre, compatibles avec les anciens profils).

   L'écran « PROGRESSION » (menu principal) : par monde, niveaux terminés,
   étoiles, pièces, salles cachées, quêtes, boss, niveau secret, et ce qu'il
   reste à découvrir.
   ===================================================================== */
window.OT = window.OT || {};

OT.Stars = (function () {
  const coinsOf = (w, i) => { const lv = OT.WORLD_DATA[w] && OT.WORLD_DATA[w].levels[i]; return lv && lv.build ? lv.build.ents.filter((e) => e.type === 'coin').length : 0; };
  function of(p, w, i) {
    const W = p && p.worlds && p.worlds[w];
    const rec = W && W.done && W.done[i];
    if (!rec) return { n: 0, a: false, b: false, c: false };
    const tot = coinsOf(w, i), got = ((W.collected && W.collected[i]) || []).length;
    const a = true, b = got >= tot, c = rec.medal === 'or' && (rec.v || 0) === OT.LAYOUT_V;
    return { n: (a ? 1 : 0) + (b ? 1 : 0) + (c ? 1 : 0), a, b, c, got, tot };
  }
  function html(p, w, i) {
    const s = of(p, w, i);
    if (!s.a) return '';
    const t = `Terminé${s.b ? ' · toutes les pièces' : ` · pièces ${s.got}/${s.tot}`}${s.c ? ' · temps de référence battu' : ''}`;
    return `<span class="stars" title="${t}">${'★'.repeat(s.n)}<i>${'★'.repeat(3 - s.n)}</i></span>`;
  }
  function world(p, w) {
    const W = OT.WORLD_DATA[w]; if (!W) return null;
    let stars = 0, done = 0, coins = 0, coinsTot = 0, secretsTot = 0;
    W.levels.forEach((lv, i) => {
      if (lv.secret) return;
      const s = of(p, w, i); stars += s.n; if (s.a) done++;
      const P = p.worlds && p.worlds[w];
      coins += ((P && P.collected && P.collected[i]) || []).length; coinsTot += coinsOf(w, i);
      secretsTot += ((lv.build && lv.build.secs) || []).filter((q) => q.k === 'secret').length;
    });
    const q = OT.Quests ? OT.Quests.state(p) : null;
    const secrets = q ? Object.keys(q.secrets).filter((k) => k.startsWith(w + '-') && !k.startsWith(w + '-10-')).length : 0;
    const quests = OT.Quests ? OT.Quests.QUESTS.filter((Q) => Q.w === w) : [];
    const qDone = quests.filter((Q) => OT.Quests.questDone(p, Q.id)).length;
    const P = p.worlds && p.worlds[w];
    return { w, name: (OT.WORLDS.find((x) => x.id === w) || {}).name || W.name, done, stars, starsMax: 30, coins, coinsTot, secrets, secretsTot,
      qDone, qTot: quests.length, boss: !!(P && P.done && P.done[9]), quiz: !!(P && P.quiz && P.quiz.passed),
      secretOpen: OT.Quests ? OT.Quests.secretOpen(p, w) : false, secretDone: !!(P && P.done && P.done[10]), open: OT.Save.worldOpen(p, w) };
  }
  return { of, html, world };
})();

/* ---------- l'écran PROGRESSION ---------- */
(function () {
  function init() {
    const X = OT.UI && OT.UI.ext; if (!X) { setTimeout(init, 100); return; }
    if (!document.getElementById('screen-progres')) {
      const sec = document.createElement('section');
      sec.className = 'screen'; sec.id = 'screen-progres'; sec.dataset.back = 'title'; sec.hidden = true;
      sec.innerHTML = '<div class="panel wide"><div class="kicker">Tout ce que tu as accompli</div><h2>Progression</h2><div id="progres-body" class="scrolly"></div><button class="btn ghost" data-nav data-default data-act="back">Retour</button></div>';
      document.body.appendChild(sec);
    }
    const bar = (n, of) => `<span class="pbar"><i style="width:${of ? Math.round((n / of) * 100) : 0}%"></i></span>`;
    X.renderers.progres = () => {
      const p = OT.Save.active; if (!p) return;
      let tot = { done: 0, stars: 0, coins: 0, coinsTot: 0, secrets: 0, secretsTot: 0, qDone: 0, qTot: 0, boss: 0 };
      const rows = OT.WORLDS.filter((w) => OT.WORLD_DATA[w.id]).map((w) => {
        const s = OT.Stars.world(p, w.id);
        for (const k in tot) tot[k] += k === 'boss' ? (s.boss ? 1 : 0) : s[k];
        if (!s.open) return `<section class="pw locked"><h3>Monde ${w.id} — ${X.esc(s.name)}</h3><p class="muted">Réussis le quiz du monde précédent pour l'ouvrir.</p></section>`;
        const reste = [];
        if (s.done < 10) reste.push(`${10 - s.done} niveau(x) à terminer`);
        if (s.coins < s.coinsTot) reste.push(`${s.coinsTot - s.coins} pièce(s) à ramasser`);
        if (s.secrets < s.secretsTot) reste.push(`${s.secretsTot - s.secrets} salle(s) cachée(s)`);
        if (s.qDone < s.qTot) reste.push(`${s.qTot - s.qDone} quête(s)`);
        if (!s.secretOpen) reste.push('un niveau secret à débloquer (une quête de ce monde)');
        else if (!s.secretDone) reste.push('le niveau secret à terminer');
        return `<section class="pw"><h3>Monde ${w.id} — ${X.esc(s.name)}${s.boss ? ' <span class="ok">· boss vaincu ✓</span>' : ''}</h3>
          <ul class="pstats">
            <li><b>Niveaux</b> ${s.done}/10 ${bar(s.done, 10)}</li>
            <li><b>Étoiles</b> <span class="stars">★</span> ${s.stars}/${s.starsMax} ${bar(s.stars, s.starsMax)}</li>
            <li><b>Pièces</b> ${s.coins}/${s.coinsTot} ${bar(s.coins, s.coinsTot)}</li>
            <li><b>Salles cachées</b> ${s.secrets}/${s.secretsTot} ${bar(s.secrets, s.secretsTot)}</li>
            <li><b>Quêtes</b> ${s.qDone}/${s.qTot} ${bar(s.qDone, s.qTot)}</li>
            <li><b>Niveau secret</b> ${s.secretDone ? 'terminé ✓' : s.secretOpen ? 'ouvert' : 'verrouillé'}</li>
          </ul>${reste.length ? `<p class="muted small">Il reste : ${reste.join(' · ')}.</p>` : '<p class="ok small">Monde terminé à 100 % !</p>'}</section>`;
      }).join('');
      const pc = (a, b) => (b ? Math.round((a / b) * 100) : 0);
      X.$('#progres-body').innerHTML = `<div class="ptotal"><b>${pc(tot.stars, 150)} %</b> des étoiles · ${tot.done}/50 niveaux · ${tot.stars}/150 ★ · ${tot.coins}/${tot.coinsTot} pièces · ${tot.secrets}/${tot.secretsTot} salles cachées · ${tot.qDone}/${tot.qTot} quêtes · ${tot.boss}/5 boss</div>
        <p class="muted small">★ niveau terminé · ★ toutes ses pièces · ★ temps de référence battu (médaille d'or, mode normal).</p>${rows}`;
    };
    X.actions.progres = () => X.show('progres');
    // le bouton dans le menu principal, juste après le Carnet
    const carnet = document.querySelector('#screen-title [data-act="carnet"]');
    if (carnet && !document.querySelector('#screen-title [data-act="progres"]')) {
      const b = document.createElement('button');
      b.className = 'mm'; b.dataset.nav = ''; b.dataset.act = 'progres';
      b.innerHTML = '<i class="mmi"><svg viewBox="0 0 24 24"><path d="M12 3.5l2.6 5.3 5.8.8-4.2 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.2-4.1 5.8-.8z"/></svg></i><b>PROGRESSION</b><small>Étoiles, secrets, quêtes</small>';
      carnet.after(b);
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
