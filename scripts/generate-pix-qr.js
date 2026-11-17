const path = require('node:path');
const QRCode = require('qrcode');
const { copyPaste } = require('../src/scripts/pix');

const output = path.join(__dirname, '..', 'assets', 'pix-donation.png');

QRCode.toFile(output, copyPaste, {
  width: 512,
  margin: 4,
  errorCorrectionLevel: 'M',
  color: {
    dark: '#000000',
    light: '#ffffff'
  }
}).then(() => {
  console.log(`QR Pix gerado em ${output}`);
}).catch(error => {
  console.error('Falha ao gerar o QR Pix:', error);
  process.exitCode = 1;
});
