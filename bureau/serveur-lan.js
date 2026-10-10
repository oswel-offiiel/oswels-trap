/* =====================================================================
   OSWEL'S TRAP — serveur-lan.js  (version PC, réseau local)

   Le PC qui HÉBERGE la partie fait tourner ce petit serveur :
     1) un serveur web : les autres appareils du même Wi-Fi ouvrent
        http://ADRESSE-DU-PC:47800  →  la page « manette » (manette.html)
     2) un relais WebSocket (adresse /ws) : il fait passer les messages
        entre le JEU (la fenêtre du PC, rôle « hote ») et les MANETTES
        (téléphones, autres PC, rôle « manette »).

   Le serveur ne « joue » pas : il ne fait que transmettre. Le jeu tourne
   UNE seule fois, sur le PC hôte ; chaque manette envoie l'état de ses
   boutons et reçoit les vibrations, sa couleur, et (si on le demande)
   l'image du jeu en direct (vidéo WebRTC, négociée à travers ce relais).

   Utilisable de deux façons :
     - par la version PC (bureau/main.js) : require('./serveur-lan').demarrer({…})
     - tout seul, pour tester sans Electron :
         node bureau/serveur-lan.js            (sert le dossier du jeu, port 47800)
         node bureau/serveur-lan.js --port 8800 --racine ..
       puis ouvrir http://localhost:47800/index.html?hote=1 sur le PC.

   Sécurité : seul le PC lui-même (adresse 127.0.0.1) peut prendre le rôle
   « hôte » ; les fichiers servis sont seulement ceux du dossier du jeu.
   ===================================================================== */
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { WebSocketServer } = require('ws');

const PORT_DEFAUT = 47800;      // le port du jeu (le même à chaque fois : plus simple à retenir)
const MAX_MANETTES = 8;         // 4 joueurs + quelques spectateurs

// les types de fichiers que le serveur sait envoyer
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.webmanifest': 'application/manifest+json', '.txt': 'text/plain; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.webp': 'image/webp',
  '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wav': 'audio/wav', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf',
};

/* Les adresses IPv4 de ce PC sur le réseau local (Wi-Fi, câble, partage de connexion…) */
function adresses() {
  const out = [];
  for (const [nom, liste] of Object.entries(os.networkInterfaces())) {
    for (const i of liste || []) {
      if (i.family !== 'IPv4' && i.family !== 4) continue;
      if (i.internal) continue;
      // on met en premier les adresses « maison / école » classiques (192.168.x.x, 10.x.x.x, 172.16-31.x.x)
      const prive = /^(192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)/.test(i.address);
      out.push({ ip: i.address, carte: nom, prive });
    }
  }
  out.sort((a, b) => (b.prive ? 1 : 0) - (a.prive ? 1 : 0));
  return out;
}

const estLocal = (ip) => ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1';

/**
 * Démarre le serveur.
 * @param {object} o  { racine: dossier du jeu, port, nom: nom de la partie affiché sur les manettes, ecoute: '0.0.0.0' }
 * @returns {Promise<{port, adresses(), fermer(), manettes()}>}
 */
function demarrer(o = {}) {
  const racine = path.resolve(o.racine || path.join(__dirname, '..'));
  const nom = String(o.nom || os.hostname() || 'Oswel\'s Trap').slice(0, 40);
  let hote = null;                       // la fenêtre du jeu (une seule)
  const manettes = new Map();            // cid → { ws, id, nom, appareil }
  let prochainCid = 1;

  /* ---------- 1) le serveur web (fichiers du jeu) ---------- */
  const serveur = http.createServer((req, res) => {
    let url;
    try { url = new URL(req.url, 'http://x'); } catch (e) { res.writeHead(400); res.end(); return; }
    // la page d'accueil d'un invité = la manette
    if (url.pathname === '/' || url.pathname === '') { res.writeHead(302, { Location: '/manette.html' }); res.end(); return; }
    // informations (nom de la partie, joueurs connectés) : utilisées par la page manette
    if (url.pathname === '/lan/info') {
      res.writeHead(200, { 'Content-Type': TYPES['.json'], 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*' });
      res.end(JSON.stringify({ jeu: 'oswels-trap', nom, hote: !!hote, manettes: manettes.size, max: MAX_MANETTES, port: serveur.address().port, adresses: adresses() }));
      return;
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405); res.end(); return; }
    // fichier demandé : jamais en dehors du dossier du jeu
    let rel;
    try { rel = decodeURIComponent(url.pathname); } catch (e) { res.writeHead(400); res.end(); return; }
    const fichier = path.normalize(path.join(racine, rel));
    if (!fichier.startsWith(racine + path.sep) && fichier !== racine) { res.writeHead(403); res.end(); return; }
    fs.stat(fichier, (err, st) => {
      if (err || !st.isFile()) { res.writeHead(404, { 'Content-Type': TYPES['.txt'] }); res.end('Introuvable'); return; }
      const ext = path.extname(fichier).toLowerCase();
      res.writeHead(200, {
        'Content-Type': TYPES[ext] || 'application/octet-stream',
        'Content-Length': st.size,
        // les pages changent avec les versions ; les sons et images peuvent rester en cache
        'Cache-Control': ext === '.html' || ext === '.js' || ext === '.css' ? 'no-cache' : 'max-age=3600',
      });
      if (req.method === 'HEAD') { res.end(); return; }
      fs.createReadStream(fichier).pipe(res);
    });
  });

  /* ---------- 2) le relais WebSocket ---------- */
  const wss = new WebSocketServer({ noServer: true, maxPayload: 256 * 1024, perMessageDeflate: false });
  serveur.on('upgrade', (req, socket, head) => {
    let url;
    try { url = new URL(req.url, 'http://x'); } catch (e) { socket.destroy(); return; }
    if (url.pathname !== '/ws') { socket.destroy(); return; }
    wss.handleUpgrade(req, socket, head, (ws) => connexion(ws, req, url));
  });

  const envoyer = (ws, msg) => { if (ws && ws.readyState === 1) ws.send(typeof msg === 'string' ? msg : JSON.stringify(msg)); };

  function connexion(ws, req, url) {
    const ip = req.socket.remoteAddress || '';
    const role = url.searchParams.get('role');
    // le serveur vérifie que la connexion est toujours vivante (téléphone éteint, Wi-Fi coupé…)
    ws.vivant = true;
    ws.on('pong', () => { ws.vivant = true; });

    if (role === 'hote') {
      if (!estLocal(ip)) { ws.close(4003, 'Seul le PC hôte peut héberger.'); return; }
      if (hote) { try { hote.close(4000, 'Remplacé'); } catch (e) {} }
      hote = ws;
      // le jeu découvre les manettes déjà connectées
      for (const [cid, m] of manettes) envoyer(hote, { t: 'arrivee', cid, id: m.id, nom: m.nom, appareil: m.appareil });
      for (const m of manettes.values()) envoyer(m.ws, { t: 'hote', ok: true, nom });
      ws.on('message', (data) => {
        let msg; try { msg = JSON.parse(data); } catch (e) { return; }
        // le jeu écrit à UNE manette (to = cid) ou à toutes (to = 'tous')
        const to = msg.to; delete msg.to;
        if (to === 'tous') { const s = JSON.stringify(msg); for (const m of manettes.values()) envoyer(m.ws, s); }
        else if (to === 'fermer') { const m = manettes.get(msg.cid); if (m) m.ws.close(4001, msg.raison || 'Retiré par l\'hôte'); }
        else { const m = manettes.get(to); if (m) envoyer(m.ws, msg); }
      });
      ws.on('close', () => {
        if (hote !== ws) return;
        hote = null;
        for (const m of manettes.values()) envoyer(m.ws, { t: 'hote', ok: false, nom });
      });
      return;
    }

    // une MANETTE (téléphone, autre PC…)
    if (manettes.size >= MAX_MANETTES) { ws.close(4002, 'La partie est complète.'); return; }
    const cid = prochainCid++;
    const m = {
      ws,
      id: String(url.searchParams.get('id') || 'm' + cid).slice(0, 40),
      nom: String(url.searchParams.get('nom') || 'Invité').replace(/[<>]/g, '').slice(0, 16) || 'Invité',
      appareil: url.searchParams.get('appareil') === 'pc' ? 'pc' : 'telephone',
    };
    manettes.set(cid, m);
    envoyer(ws, { t: 'bienvenue', cid, nom, hote: !!hote });
    envoyer(hote, { t: 'arrivee', cid, id: m.id, nom: m.nom, appareil: m.appareil });
    ws.on('message', (data) => {
      let msg; try { msg = JSON.parse(data); } catch (e) { return; }
      if (!msg || typeof msg.t !== 'string') return;
      // mesure de la latence (aller-retour jusqu'au PC)
      if (msg.t === 'ping') { envoyer(ws, { t: 'pong', k: msg.k }); return; }
      if (msg.t === 'nom') m.nom = String(msg.nom || m.nom).replace(/[<>]/g, '').slice(0, 16) || m.nom;
      msg.cid = cid;
      envoyer(hote, msg);
    });
    ws.on('close', () => {
      manettes.delete(cid);
      envoyer(hote, { t: 'depart', cid });
    });
  }

  // toutes les 5 s : on ferme les connexions mortes (le téléphone s'est mis en veille…)
  const garde = setInterval(() => {
    for (const ws of wss.clients) {
      if (!ws.vivant) { ws.terminate(); continue; }
      ws.vivant = false;
      try { ws.ping(); } catch (e) {}
    }
  }, 5000);

  /* ---------- démarrage : si le port est pris, on essaie les suivants ---------- */
  const port0 = +o.port || PORT_DEFAUT;
  return new Promise((resolve, reject) => {
    let essai = 0;
    const tenter = () => {
      const port = port0 + essai;
      serveur.once('error', (err) => {
        if (err.code === 'EADDRINUSE' && essai < 10) { essai++; tenter(); }
        else reject(err);
      });
      serveur.listen(port, o.ecoute || '0.0.0.0', () => {
        resolve({
          port,
          nom,
          racine,
          adresses,
          manettes: () => manettes.size,
          get hote() { return !!hote; },
          fermer: () => new Promise((ok) => {
            clearInterval(garde);
            for (const ws of wss.clients) { try { ws.close(4004, 'La partie est terminée.'); } catch (e) {} }
            serveur.close(() => ok());
            setTimeout(ok, 1500);
          }),
        });
      });
    };
    tenter();
  });
}

module.exports = { demarrer, adresses, PORT_DEFAUT };

/* ---------- lancement direct : node bureau/serveur-lan.js ---------- */
if (require.main === module) {
  const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
  demarrer({ racine: arg('racine', path.join(__dirname, '..')), port: arg('port', PORT_DEFAUT), nom: arg('nom') })
    .then((s) => {
      console.log(`Oswel's Trap — réseau local prêt sur le port ${s.port}`);
      console.log(`  Jeu (sur ce PC) : http://localhost:${s.port}/index.html?hote=1`);
      for (const a of s.adresses()) console.log(`  Manettes : http://${a.ip}:${s.port}   (${a.carte})`);
    })
    .catch((e) => { console.error('Impossible de démarrer :', e.message); process.exit(1); });
}
