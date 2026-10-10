/* =====================================================================
   OSWEL'S TRAP — sw.js (service worker)
   Garde une copie du jeu sur l'appareil : une fois installé, le jeu
   marche SANS internet. Change VERSION à chaque mise à jour du jeu
   pour que les joueurs reçoivent les nouveaux fichiers.
   Les VOIX (audio/fr/…) ne sont pas toutes téléchargées à l'installation
   (16 Mo) : chaque voix est gardée la première fois qu'elle est jouée,
   puis elle marche hors ligne.
   ===================================================================== */
const VERSION = 'oswels-trap-1.5.1';
const VOICES = 'oswels-trap-voix-1.5';  // les voix : gardées d'une version à l'autre (1.5 : nouveau nom, car la voix de Tony et l'expressivité ont refait des fichiers sous le même nom)
const FILES = [
  './',
  'css/fonts.css',
  'css/style.css',
  'fonts/bungee-latin-400-normal.woff2',
  'fonts/chakra-petch-latin-400-normal.woff2',
  'fonts/chakra-petch-latin-600-normal.woff2',
  'fonts/chakra-petch-latin-700-normal.woff2',
  'fonts/chakra-petch-latin-ext-400-normal.woff2',
  'fonts/chakra-petch-latin-ext-600-normal.woff2',
  'fonts/chakra-petch-latin-ext-700-normal.woff2',
  'img/icon-192.png',
  'img/icon-512.png',
  'img/icon-maskable-512.png',
  'img/monde-1.jpg',
  'img/monde-2.jpg',
  'img/monde-3.jpg',
  'img/monde-4.jpg',
  'img/monde-5.jpg',
  'index.html',
  'js/arena/core.js',
  'js/arena/games/boum.js',
  'js/arena/games/course.js',
  'js/arena/games/magnet.js',
  'js/arena/games/panne.js',
  'js/arena/games/patate.js',
  'js/arena/games/piege.js',
  'js/arena/games/train.js',
  'js/arena/games/tresor.js',
  'js/arena/games/vole.js',
  'js/arena/podium.js',
  'js/arena/stadium.js',
  'js/arena/ui.js',
  'js/camera.js',
  'js/chars.js',
  'js/data.js',
  'js/dialogue.js',
  'js/game.js',
  'js/histoire.js',
  'js/input.js',
  'js/light.js',
  'js/models.js',
  'js/music.js',
  'js/levelplans.js',
  'js/net.js',
  'js/portrait.js',
  'js/previews.js',
  'js/repliques.js',
  'js/sections.js',
  'js/splash.js',
  'js/three.min.js',
  'js/ui.js',
  'js/voices.js',
  'js/world2.js',
  'js/world3.js',
  'js/world4.js',
  'js/world5.js',
  'js/extensions.js',
  'js/lan.js',
  'js/combat.js',
  'js/qrcode.js',
  'js/pieges3.js',
  'js/reactions.js',
  'js/quetes.js', 'js/pouvoirs.js',
  'js/journal.js',
  'js/progression.js',
  'manifest.json',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION && k !== VOICES).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

// D'abord le cache (rapide, marche hors ligne), sinon le réseau.
// Les appels au serveur en ligne (/api/) ne passent jamais par le cache.
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || req.url.includes('/api/')) return;
  // une voix : depuis le cache des voix, sinon on télécharge le fichier ENTIER (le lecteur audio
  // demande souvent un morceau, réponse 206 qu'on ne peut pas garder) et on le garde
  if (req.url.includes('/audio/')) {
    e.respondWith(caches.open(VOICES).then((c) => c.match(req.url).then((hit) => hit || fetch(req.url).then((res) => {
      if (res.ok && res.status === 200) c.put(req.url, res.clone());
      return res;
    }))).catch(() => fetch(req)));
    return;
  }
  e.respondWith(caches.match(req, { ignoreSearch: true }).then((hit) => hit || fetch(req).then((res) => {
    if (res.ok && res.status === 200 && new URL(req.url).origin === location.origin) { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); }
    return res;
  }).catch(() => caches.match('index.html'))));
});
