/* =====================================================================
   OSWEL'S TRAP — light.js
   « Mode direct » de la manette PS4 (DualShock 4), via WebHID :
   la barre lumineuse ET les vibrations, envoyées directement à la manette.
   Utile aussi quand le navigateur ne fait pas vibrer la manette tout seul.
     - Joueur 1 : couleur de son personnage (bleu par défaut)
     - Joueur 2 : couleur de son personnage (orange par défaut)
     - Flash rouge quand on tombe, vert quand on passe la porte
   Ce mode lit aussi les BOUTONS de la manette : si Edge ou Chrome disent
   « aucune manette détectée » alors que la manette marche ailleurs, le
   mode direct la fait quand même fonctionner dans le jeu.
   WebHID marche dans Chrome et Edge sur ordinateur (Windows, Mac, Linux).
   Il faut l'autoriser UNE fois : Options → « Lumière de la manette PS4 ».
   Ensuite, la manette est reconnue toute seule à chaque lancement.
   (Sur Android et sur Firefox, WebHID n'existe pas : rien ne se passe.)
   ===================================================================== */

window.OT = window.OT || {};

OT.Light = (function () {
  const SONY = 0x054c;
  const supported = typeof navigator !== 'undefined' && 'hid' in navigator;
  const devs = [];                      // [{ dev, bt, rgb, strong, weak, stopT }]
  const base = [[0, 40, 255], [255, 110, 0]];
  const timers = [0, 0];
  const enabled = () => !OT.settings || OT.settings.lightbar !== false;

  // CRC32 (utilisé par le Bluetooth)
  const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  function crc32(bytes) { let c = 0xffffffff; for (const b of bytes) c = CRC[(c ^ b) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }

  const rgbOf = (hex) => [(hex >> 16) & 255, (hex >> 8) & 255, hex & 255];

  function isBT(d) {
    for (const c of d.collections || []) for (const r of c.outputReports || []) if (r.reportId === 0x11) return true;
    return false;
  }
  // seules les manettes choisies par le joueur arrivent ici (le navigateur ne donne accès qu'à celles-là)
  async function add(d) {
    if (devs.some((x) => x.dev === d)) return false;
    try { if (!d.opened) await d.open(); } catch (e) { return false; }
    const D = { dev: d, bt: isBT(d), rgb: base[devs.length] || base[0], strong: 0, weak: 0, stopT: 0, state: null };
    d.addEventListener('inputreport', (e) => readInput(D, e));
    devs.push(D);
    devs.forEach((_, i) => send(i));
    return true;
  }

  /* --- Lecture des boutons (rapports d'entrée de la DualShock 4) ---
     USB : rapport 0x01 · Bluetooth : 0x01 (simple) ou 0x11 (complet, 2 octets de plus au début).
     Octets : 0-3 joysticks (LX, LY, RX, RY), 4 = croix (4 bits) + □ ✕ ○ △,
              5 = L1 R1 L2 R2 SHARE OPTIONS L3 R3, 6 = PS + pavé tactile, 7-8 = L2 et R2 analogiques. */
  function readInput(D, e) {
    const v = e.data;
    let o;
    if (e.reportId === 0x01 && v.byteLength >= 9) o = 0;
    else if (e.reportId === 0x11 && v.byteLength >= 11) o = 2;
    else return;
    const b = (k) => v.getUint8(o + k);
    const b4 = b(4), b5 = b(5), b6 = b(6), dp = b4 & 0x0f;   // croix : 0 = haut, puis sens horaire, 8 = rien
    const ax = (x) => { const a = (x - 128) / 127.5; return Math.abs(a) < 0.06 ? 0 : Math.max(-1, Math.min(1, a)); };
    D.state = {
      axes: [ax(b(0)), ax(b(1)), ax(b(2)), ax(b(3))],
      // ordre « standard » : ✕ ○ □ △ L1 R1 L2 R2 SHARE OPTIONS L3 R3 haut bas gauche droite PS pavé
      buttons: [b4 & 0x20, b4 & 0x40, b4 & 0x10, b4 & 0x80, b5 & 0x01, b5 & 0x02, b(7) / 255, b(8) / 255, b5 & 0x10, b5 & 0x20, b5 & 0x40, b5 & 0x80,
        dp === 7 || dp <= 1, dp >= 1 && dp <= 3, dp >= 3 && dp <= 5, dp >= 5 && dp <= 7, b6 & 0x01, b6 & 0x02],
      t: performance.now(),
    };
    // pavé tactile : jusqu'à deux doigts (seulement dans les rapports complets : USB, ou Bluetooth 0x11)
    if (v.byteLength >= o + 42) {
      const f = (k) => {
        const id = b(k), x = b(k + 1) | ((b(k + 2) & 0x0f) << 8), y = (b(k + 2) >> 4) | (b(k + 3) << 4);
        return { down: !(id & 0x80), id: id & 0x7f, x: x / 1920, y: y / 943 };
      };
      D.touch = [f(34), f(38)];
    } else D.touch = null;
  }
  // manettes « virtuelles » au même format que l'API Gamepad du navigateur
  function hidPads() {
    const out = [];
    devs.forEach((D, k) => {
      if (!D.state) return;
      out.push({
        id: (D.dev.productName || 'Manette') + ' (mode direct, Vendor: ' + D.dev.vendorId.toString(16).padStart(4, '0') + ')',
        index: 100 + k, connected: true, mapping: 'standard', hid: true, timestamp: D.state.t,
        axes: D.state.axes,
        // L2 et R2 (6 et 7) sont progressifs, les autres boutons sont tout ou rien
        buttons: D.state.buttons.map((x, i) => (i === 6 || i === 7 ? { pressed: x > 0.5, value: x } : { pressed: !!x, value: x ? 1 : 0 })),
      });
    });
    return out;
  }

  function send(i, rgb) {
    const D = devs[i];
    if (!D) return;
    if (rgb) D.rgb = rgb;
    const [r, g, b] = enabled() ? D.rgb : [0, 0, 0];
    const weak = Math.round(Math.min(1, D.weak) * 255), strong = Math.round(Math.min(1, D.strong) * 255);
    try {
      if (!D.bt) {
        // USB : rapport 0x05 (31 octets sans l'identifiant)
        const data = new Uint8Array(31);
        data[0] = 0x07;             // 1 = vibrations, 2 = couleur, 4 = clignotement
        data[3] = weak; data[4] = strong;
        data[5] = r; data[6] = g; data[7] = b;
        D.dev.sendReport(0x05, data).catch(() => {});
      } else {
        // Bluetooth : rapport 0x11 (77 octets) avec un CRC32 à la fin
        const data = new Uint8Array(77);
        data[0] = 0xc0; data[1] = 0x20; data[2] = 0x07;
        data[5] = weak; data[6] = strong;
        data[7] = r; data[8] = g; data[9] = b;
        const crc = crc32([0xa2, 0x11, ...data.slice(0, 73)]);
        data[73] = crc & 255; data[74] = (crc >>> 8) & 255; data[75] = (crc >>> 16) & 255; data[76] = (crc >>> 24) & 255;
        D.dev.sendReport(0x11, data).catch(() => {});
      }
    } catch (e) { /* manette débranchée */ }
  }

  if (supported) {
    // manettes déjà autorisées lors d'une visite précédente
    navigator.hid.getDevices().then((list) => list.forEach(add)).catch(() => {});
    navigator.hid.addEventListener('connect', (e) => add(e.device));
    navigator.hid.addEventListener('disconnect', (e) => { const k = devs.findIndex((x) => x.dev === e.device); if (k >= 0) devs.splice(k, 1); });
  }

  return {
    supported,
    get count() { return devs.length; },
    pads: hidPads,
    // doigts posés sur le pavé tactile de chaque manette en mode direct : [[doigt1, doigt2], …]
    // (x et y de 0 à 1). Le navigateur seul ne donne PAS cette information.
    touches() { return devs.map((D) => D.touch || null); },
    get hasTouch() { return devs.some((D) => !!D.touch); },
    // à appeler depuis un clic (le navigateur affiche la liste des manettes)
    async connect() {
      if (!supported) return { ok: false, msg: 'Ce navigateur ne gère pas WebHID (utilise Chrome ou Edge sur ordinateur).' };
      try {
        // les manettes Sony, et toutes les autres manettes (compatibles PS4 d'autres marques)
        const list = await navigator.hid.requestDevice({ filters: [{ vendorId: SONY }, { usagePage: 0x01, usage: 0x05 }] });
        for (const d of list) await add(d);
      } catch (e) { return { ok: false, msg: 'Connexion annulée.' }; }
      return devs.length ? { ok: true, msg: `${devs.length} manette(s) en mode direct : boutons, lumière et vibrations.` } : { ok: false, msg: 'Aucune manette choisie.' };
    },
    // couleur « normale » du joueur i
    set(i, hex) {
      base[i] = rgbOf(hex);
      clearTimeout(timers[i]);
      send(i, base[i]);
    },
    // couleur temporaire (mort, victoire…) puis retour à la couleur du joueur
    flash(i, hex, sec) {
      send(i, rgbOf(hex));
      clearTimeout(timers[i]);
      timers[i] = setTimeout(() => send(i, base[i] || base[0]), (sec || 0.6) * 1000);
    },
    // vibrations : i = joueur (−1 = toutes les manettes), forces de 0 à 1, durée en ms
    rumble(i, strong, weak, ms) {
      const list = i < 0 ? devs.map((_, k) => k) : [i];
      for (const k of list) {
        const D = devs[k]; if (!D) continue;
        D.strong = Math.max(strong, D.stopT > Date.now() ? D.strong : 0);
        D.weak = Math.max(weak, D.stopT > Date.now() ? D.weak : 0);
        D.stopT = Date.now() + ms;
        send(k);
        clearTimeout(D.timer);
        D.timer = setTimeout(() => { D.strong = 0; D.weak = 0; send(k); }, ms);
      }
    },
    test() { [0, 1].forEach((i) => this.flash(i, 0xffffff, 0.4)); },
  };
})();
