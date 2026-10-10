/* =====================================================================
   OSWEL'S TRAP — main.js  (version PC : Windows et Linux, avec Electron)

   Electron = un navigateur Chromium + Node.js, emballés en une application.
   Ce fichier est le PROCESSUS PRINCIPAL : il ouvre la fenêtre du jeu,
   sert les fichiers du jeu, et démarre le serveur du RÉSEAU LOCAL quand
   on clique sur « Héberger ». Le jeu lui-même est exactement le jeu web
   (dossier jeu/, copié par preparer.js) : rien n'est réécrit.

   Points importants :
   - Le jeu est chargé depuis l'adresse oswel://jeu/index.html (un « protocole »
     maison). Pourquoi pas file:// ? Parce que les SAUVEGARDES (localStorage)
     sont rangées par adresse : celle-ci ne change jamais, même après une mise à jour.
   - Manettes : l'API Gamepad marche comme dans Chrome ; le « mode direct PS4 »
     (lumière, pavé tactile) passe par WebHID : on autorise les manettes Sony.
   - Réseau local : serveur-lan.js (fichiers + relais WebSocket) sur le port 47800.
   - Image du jeu envoyée aux manettes : on filme la fenêtre du jeu elle-même
     (menus et textes compris) grâce à setDisplayMediaRequestHandler.
   ===================================================================== */
'use strict';

const { app, BrowserWindow, protocol, net, session, ipcMain, shell, Menu } = require('electron');
const path = require('path');
const os = require('os');
const { pathToFileURL } = require('url');

const JEU = path.join(__dirname, 'jeu');            // les fichiers du jeu (copiés par preparer.js)
const ACCUEIL = 'oswel://jeu/index.html';
let fenetre = null;
let serveur = null;                                  // le serveur du réseau local (quand on héberge)

// WebRTC : on montre les vraies adresses locales (sinon Chrome les cache derrière des noms « .local »
// que certains Wi-Fi ne savent pas résoudre, et la vidéo vers les manettes ne passerait pas)
app.commandLine.appendSwitch('disable-features', 'WebRtcHideLocalIpsWithMdns');
// le son et la musique démarrent sans attendre un clic
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');

// une seule fenêtre du jeu à la fois : un 2e lancement remet la 1re au premier plan
if (!app.requestSingleInstanceLock()) { app.quit(); }
app.on('second-instance', () => { if (fenetre) { if (fenetre.isMinimized()) fenetre.restore(); fenetre.focus(); } });

// le protocole oswel:// doit être déclaré AVANT que l'application soit prête
protocol.registerSchemesAsPrivileged([{
  scheme: 'oswel',
  privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true, codeCache: true },
}]);

/* ---------- les fichiers du jeu, servis par oswel://jeu/… ---------- */
function servirJeu() {
  protocol.handle('oswel', (req) => {
    let rel;
    try { rel = decodeURIComponent(new URL(req.url).pathname); } catch (e) { return new Response('Adresse invalide', { status: 400 }); }
    if (rel === '/' || rel === '') rel = '/index.html';
    const fichier = path.normalize(path.join(JEU, rel));
    if (!fichier.startsWith(JEU)) return new Response('Interdit', { status: 403 });
    return net.fetch(pathToFileURL(fichier).toString());
  });
}

/* ---------- autorisations : manettes PS4 (WebHID), capture de la fenêtre ---------- */
function autorisations() {
  const ses = session.defaultSession;
  // « Mode direct PS4 » : le jeu demande une manette, on choisit la manette Sony (sinon la première)
  ses.on('select-hid-device', (event, details, callback) => {
    event.preventDefault();
    const liste = details.deviceList || [];
    const ds4 = liste.find((d) => d.vendorId === 0x054c) || liste[0];
    callback(ds4 ? ds4.deviceId : '');
  });
  ses.setPermissionCheckHandler((wc, permission) => ['hid', 'fullscreen', 'media', 'display-capture', 'clipboard-sanitized-write'].includes(permission));
  ses.setPermissionRequestHandler((wc, permission, callback) => callback(['hid', 'fullscreen', 'media', 'display-capture', 'clipboard-sanitized-write'].includes(permission)));
  ses.setDevicePermissionHandler((details) => details.deviceType === 'hid');
  // l'image du jeu pour les manettes : on filme CETTE fenêtre (pas l'écran entier)
  ses.setDisplayMediaRequestHandler((request, callback) => {
    try { callback({ video: request.frame, audio: request.frame }); }
    catch (e) { callback({}); }
  });
}

/* ---------- la fenêtre ---------- */
function creerFenetre() {
  fenetre = new BrowserWindow({
    width: 1280, height: 720, minWidth: 800, minHeight: 450,
    title: 'Oswel\'s Trap',
    backgroundColor: '#120d0b',
    icon: path.join(__dirname, 'jeu', 'img', 'icon-512.png'),
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      backgroundThrottling: false,      // l'hôte du réseau local continue même si la fenêtre n'a pas le focus
      autoplayPolicy: 'no-user-gesture-required',
    },
  });
  Menu.setApplicationMenu(null);
  fenetre.once('ready-to-show', () => { fenetre.maximize(); fenetre.show(); });
  fenetre.loadURL(ACCUEIL);

  // touches de la version PC : F11 = plein écran, F12 = outils de développement (console)
  fenetre.webContents.on('before-input-event', (event, input) => {
    if (input.type !== 'keyDown') return;
    if (input.key === 'F11') { fenetre.setFullScreen(!fenetre.isFullScreen()); event.preventDefault(); }
    else if (input.key === 'F12') { fenetre.webContents.toggleDevTools(); event.preventDefault(); }
  });
  // la fenêtre ne va que vers le jeu ou une manette du réseau local ; les liens web s'ouvrent dans le navigateur
  fenetre.webContents.on('will-navigate', (event, url) => {
    if (!adresseAutorisee(url)) { event.preventDefault(); if (/^https?:/.test(url)) shell.openExternal(url); }
  });
  fenetre.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  fenetre.on('closed', () => { fenetre = null; });
}

// adresses où la fenêtre a le droit d'aller : le jeu, ou la page manette d'un PC du réseau local
function adresseAutorisee(url) {
  if (url.startsWith('oswel://jeu/')) return true;
  try {
    const u = new URL(url);
    if (u.protocol !== 'http:') return false;
    const h = u.hostname;
    return /^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|169\.254\.)/.test(h) || /\.local$/.test(h) || /^[\w-]+$/.test(h);
  } catch (e) { return false; }
}

/* ---------- ce que la page du jeu peut demander (voir preload.js) ---------- */
function messages() {
  ipcMain.handle('lan:demarrer', async () => {
    try {
      if (!serveur) {
        const { demarrer } = require('./serveur-lan');
        serveur = await demarrer({ racine: JEU, port: 47800, nom: os.hostname() });
      }
      return { port: serveur.port, nom: serveur.nom, adresses: serveur.adresses() };
    } catch (e) { serveur = null; return { erreur: e.message }; }
  });
  ipcMain.handle('lan:arreter', async () => { if (serveur) { const s = serveur; serveur = null; await s.fermer(); } return true; });
  ipcMain.handle('lan:infos', () => (serveur ? { port: serveur.port, nom: serveur.nom, adresses: serveur.adresses(), manettes: serveur.manettes() } : null));
  ipcMain.handle('app:ouvrir', (e, url) => { if (fenetre && adresseAutorisee(String(url))) fenetre.loadURL(String(url)); return true; });
  ipcMain.handle('app:retourJeu', () => { if (fenetre) fenetre.loadURL(ACCUEIL); return true; });
  ipcMain.handle('app:pleinEcran', () => { if (fenetre) fenetre.setFullScreen(!fenetre.isFullScreen()); return true; });
  ipcMain.handle('app:quitter', () => { app.quit(); return true; });
}

app.whenReady().then(() => {
  servirJeu();
  autorisations();
  messages();
  creerFenetre();
});
app.on('window-all-closed', async () => {
  if (serveur) { try { await serveur.fermer(); } catch (e) {} }
  app.quit();
});
