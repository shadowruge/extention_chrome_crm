const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const buildDir = path.join(root, 'dist', 'firefox');
const archivePath = path.join(root, 'dist', 'whatsapp-crm-firefox.zip');
const manifestPath = path.join(root, 'manifest.firefox.json');
const files = [
  'LICENSE',
  'assets/icon16.png',
  'assets/icon48.png',
  'assets/icon128.png',
  'assets/pix-donation.png',
  'src/components/content.css',
  'src/components/popup.css',
  'src/components/sidepanel.css',
  'src/pages/popup.html',
  'src/pages/privacy.html',
  'src/pages/sidepanel.html',
  'src/scripts/background.js',
  'src/scripts/content.js',
  'src/scripts/metrics.js',
  'src/scripts/panel-firefox.js',
  'src/scripts/pix.js',
  'src/scripts/popup.js',
  'src/scripts/sidepanel.js'
];

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
fs.rmSync(buildDir, { recursive: true, force: true });
fs.mkdirSync(buildDir, { recursive: true });
fs.mkdirSync(path.dirname(archivePath), { recursive: true });
fs.copyFileSync(manifestPath, path.join(buildDir, 'manifest.json'));

for (const file of files) {
  const source = path.join(root, file);
  if (!fs.existsSync(source)) throw new Error(`Arquivo necessário não encontrado: ${file}`);
  const destinationFile = file === 'src/scripts/panel-firefox.js' ? 'src/scripts/panel.js' : file;
  const destination = path.join(buildDir, destinationFile);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(source, destination);
}

fs.rmSync(archivePath, { force: true });
const archiveFiles = files.map(file => file === 'src/scripts/panel-firefox.js' ? 'src/scripts/panel.js' : file);
const archive = spawnSync(
  'zip',
  ['-X', '-q', archivePath, 'manifest.json', ...archiveFiles],
  { cwd: buildDir, encoding: 'utf8' }
);
if (archive.error) throw archive.error;
if (archive.status !== 0) throw new Error(archive.stderr || 'Falha ao criar o ZIP Firefox');

const verification = spawnSync('zip', ['-T', archivePath], { encoding: 'utf8' });
if (verification.error) throw verification.error;
if (verification.status !== 0) throw new Error(verification.stderr || 'O ZIP gerado não passou na verificação');

console.log(`Pacote Firefox criado e verificado: ${path.relative(root, archivePath)}`);
