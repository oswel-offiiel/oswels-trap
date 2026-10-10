/* =====================================================================
   OSWEL'S TRAP — journal.js  (version 1.5 : LE JOURNAL)

   - Dans le Carnet (menu principal) : quêtes en cours et terminées, personnages
     rencontrés et leur rôle, salles cachées, niveaux secrets, indices reçus,
     souvenirs gagnés, titres, et ce qu'il faut savoir des boss vaincus.
   - En jeu (Pause → Journal) : un écran court, sans rien surcharger : l'objectif,
     les quêtes en cours, les derniers indices, et (pendant un combat) la phase du
     boss et comment le battre. Clavier, manette et tactile : comme les autres menus.
   ===================================================================== */
window.OT = window.OT || {};

OT.JournalUI = (function () {
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const wname = (w) => (OT.WORLDS.find((x) => x.id === +w) || {}).name || ('Monde ' + w);

  function questLi(q) {
    return `<li class="${q.done ? 'qdone' : 'qon'}"><b>${q.done ? '✓ ' : ''}${esc(q.title)}</b> <small>— ${esc(q.giver)} · Monde ${q.w}</small>
      <p>${esc(q.desc)}</p>${q.done ? '' : `<span class="qprog">Avancement : ${q.n}/${q.of}</span> `}<small class="muted">Récompense : ${esc(q.reward)}</small></li>`;
  }
  // ce qu'il faut savoir d'un boss (les explications exactes de chaque phase)
  function bossHtml(p) {
    let out = '';
    for (const w of Object.keys(OT.WORLD_DATA)) {
      const P = p.worlds && p.worlds[w];
      const T = OT.WORLD_DATA[w].bossText;
      if (!T || !(P && P.done && P.done[9])) continue;
      out += `<details class="jboss"><summary><b>${esc(T.name)}</b> — Monde ${w}, vaincu ✓</summary><ol>${T.phases.map((ph) => `<li><b>${esc(ph.name)}</b> : ${esc(ph.help)}</li>`).join('')}</ol></details>`;
    }
    return out || '<p class="muted">Bats un boss : ses phases et ses points faibles seront notés ici.</p>';
  }
  function carnetHtml(p) {
    if (!OT.Quests || !p) return '';
    const J = OT.Quests.journal(p);
    const act = J.quests.filter((q) => !q.done), fin = J.quests.filter((q) => q.done);
    const met = J.met.sort((a, b) => b.n - a.n);
    const hints = J.hints.slice(0, 10);
    return `<section class="cworld journal"><h3>Journal</h3>
      ${J.titles.length ? `<p class="titles">Titres : ${J.titles.map((t) => `<span class="ttl">${esc(t)}</span>`).join(' ')}</p>` : ''}
      ${J.compass ? '<p class="muted small">Équipement : <b>Boussole d\'Isaïe</b> — une flèche bleue au-dessus de ta tête montre la salle cachée ou l\'objet de quête le plus proche.</p>' : ''}
      <h4>Quêtes en cours</h4>${act.length ? `<ul class="quests">${act.map(questLi).join('')}</ul>` : '<p class="muted">Aucune. Parle aux personnages : certains ont besoin de toi.</p>'}
      ${fin.length ? `<h4>Quêtes terminées</h4><ul class="quests">${fin.map(questLi).join('')}</ul>` : ''}
      <h4>Niveaux secrets</h4><ul class="secretlv">${J.secretLv.map((s) => `<li>${s.open ? (s.done ? '✓' : '★') : '🔒'} <b>${s.open ? esc(s.title) : '???'}</b> <small>— ${esc(wname(s.w))}${s.open ? (s.done ? ', terminé' : ', ouvert : choisis-le dans la liste des niveaux') : ', une quête de ce monde l\'ouvre'}</small></li>`).join('')}</ul>
      <h4>Salles cachées trouvées</h4>${J.secrets.length ? `<p>${J.secrets.map((s) => `${s.w}-${s.i === 10 ? 'S' : s.i + 1}`).join(' · ')} <small class="muted">(${J.secrets.length})</small></p>` : '<p class="muted">Aucune pour l\'instant. Un faux mur a une texture un peu différente…</p>'}
      <h4>Personnages rencontrés</h4>${met.length ? `<p class="met">${met.map((m) => `<span><b>${esc(m.name)}</b>${m.role ? ` <small>${esc(m.role)}</small>` : ''}</span>`).join('')}</p>` : '<p class="muted">Parle aux personnages que tu croises (touche ACTION).</p>'}
      <h4>Derniers indices reçus</h4>${hints.length ? `<ul class="hints">${hints.map((h) => `<li><small>${h.w}-${h.i === 10 ? 'S' : h.i + 1} · ${esc((OT.CHARACTERS[h.who] || {}).name || h.who || '')}</small> ${esc(h.text)}</li>`).join('')}</ul>` : '<p class="muted">Demande un indice à un personnage : discret, détaillé ou la solution. Ça ne coûte rien.</p>'}
      ${J.journal.length ? `<h4>Souvenirs</h4><ul class="souv">${J.journal.map((e) => `<li><b>${esc(e.t)}</b> — ${esc(e.text)}</li>`).join('')}</ul>` : ''}
      <h4>Les boss vaincus : ce qu'il faut savoir</h4>${bossHtml(p)}
    </section>`;
  }

  /* ---------- l'écran Journal pendant une partie (depuis la pause) ---------- */
  function init() {
    const X = OT.UI && OT.UI.ext; if (!X) { setTimeout(init, 100); return; }
    if (!document.getElementById('screen-journal')) {
      const sec = document.createElement('section');
      sec.className = 'screen'; sec.id = 'screen-journal'; sec.dataset.back = 'pause'; sec.hidden = true;
      sec.innerHTML = '<div class="panel narrow"><div class="kicker">Pause</div><h2>Journal</h2><div id="journal-body" class="scrolly"></div><button class="btn ghost" data-nav data-default data-act="back">Retour</button></div>';
      document.body.appendChild(sec);
    }
    X.renderers.journal = () => {
      const p = OT.Save.active; const api = OT.Game.api, R = api && api.R;
      let h = '';
      if (R) {
        h += `<p class="goalline"><b>Objectif :</b> ${esc(R.def.goal || 'Atteins la SORTIE.')}</p>`;
        // pendant un combat : la phase en cours et comment la passer
        const B = R.boss, T = OT.WORLD_DATA[api.worldId] && OT.WORLD_DATA[api.worldId].bossText;
        if (B && T && !R.bossWait && !R.escape && T.phases[B.phase]) h += `<div class="jbossnow"><b>${esc(T.name)} — ${esc(T.phases[B.phase].name)}</b><p>${esc(T.phases[B.phase].help)}</p></div>`;
        // (1.5) on joue Tony : son pouvoir choisi, ce qu'il fait, et les autres pouvoirs débloqués
        const tony = OT.TonyPowers && (api.players || []).find((q) => q.char === 'tony' && q.tpw);
        if (tony && (api.mode === 'solo' || api.mode === 'coop')) {
          const TP = OT.TonyPowers, P = TP.BY[tony.tpw.sel], list = TP.unlocked(api);
          h += `<div class="jbossnow"><b>Pouvoir de Tony : ${esc(P.icon + ' ' + P.name)}</b><p>${esc(P.what)} Recharge ${P.cd} s.</p>
            <p class="muted small">Débloqués : ${list.map((q) => esc(q.name)).join(' · ')} — touche ${esc(OT.Input.gadgetHint ? OT.Input.gadgetHint(tony.i) : 'F')} : appui court = utiliser, maintenir = changer.</p></div>`;
        }
      }
      if (OT.Quests && p) {
        const J = OT.Quests.journal(p);
        const act = J.quests.filter((q) => !q.done);
        h += `<h4>Quêtes en cours</h4>${act.length ? `<ul class="quests">${act.map(questLi).join('')}</ul>` : '<p class="muted small">Aucune quête en cours.</p>'}`;
        const w = api && api.worldId, i = api && api.levelIndex;
        const here = J.hints.filter((x) => x.w === w && x.i === i).slice(0, 4);
        h += `<h4>Indices pour ce niveau</h4>${here.length ? `<ul class="hints">${here.map((x) => `<li>${esc(x.text)}</li>`).join('')}</ul>` : '<p class="muted small">Aucun pour l\'instant. Parle à un personnage (touche ACTION) pour en demander un. Après plusieurs chutes au même endroit, quelqu\'un te soufflera aussi un conseil.</p>'}`;
        // un indice tout de suite, sur ce qui arrive (sans personnage) : le plus discret
        if (R && OT.Quests.hintTarget) {
          const pl = api.players && api.players[0], tg = pl ? OT.Quests.hintTarget(R, pl.x) : null;
          if (tg) h += `<p class="muted small"><b>Ce qui t'attend${tg.zone ? ` (« ${esc(tg.zone)} »)` : ''} :</b> ${esc(OT.Quests.HINTS[tg.k][0])}</p>`;
        }
      }
      X.$('#journal-body').innerHTML = h;
    };
    X.actions.journal = () => X.show('journal');
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
  return { carnetHtml };
})();
