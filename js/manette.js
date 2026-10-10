/* =====================================================================
   OSWEL'S TRAP — manette.js  (version 1.5 : la manette à distance)

   Cette page tourne sur l'appareil d'un INVITÉ (téléphone, tablette, autre PC).
   Elle se connecte au PC hôte (WebSocket) et lui envoie, plusieurs dizaines de
   fois par seconde, l'état d'une manette PS4 « virtuelle » :
     - boutons : un nombre où le bit k = le bouton k est appuyé
         (0 = ✕, 1 = ○, 2 = □, 3 = △, 9 = OPTIONS, 12-15 = croix directionnelle)
     - axes : [x, y, rx, ry] entre -1 et 1 (joystick gauche, joystick droit)
     - gâchettes : [L2, R2] entre 0 et 1
   D'où viennent les commandes : l'écran tactile (joystick + boutons), le clavier
   (sur un PC) et une vraie manette branchée sur CET appareil (elle est relayée).
   En retour, l'hôte envoie : la couleur et le nom du joueur, le rôle des boutons
   (« SAUT », « ACTION »…), les vibrations, et l'image du jeu (WebRTC) si on la demande.
   ===================================================================== */
(function () {
  'use strict';
  const $ = (s) => document.querySelector(s);
  const params = new URLSearchParams(location.search);
  const stocke = {
    get: (k, d) => { try { const v = localStorage.getItem('ot-manette-' + k); return v === null ? d : v; } catch (e) { return d; } },
    set: (k, v) => { try { localStorage.setItem('ot-manette-' + k, v); } catch (e) {} },
  };
  // un identifiant pour cet appareil : l'hôte lui rend sa place après une coupure
  let monId = stocke.get('id', '');
  if (!monId) { monId = Math.random().toString(36).slice(2, 10); stocke.set('id', monId); }
  const tactile = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
  const appareil = tactile ? 'telephone' : 'pc';

  /* ---------- l'adresse du PC hôte ---------- */
  // servie PAR l'hôte (cas normal) : c'est l'adresse de la page ; sinon ?hote=IP:PORT ou le champ à remplir
  const servieParHote = /^https?:$/.test(location.protocol) && location.port && location.hostname !== 'localhost' && !params.has('hote');
  let adresseHote = params.get('hote') || (servieParHote || /^https?:$/.test(location.protocol) && location.port ? location.host : '');
  const retour = params.get('retour');
  // « Retour au jeu » : version PC → on recharge le jeu ; ailleurs → l'adresse d'où l'on vient
  if (retour || window.OTDesktop) for (const id of ['#lien-retour1', '#lien-retour2']) {
    const a = $(id); a.hidden = false;
    a.onclick = () => { if (window.OTDesktop) window.OTDesktop.retourJeu(); else location.href = retour; };
  }
  if (servieParHote) $('#ligne-adresse').hidden = true;
  $('#adresse').value = adresseHote;
  $('#pseudo').value = stocke.get('nom', '');

  /* ---------- état de la manette virtuelle ---------- */
  const etat = { b: 0, ax: [0, 0, 0, 0], tr: [0, 0] };
  const tactileB = new Set();       // boutons appuyés au doigt
  const clavierB = new Set();       // boutons appuyés au clavier
  const stick = { x: 0, y: 0 };     // joystick tactile
  const touches = new Set();        // touches du clavier enfoncées

  /* ---------- connexion ---------- */
  let ws = null, cid = 0, connecte = false, monSlot = -1, essais = 0;
  function connecter() {
    const nom = ($('#pseudo').value || '').trim().slice(0, 16) || 'Invité';
    stocke.set('nom', nom);
    let adr = ($('#adresse').value || adresseHote || '').trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    if (!adr) { $('#etat-connexion').textContent = 'Tape l\'adresse affichée sur le PC hôte.'; return; }
    if (!/:\d+$/.test(adr)) adr += ':47800';
    adresseHote = adr;
    $('#etat-connexion').textContent = 'Connexion à ' + adr + '…';
    const url = `ws://${adr}/ws?role=manette&id=${encodeURIComponent(monId)}&nom=${encodeURIComponent(nom)}&appareil=${appareil}`;
    try { ws = new WebSocket(url); } catch (e) { $('#etat-connexion').textContent = 'Adresse invalide.'; return; }
    ws.onopen = () => { connecte = true; essais = 0; voile(null); envoyerEtat(true); };
    ws.onmessage = (ev) => { let m; try { m = JSON.parse(ev.data); } catch (e) { return; } recevoir(m); };
    ws.onclose = (ev) => {
      const etaitConnecte = connecte;
      connecte = false; ws = null;
      arreterVideo();
      if (ev.code === 4001) { voile('Retiré de la partie', 'L\'hôte t\'a retiré de la partie.', 'Se reconnecter', () => connecter()); return; }
      if (ev.code === 4002) { voile('Partie complète', 'Il y a déjà le nombre maximum de manettes.', 'Réessayer', () => connecter()); return; }
      if (!etaitConnecte && !$('#vue-connexion').hidden) { $('#etat-connexion').textContent = 'Pas de réponse. Même Wi-Fi ? Bonne adresse ? Le PC héberge-t-il la partie ?'; return; }
      // coupure (Wi-Fi, veille, PC qui arrête d'héberger) : on réessaie tout seul
      voile('Reconnexion…', ev.code === 4004 ? 'L\'hôte a arrêté la partie. On réessaie au cas où elle reprendrait.' : 'La connexion au PC hôte est coupée. On réessaie…');
      setTimeout(connecter, Math.min(6000, 800 * ++essais));
    };
  }
  function envoyer(m) { if (ws && ws.readyState === 1) ws.send(JSON.stringify(m)); }

  function recevoir(m) {
    switch (m.t) {
      case 'bienvenue':
        cid = m.cid;
        $('#nom-partie').textContent = 'Partie : ' + (m.nom || 'PC hôte');
        // (le jeu répond avec la liste des places : c'est elle qui fait passer à l'écran suivant)
        if (!m.hote) voile('En attente du jeu', 'Le PC est prêt mais le jeu n\'héberge pas encore : ouvre « Réseau local → Héberger » sur le PC.');
        break;
      case 'hote':
        if (m.ok) voile(null); else voile('En attente du jeu', 'Le jeu sur le PC hôte est fermé ou n\'héberge plus. Ne bouge pas : ça reprendra tout seul.');
        break;
      case 'places':
        monSlot = m.slot;
        dessinerPlaces(m.places);
        // juste connecté : l'hôte se souvient de notre place (coupure) → la manette ; sinon → choisir
        if (!$('#vue-connexion').hidden) afficher(monSlot >= 0 ? '#vue-manette' : '#vue-places');
        break;
      case 'joueur':
        document.documentElement.style.setProperty('--joueur', m.couleur || '#9c8f80');
        $('#badge-nom').textContent = m.nom || 'JOUEUR';
        for (const el of document.querySelectorAll('[data-l]')) {
          const t = m.aide && m.aide[el.dataset.l]; el.textContent = t || '';
          // sur un téléphone, un bouton qui ne sert à rien en ce moment disparaît (écran moins encombré)
          const bt = el.closest('.bt'); if (bt) bt.classList.toggle('vide', !t && tactile);
        }
        break;
      case 'vibre': vibrer(m.f, m.w, m.ms); break;
      case 'rtc': rtc(m); break;
      case 'video': if (m.ok === false) { bulle(m.raison || 'Vidéo impossible.'); arreterVideo(); } break;
      case 'pong': { const ms = Math.round(performance.now() - m.k); const p = $('#ping'); p.textContent = '● ' + ms + ' ms'; p.className = 'ping' + (ms > 120 ? ' mauvais' : ms > 60 ? ' lent' : ''); break; }
    }
  }

  /* ---------- choix du joueur ---------- */
  function dessinerPlaces(places) {
    const box = $('#places');
    box.innerHTML = '';
    for (const pl of places) {
      const b = document.createElement('button');
      b.className = 'place' + (pl.moi ? ' moi' : pl.nom ? ' prise' : '');
      b.style.setProperty('--c', pl.couleur);
      b.innerHTML = `<b>JOUEUR ${pl.slot + 1}</b><small>${pl.moi ? 'toi' : pl.nom ? escapeHtml(pl.nom) + ' (échanger)' : pl.slot < 2 ? 'Histoire et Soirée' : 'Soirée OSWEL'}</small>`;
      b.onclick = () => { envoyer({ t: 'place', slot: pl.slot }); afficher('#vue-manette'); };
      box.appendChild(b);
    }
  }
  const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  $('#btn-sans-place').onclick = () => { envoyer({ t: 'place', slot: -1 }); afficher('#vue-manette'); };
  $('#btn-place').onclick = () => afficher('#vue-places');

  function afficher(sel) {
    for (const v of document.querySelectorAll('.vue')) v.hidden = true;
    $(sel).hidden = false;
    if (sel === '#vue-manette') { $('#aide-clavier').hidden = tactile; antiVeille(); }
  }
  function voile(titre, texte, btn, action) {
    const v = $('#voile');
    if (!titre) { v.hidden = true; return; }
    v.hidden = false; $('#voile-titre').textContent = titre; $('#voile-texte').textContent = texte || '';
    const b = $('#voile-btn'); b.hidden = !btn; if (btn) { b.textContent = btn; b.onclick = () => { v.hidden = true; action(); }; }
  }
  let bulleT = 0;
  function bulle(t) { const b = $('#bulle'); b.textContent = t; b.hidden = false; clearTimeout(bulleT); bulleT = setTimeout(() => { b.hidden = true; }, 3500); }

  $('#btn-connecter').onclick = () => connecter();
  $('#pseudo').addEventListener('keydown', (e) => { if (e.key === 'Enter') connecter(); });
  $('#adresse').addEventListener('keydown', (e) => { if (e.key === 'Enter') connecter(); });
  $('#pseudo').addEventListener('change', () => { const n = $('#pseudo').value.trim().slice(0, 16); if (n) { stocke.set('nom', n); envoyer({ t: 'nom', nom: n }); } });

  /* ---------- le joystick tactile (il apparaît sous le pouce) ---------- */
  const zone = $('#zone-stick'), base = $('#stick-base'), knob = $('#stick-knob');
  let stickDoigt = null, cx = 0, cy = 0;
  const RAYON = 56;
  zone.addEventListener('pointerdown', (e) => {
    if (stickDoigt !== null) return;
    e.preventDefault();
    stickDoigt = e.pointerId;
    try { zone.setPointerCapture(e.pointerId); } catch (err) {}
    const r = zone.getBoundingClientRect();
    cx = e.clientX; cy = e.clientY;
    base.style.left = (cx - r.left) + 'px'; base.style.top = (cy - r.top) + 'px';
    zone.classList.add('actif');
    bougerStick(e);
  });
  zone.addEventListener('pointermove', (e) => { if (e.pointerId === stickDoigt) bougerStick(e); });
  const lacherStick = (e) => {
    if (e.pointerId !== stickDoigt) return;
    stickDoigt = null; stick.x = 0; stick.y = 0;
    knob.style.transform = '';
    zone.classList.remove('actif');
    envoyerEtat();
  };
  zone.addEventListener('pointerup', lacherStick);
  zone.addEventListener('pointercancel', lacherStick);
  function bougerStick(e) {
    let dx = e.clientX - cx, dy = e.clientY - cy;
    const d = Math.hypot(dx, dy);
    if (d > RAYON) { dx *= RAYON / d; dy *= RAYON / d; }
    knob.style.transform = `translate(${dx}px, ${dy}px)`;
    stick.x = dx / RAYON; stick.y = dy / RAYON;
    envoyerEtat();
  }

  /* ---------- les boutons tactiles (on peut glisser d'un bouton à l'autre) ---------- */
  const doigts = new Map();   // pointerId → numéro du bouton
  const boutonSous = (x, y) => { const el = document.elementFromPoint(x, y); const b = el && el.closest && el.closest('[data-b]'); return b ? +b.dataset.b : null; };
  function appui(k, on) {
    if (k === null || k === undefined) return;
    if (on) tactileB.add(k); else tactileB.delete(k);
    for (const el of document.querySelectorAll(`[data-b="${k}"]`)) el.classList.toggle('appui', on);
    if (on && navigator.vibrate) { try { navigator.vibrate(9); } catch (e) {} }
    envoyerEtat();
  }
  document.addEventListener('pointerdown', (e) => {
    const k = e.target.closest && e.target.closest('[data-b]') ? +e.target.closest('[data-b]').dataset.b : null;
    if (k === null) return;
    e.preventDefault();
    doigts.set(e.pointerId, k); appui(k, true);
  }, { passive: false });
  document.addEventListener('pointermove', (e) => {
    if (!doigts.has(e.pointerId)) return;
    const k = boutonSous(e.clientX, e.clientY);
    const avant = doigts.get(e.pointerId);
    if (k !== null && k !== avant) { doigts.set(e.pointerId, k); appui(avant, false); appui(k, true); }
  });
  const lacher = (e) => { if (!doigts.has(e.pointerId)) return; const k = doigts.get(e.pointerId); doigts.delete(e.pointerId); if (![...doigts.values()].includes(k)) appui(k, false); };
  document.addEventListener('pointerup', lacher);
  document.addEventListener('pointercancel', lacher);
  document.addEventListener('contextmenu', (e) => e.preventDefault());

  /* ---------- le clavier (manette sur un autre PC) ---------- */
  const CLAV = { Space: 0, KeyK: 0, Enter: 0, KeyE: 3, KeyJ: 3, ShiftLeft: 2, ShiftRight: 2, KeyL: 2, KeyF: 1, Backspace: 1, Escape: 9, KeyP: 9 };
  window.addEventListener('keydown', (e) => {
    if (e.target && e.target.tagName === 'INPUT') return;
    touches.add(e.code);
    if (CLAV[e.code] !== undefined) clavierB.add(CLAV[e.code]);
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Backspace'].includes(e.code)) e.preventDefault();
    envoyerEtat();
  });
  window.addEventListener('keyup', (e) => {
    touches.delete(e.code);
    if (CLAV[e.code] !== undefined && !Object.keys(CLAV).some((c) => CLAV[c] === CLAV[e.code] && touches.has(c))) clavierB.delete(CLAV[e.code]);
    envoyerEtat();
  });
  window.addEventListener('blur', () => { touches.clear(); clavierB.clear(); envoyerEtat(); });

  /* ---------- au repos (2,5 s sans toucher l'écran), les commandes se font presque invisibles ---------- */
  let reposT = 0;
  function reveil() { document.body.classList.remove('repos'); clearTimeout(reposT); reposT = setTimeout(() => document.body.classList.add('repos'), 2500); }
  document.addEventListener('pointerdown', reveil, true);
  reveil();

  /* ---------- tout rassembler et envoyer ---------- */
  let dernier = '', dernierT = 0;
  function lireManetteLocale() {
    // une vraie manette branchée sur CET appareil : elle est relayée telle quelle
    let g = null;
    try { g = Array.from(navigator.getGamepads ? navigator.getGamepads() : []).find((p) => p && p.connected); } catch (e) { g = null; }
    return g;
  }
  function envoyerEtat(force) {
    let b = 0;
    for (const k of tactileB) b |= 1 << k;
    for (const k of clavierB) b |= 1 << k;
    // clavier : ZQSD / WASD / flèches → joystick gauche
    let kx = (touches.has('KeyD') || touches.has('ArrowRight') ? 1 : 0) - (touches.has('KeyA') || touches.has('ArrowLeft') ? 1 : 0);
    let ky = (touches.has('KeyS') || touches.has('ArrowDown') ? 1 : 0) - (touches.has('KeyW') || touches.has('ArrowUp') ? 1 : 0);
    let ax = [stick.x, stick.y, 0, 0], tr = [0, 0];
    if (kx || ky) { ax[0] = kx; ax[1] = ky; }
    // les flèches servent aussi de croix directionnelle (menus)
    if (touches.has('ArrowUp')) b |= 1 << 12; if (touches.has('ArrowDown')) b |= 1 << 13;
    if (touches.has('ArrowLeft')) b |= 1 << 14; if (touches.has('ArrowRight')) b |= 1 << 15;
    const g = lireManetteLocale();
    if (g) {
      for (let k = 0; k < Math.min(17, g.buttons.length); k++) if (g.buttons[k] && (g.buttons[k].pressed || g.buttons[k].value > 0.5)) b |= 1 << k;
      for (let k = 0; k < 4; k++) if (Math.abs(g.axes[k] || 0) > Math.abs(ax[k])) ax[k] = g.axes[k];
      tr = [g.buttons[6] ? g.buttons[6].value : 0, g.buttons[7] ? g.buttons[7].value : 0];
    }
    ax = ax.map((v) => Math.round(Math.max(-1, Math.min(1, v)) * 100) / 100);
    tr = tr.map((v) => Math.round(v * 100) / 100);
    const s = b + '|' + ax.join(',') + '|' + tr.join(',');
    const now = performance.now();
    if (!force && s === dernier && now - dernierT < 400) return;   // rien n'a changé (on renvoie quand même 2-3 fois par seconde)
    dernier = s; dernierT = now;
    envoyer({ t: 'pad', b, ax, tr });
  }
  // une boucle pour la manette branchée (l'API Gamepad se lit, elle ne prévient pas) et pour le « je suis là »
  function boucle() { envoyerEtat(); requestAnimationFrame(boucle); }
  requestAnimationFrame(boucle);
  setInterval(() => { if (document.hidden) envoyerEtat(); envoyer({ t: 'ping', k: performance.now() }); }, 1000);

  /* ---------- vibrations reçues du jeu ---------- */
  function vibrer(f, w, ms) {
    const k = Math.max(+f || 0, +w || 0);
    if (k >= 0.25 && navigator.vibrate) { try { navigator.vibrate(Math.round(Math.min(600, ms * k))); } catch (e) {} }
    const g = lireManetteLocale();
    if (g && g.vibrationActuator && g.vibrationActuator.playEffect) {
      g.vibrationActuator.playEffect('dual-rumble', { duration: ms, strongMagnitude: Math.min(1, f || 0), weakMagnitude: Math.min(1, w || 0) }).catch(() => {});
    }
  }

  /* ---------- l'image du jeu (WebRTC) ---------- */
  let pc = null, videoOn = false;
  const ecran = $('#ecran');
  $('#btn-video').onclick = () => {
    if (videoOn) { arreterVideo(); envoyer({ t: 'video', on: false }); return; }
    videoOn = true; $('#btn-video').classList.add('on');
    bulle('Connexion à l\'écran du jeu…');
    envoyer({ t: 'video', on: true });
  };
  $('#btn-son').onclick = () => {
    ecran.muted = !ecran.muted;
    $('#btn-son').textContent = ecran.muted ? '🔇' : '🔊';
    ecran.play().catch(() => {});
  };
  function arreterVideo() {
    videoOn = false;
    $('#btn-video').classList.remove('on');
    if (pc) { try { pc.close(); } catch (e) {} pc = null; }
    ecran.srcObject = null; ecran.hidden = true;
    $('#btn-son').hidden = true;
    document.body.classList.remove('video');
  }
  async function rtc(m) {
    if (m.sdp && m.sdp.type === 'offer') {
      if (pc) { try { pc.close(); } catch (e) {} }
      pc = new RTCPeerConnection({ iceServers: [] });
      pc.ontrack = (ev) => {
        ecran.srcObject = ev.streams[0] || new MediaStream([ev.track]);
        ecran.hidden = false;
        document.body.classList.add('video');
        if (ev.track.kind === 'audio') $('#btn-son').hidden = false;   // l'hôte envoie aussi le son
        ecran.play().catch(() => {});
      };
      pc.onicecandidate = (ev) => { if (ev.candidate) envoyer({ t: 'rtc', cand: ev.candidate.toJSON() }); };
      pc.onconnectionstatechange = () => { if (pc && pc.connectionState === 'failed') { bulle('La vidéo ne passe pas sur ce Wi-Fi (les commandes marchent quand même).'); arreterVideo(); } };
      try {
        await pc.setRemoteDescription(m.sdp);
        const rep = await pc.createAnswer();
        await pc.setLocalDescription(rep);
        envoyer({ t: 'rtc', sdp: { type: pc.localDescription.type, sdp: pc.localDescription.sdp } });
      } catch (e) { bulle('Vidéo impossible sur cet appareil.'); arreterVideo(); }
    } else if (m.cand && pc) pc.addIceCandidate(m.cand).catch(() => {});
  }

  /* ---------- plein écran, écran allumé ---------- */
  $('#btn-plein').onclick = async () => {
    try {
      if (!document.fullscreenElement) { await document.documentElement.requestFullscreen({ navigationUI: 'hide' }); if (screen.orientation && screen.orientation.lock) screen.orientation.lock('landscape').catch(() => {}); }
      else await document.exitFullscreen();
    } catch (e) {}
  };
  let veille = null;
  async function antiVeille() {
    // garder l'écran allumé pendant qu'on joue (pas possible partout : le navigateur décide)
    try { if (navigator.wakeLock && !veille) { veille = await navigator.wakeLock.request('screen'); veille.addEventListener('release', () => { veille = null; }); } } catch (e) {}
  }
  document.addEventListener('visibilitychange', () => { if (!document.hidden && !$('#vue-manette').hidden) antiVeille(); });

  /* ---------- démarrage ---------- */
  // le pseudo est déjà connu et la page vient du PC hôte : connexion directe
  if (servieParHote && $('#pseudo').value) connecter();
  else setTimeout(() => (($('#pseudo').value ? $('#adresse') : $('#pseudo')) || {}).focus && (($('#pseudo').value ? $('#adresse') : $('#pseudo')).focus()), 200);
})();
