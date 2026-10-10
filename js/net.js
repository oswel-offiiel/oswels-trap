/* =====================================================================
   OSWEL'S TRAP — net.js
   Fonctions EN LIGNE (facultatives). Elles parlent au petit serveur
   Django fourni dans le dossier « serveur/ » :
     - classement en ligne (meilleurs temps par niveau)
     - signalement de bugs
     - sauvegarde dans le nuage (un code à 6 caractères)
   Tant qu'aucune adresse de serveur n'est réglée (Options → Serveur),
   le jeu reste 100 % hors ligne et rien n'est envoyé.
   ===================================================================== */

window.OT = window.OT || {};

OT.Net = (function () {
  const base = () => String((OT.settings && OT.settings.server) || '').trim().replace(/\/+$/, '');

  async function req(method, path, body) {
    const url = base();
    if (!url) throw new Error('Aucun serveur réglé (Options → Serveur en ligne).');
    const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const to = ctrl ? setTimeout(() => ctrl.abort(), 9000) : 0;
    try {
      const r = await fetch(url + path, {
        method,
        headers: body ? { 'Content-Type': 'application/json' } : {},
        body: body ? JSON.stringify(body) : undefined,
        signal: ctrl ? ctrl.signal : undefined,
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data.error || ('Erreur du serveur (' + r.status + ')'));
      return data;
    } catch (e) {
      if (e.name === 'AbortError') throw new Error('Le serveur ne répond pas.');
      if (e instanceof TypeError) throw new Error('Impossible de joindre le serveur (adresse ou connexion internet ?).');
      throw e;
    } finally { clearTimeout(to); }
  }

  return {
    get enabled() { return !!base(); },
    ping: () => req('GET', '/api/ping/'),
    // score = { world, level, name, time, deaths, mode }
    submitScore: (s) => (base() ? req('POST', '/api/scores/', Object.assign({ v: OT.LAYOUT_V || 0 }, s)).catch(() => null) : Promise.resolve(null)),
    top: (world, level) => req('GET', `/api/scores/top/?world=${world}&level=${level}&v=${OT.LAYOUT_V || 0}`),
    bug: (report) => req('POST', '/api/bugs/', report),
    pushSave: (data) => req('POST', '/api/saves/', { data }),
    pullSave: (code) => req('GET', '/api/saves/' + encodeURIComponent(code.trim().toUpperCase()) + '/'),
  };
})();
