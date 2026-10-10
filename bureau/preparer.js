/* =====================================================================
   OSWEL'S TRAP — preparer.js  (version PC et application mobile)
   Copie les fichiers du JEU (le dossier parent) dans un dossier de
   destination, sans les outils, le serveur Django, les dossiers de
   construction ni les notes de travail.
     node preparer.js                  → bureau/jeu   (version PC, Electron)
     node preparer.js ../mobile/www    → mobile/www   (application Android)
   ===================================================================== */
'use strict';
const fs = require('fs');
const path = require('path');

const SOURCE = path.resolve(__dirname, '..');
const DEST = path.resolve(__dirname, process.argv[2] || 'jeu');
// ce qui ne fait PAS partie du jeu
const EXCLURE = new Set(['bureau', 'mobile', 'tools', 'serveur', 'site', 'netlify.toml', 'node_modules', '.github', '.git', 'dist', 'CLAUDE.md']);
const EXT_EXCLUES = ['.zip', '.py', '.log', '.map'];

function copier(src, dst) {
  const st = fs.statSync(src);
  if (st.isDirectory()) {
    fs.mkdirSync(dst, { recursive: true });
    for (const nom of fs.readdirSync(src)) {
      if (src === SOURCE && EXCLURE.has(nom)) continue;
      if (nom.startsWith('.')) continue;
      copier(path.join(src, nom), path.join(dst, nom));
    }
  } else if (!EXT_EXCLUES.includes(path.extname(src).toLowerCase())) {
    fs.copyFileSync(src, dst);
  }
}

fs.rmSync(DEST, { recursive: true, force: true });
copier(SOURCE, DEST);
let n = 0; const compter = (d) => { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); if (fs.statSync(p).isDirectory()) compter(p); else n++; } };
compter(DEST);
console.log(`Jeu copié dans ${path.relative(process.cwd(), DEST) || DEST} : ${n} fichiers.`);
