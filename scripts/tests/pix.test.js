const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const jsQR = require('jsqr');
const { PNG } = require('pngjs');
const CrmPix = require('../../src/scripts/pix');

function parseFields(payload) {
  const fields = new Map();
  for (let offset = 0; offset < payload.length;) {
    const id = payload.slice(offset, offset + 2);
    const length = Number(payload.slice(offset + 2, offset + 4));
    const value = payload.slice(offset + 4, offset + 4 + length);
    fields.set(id, value);
    offset += 4 + length;
  }
  return fields;
}

test('gera payload Pix estático com chave, recebedor, cidade e CRC válido', () => {
  const payload = CrmPix.copyPaste;
  const fields = parseFields(payload.slice(0, -8));
  assert.ok(payload.includes(CrmPix.key));
  assert.ok(payload.includes('IZAIAS'));
  assert.ok(payload.includes('RIO DE JANEIRO'));
  assert.ok(payload.endsWith(CrmPix.crc16(payload.slice(0, -4))));
  assert.equal(payload.slice(-8, -4), '6304');
  assert.equal(fields.has('54'), false);
});

test('decodifica o QR Pix incluído no app para o mesmo payload Pix', () => {
  const qrPath = path.resolve(__dirname, '../../assets/pix-donation.png');
  const png = PNG.sync.read(fs.readFileSync(qrPath));
  assert.equal(png.width, png.height);
  assert.ok(png.width >= 500);
  const decoded = jsQR(new Uint8ClampedArray(png.data), png.width, png.height);
  assert.ok(decoded, 'O QR precisa ser decodificável');
  assert.equal(decoded.data, CrmPix.copyPaste);
});
