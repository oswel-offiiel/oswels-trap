/* =====================================================================
   OSWEL'S TRAP — extensions.js  (version 1.5 « Gameplay 3.0 »)

   Le moteur de l'histoire (game.js) est un très gros fichier. Pour ajouter des
   pièges, des gadgets, la coop améliorée, l'écran partagé, les étoiles… SANS tout
   réécrire, la version 1.5 ajoute des « prises » (hooks) dans le moteur :
   un module branche sa fonction sur une prise, et le moteur l'appelle au bon moment.

   Trois façons de brancher quelque chose :

   1) un NOUVEAU TYPE D'ENTITÉ (ce qu'on écrit dans un niveau : { type: 'scie2', x, y… })
        OT.GameExt.type('scie2', {
          make(e, group, X)            → crée l'objet (avec son mesh) et le renvoie
          update(list, alive, dt, X)   → appelé à chaque pas de physique (tous les objets de ce type)
          reset(list, X)               → le niveau recommence (mort de toute l'équipe)
          solids(list, b, out, p, X)   → (facultatif) ajoute des boîtes solides près de la boîte b
        });
      Les objets créés sont rangés dans R.ents['scie2'] comme les pièges d'origine.

   2) une NOUVELLE TUILE (un caractère dans la grille du niveau)
        OT.GameExt.tile('L', {
          make(t, X)                   → doit remplir t.mesh (t = { ch, x, y, state, t, … })
          solid(t, X)                  → vrai si on peut marcher dessus en ce moment
          update(t, alive, dt, X)      → (facultatif) chaque pas de physique
          reset(t, X)                  → (facultatif) remise à zéro
        });

   3) une PRISE (hook) : OT.GameExt.on('nom', fonction)
        build(R, X)               le niveau vient d'être construit (ajouter des objets : X.addEnt)
        levelStart(R, X)          le niveau commence (joueurs placés)
        update(alive, dt, X)      fin de chaque pas de physique du monde
        frame(dt, rdt, X)         une fois par image (après la physique) : affichage, interface
        playerUpdate(p, inp, dt, X)  début de la mise à jour d'un joueur (gadgets, laisse coop…)
        airJump(p, X)             → vrai = autoriser un saut en l'air (double saut)
        beforeKill(p, cause, X)   → vrai = ANNULER cette mort (bouclier, phase…)
        kill(p, cause, X)         un joueur vient de tomber
        noTeamDeath(p, cause, X)  → vrai = en coop, le partenaire ne meurt PAS avec lui
        respawnOne(p, X)          → vrai = le module a fait réapparaître ce joueur seul (coop)
        blockTrigger(tr, alive, X) → vrai = ce déclencheur ne part pas maintenant (laisse coop)
        coinTaken(c, p, X)        une pièce vient d'être ramassée
        cpReached(c, p, X)        un point de reprise vient d'être validé
        reset(X)                  le niveau vient d'être remis à zéro (après une mort d'équipe)
        finish(info, X)           fin du niveau : on peut ajouter des champs à info (étoiles…)
        hud(data, X)              données du HUD : on peut en ajouter
        camera(target, dt, X)     cible de la caméra {x, y, z} : on peut la corriger
        render(renderer, scene, camera, X) → vrai = le module a dessiné l'image lui-même (écran partagé)
        clear()                   le niveau est détruit (nettoyer l'interface du module)
        solids(b, out, p, X)      ajouter des boîtes solides (murs qui bougent…) ; p peut être null

   X = l'API du moteur (OT.Game.api) : R, players, mode, worldId, levelIndex, kill, bubble,
   burst, shock, shake, overlap, pbox, tileSolid, setCheckpoint, slowmo, worldScale… (voir game.js).

   Une erreur dans un module ne doit JAMAIS bloquer le jeu : chaque appel est protégé
   (try/catch) et l'erreur est affichée une seule fois dans la console.
   ===================================================================== */

window.OT = window.OT || {};

OT.GameExt = (function () {
  const types = {};
  const tiles = {};
  const hooks = {};
  const warned = new Set();

  function warn(where, err) {
    const k = where + ':' + (err && err.message);
    if (warned.has(k)) return;
    warned.add(k);
    console.warn('[extension] ' + where, err);
  }

  return {
    types, tiles, hooks,
    /* enregistrer */
    type(name, def) { types[name] = def; return def; },
    tile(ch, def) { tiles[ch] = def; return def; },
    on(name, fn) { (hooks[name] = hooks[name] || []).push(fn); return fn; },
    off(name, fn) { const l = hooks[name]; if (l) { const i = l.indexOf(fn); if (i >= 0) l.splice(i, 1); } },
    has(name) { return !!(hooks[name] && hooks[name].length); },
    /* appeler toutes les fonctions d'une prise (résultat ignoré) */
    run(name, a, b, c, d, e) {
      const l = hooks[name];
      if (!l) return;
      for (let i = 0; i < l.length; i++) {
        try { l[i](a, b, c, d, e); } catch (err) { warn(name, err); }
      }
    },
    /* vrai si AU MOINS une fonction répond vrai (on s'arrête à la première) */
    any(name, a, b, c, d, e) {
      const l = hooks[name];
      if (!l) return false;
      for (let i = 0; i < l.length; i++) {
        try { if (l[i](a, b, c, d, e)) return true; } catch (err) { warn(name, err); }
      }
      return false;
    },
    /* protège un appel de type / tuile */
    safe(where, fn, fallback) {
      try { return fn(); } catch (err) { warn(where, err); return fallback; }
    },
    warn,
  };
})();
