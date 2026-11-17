const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));
const firefoxManifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.firefox.json'), 'utf8'));

if (manifest.manifest_version !== 3) throw new Error('Manifest deve usar a versao 3');
if (manifest.permissions.includes('tabs')) {
  throw new Error('A permissao ampla tabs nao deve ser solicitada; use o acesso ao host necessario');
}
if (!manifest.host_permissions?.includes('https://web.whatsapp.com/*')) {
  throw new Error('Permissao de host do WhatsApp Web nao declarada');
}
if (manifest.background.service_worker !== 'src/scripts/background-worker.js') {
  throw new Error('O service worker Chrome deve carregar o adaptador de painel compartilhado');
}

if (firefoxManifest.manifest_version !== 3) throw new Error('Manifest Firefox deve usar a versao 3');
if (!firefoxManifest.sidebar_action?.default_panel) {
  throw new Error('Manifest Firefox deve declarar a barra lateral');
}
if (firefoxManifest.permissions.includes('sidePanel') || firefoxManifest.side_panel) {
  throw new Error('Manifest Firefox nao deve solicitar ou declarar APIs exclusivas do Chrome');
}
if (firefoxManifest.background?.service_worker || !firefoxManifest.background?.scripts?.includes('src/scripts/panel.js')) {
  throw new Error('Manifest Firefox deve carregar scripts de background e o adaptador de painel');
}
if (!firefoxManifest.host_permissions?.includes('https://web.whatsapp.com/*')) {
  throw new Error('Manifest Firefox nao declara acesso ao WhatsApp Web');
}
if (!firefoxManifest.browser_specific_settings?.gecko?.id) {
  throw new Error('Manifest Firefox deve declarar um ID Gecko para assinatura AMO');
}
if (!firefoxManifest.browser_specific_settings.gecko.data_collection_permissions?.required?.includes('none')) {
  throw new Error('Manifest Firefox deve declarar que nao transmite dados coletados');
}

const requiredFiles = [
  manifest.background.service_worker,
  manifest.action.default_popup,
  manifest.side_panel.default_path,
  'src/scripts/background.js',
  'src/scripts/panel.js',
  'src/scripts/panel-firefox.js',
  ...firefoxManifest.background.scripts,
  firefoxManifest.action.default_popup,
  firefoxManifest.sidebar_action.default_panel,
  ...Object.values(manifest.icons),
  ...Object.values(firefoxManifest.icons),
  ...manifest.content_scripts.flatMap(script => [...(script.js || []), ...(script.css || [])])
];

for (const file of requiredFiles) {
  const absolute = path.join(root, file);
  if (!fs.existsSync(absolute)) throw new Error(`Arquivo declarado no manifest nao encontrado: ${file}`);
}

for (const script of firefoxManifest.content_scripts) {
  for (const file of [...(script.js || []), ...(script.css || [])]) {
    if (!fs.existsSync(path.join(root, file))) throw new Error(`Arquivo Firefox declarado nao encontrado: ${file}`);
  }
}

for (const file of [
  'src/pages/popup.html',
  'src/pages/sidepanel.html',
  'src/pages/privacy.html'
]) {
  const html = fs.readFileSync(path.join(root, file), 'utf8');
  for (const match of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
    const ref = match[1];
    if (!/^(?:https?:|mailto:|#)/i.test(ref)) {
      const absolute = path.resolve(path.dirname(path.join(root, file)), ref);
      if (!fs.existsSync(absolute)) throw new Error(`Referencia quebrada em ${file}: ${ref}`);
    }
  }
}

for (const [dimension, file] of Object.entries(manifest.icons)) {
  const image = fs.readFileSync(path.join(root, file));
  const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  if (!image.subarray(0, 8).equals(pngSignature)) {
    throw new Error(`Icone nao e um PNG valido: ${file}`);
  }

  let offset = 8;
  let width;
  let height;
  let hasImageData = false;
  let hasEnd = false;
  while (offset + 12 <= image.length) {
    const length = image.readUInt32BE(offset);
    const type = image.toString('ascii', offset + 4, offset + 8);
    if (offset + length + 12 > image.length) {
      throw new Error(`PNG incompleto: ${file}`);
    }
    if (type === 'IHDR') {
      width = image.readUInt32BE(offset + 8);
      height = image.readUInt32BE(offset + 12);
    }
    if (type === 'IDAT') hasImageData = true;
    offset += length + 12;
    if (type === 'IEND') {
      hasEnd = true;
      break;
    }
  }
  if (!hasImageData || !hasEnd || offset !== image.length || width !== Number(dimension) || height !== Number(dimension)) {
    throw new Error(`PNG invalido ou com dimensao incorreta: ${file}`);
  }
}

console.log('Verificacao da estrutura da extensao concluida.');
