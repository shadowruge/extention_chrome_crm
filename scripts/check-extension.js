const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));

if (manifest.manifest_version !== 3) throw new Error('Manifest deve usar a versao 3');
if (manifest.permissions.includes('tabs')) {
  throw new Error('A permissao ampla tabs nao deve ser solicitada; use o acesso ao host necessario');
}
if (!manifest.host_permissions?.includes('https://web.whatsapp.com/*')) {
  throw new Error('Permissao de host do WhatsApp Web nao declarada');
}

const requiredFiles = [
  manifest.background.service_worker,
  manifest.action.default_popup,
  manifest.side_panel.default_path,
  ...Object.values(manifest.icons),
  ...manifest.content_scripts.flatMap(script => [...(script.js || []), ...(script.css || [])])
];

for (const file of requiredFiles) {
  const absolute = path.join(root, file);
  if (!fs.existsSync(absolute)) throw new Error(`Arquivo declarado no manifest nao encontrado: ${file}`);
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
