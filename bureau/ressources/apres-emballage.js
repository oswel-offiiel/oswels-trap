/* =====================================================================
   OSWEL'S TRAP — apres-emballage.js  (électron-builder : « afterPack »)
   Après l'emballage pour Windows, on met l'ICÔNE du jeu et ses informations
   (nom, version, auteur) dans « Oswel's Trap.exe ».
   On utilise la bibliothèque resedit (100 % JavaScript) : pas besoin de Wine,
   donc la version Windows se fabrique aussi depuis Linux (CachyOS).
   ===================================================================== */
'use strict';
const fs = require('fs');
const path = require('path');

exports.default = async function (context) {
  if (context.electronPlatformName !== 'win32') return;      // seulement pour Windows
  const ResEdit = require('resedit');
  const exe = path.join(context.appOutDir, `${context.packager.appInfo.productFilename}.exe`);
  if (!fs.existsSync(exe)) { console.warn('  • exécutable introuvable :', exe); return; }
  const version = context.packager.appInfo.version;            // ex. 1.5.0
  const v = version.split('.').map((n) => parseInt(n, 10) || 0).concat([0, 0, 0]).slice(0, 4);

  const data = fs.readFileSync(exe);
  const pe = ResEdit.NtExecutable.from(data, { ignoreCert: true });
  const res = ResEdit.NtExecutableResource.from(pe);

  // 1) l'icône (toutes les tailles du fichier .ico : 16 à 256 pixels)
  const ico = ResEdit.Data.IconFile.from(fs.readFileSync(path.join(__dirname, 'icone.ico')));
  const groupes = ResEdit.Resource.IconGroupEntry.fromEntries(res.entries);
  const idIcone = groupes.length ? groupes[0].id : 1, langue = groupes.length ? groupes[0].lang : 1033;
  ResEdit.Resource.IconGroupEntry.replaceIconsForResource(res.entries, idIcone, langue, ico.icons.map((i) => i.data));

  // 2) les informations visibles dans « Propriétés → Détails »
  const infos = ResEdit.Resource.VersionInfo.fromEntries(res.entries);
  for (const vi of infos) {
    vi.setFileVersion(v[0], v[1], v[2], v[3], 1033);
    vi.setProductVersion(v[0], v[1], v[2], v[3], 1033);
    vi.setStringValues({ lang: 1033, codepage: 1200 }, {
      FileDescription: 'Oswel\'s Trap',
      ProductName: 'Oswel\'s Trap',
      CompanyName: 'OSWEL OFFICIEL',
      LegalCopyright: '© OSWEL OFFICIEL',
      OriginalFilename: 'Oswel\'s Trap.exe',
      InternalName: 'oswels-trap',
    });
    vi.outputToResourceEntries(res.entries);
  }
  res.outputResource(pe);
  fs.writeFileSync(exe, Buffer.from(pe.generate()));
  console.log('  • icône et informations ajoutées à', path.basename(exe));
};
