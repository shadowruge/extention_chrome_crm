(function exposePix(global) {
  const key = '0d43c7b1-070e-4769-8692-d400f4c12490';
  const recipient = 'IZAIAS';
  const city = 'RIO DE JANEIRO';

  function field(id, value) {
    const length = new TextEncoder().encode(value).length.toString().padStart(2, '0');
    return `${id}${length}${value}`;
  }

  function crc16(payload) {
    let crc = 0xffff;
    for (const byte of new TextEncoder().encode(payload)) {
      crc ^= byte << 8;
      for (let bit = 0; bit < 8; bit++) {
        crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
        crc &= 0xffff;
      }
    }
    return crc.toString(16).toUpperCase().padStart(4, '0');
  }

  const merchantAccount = field('00', 'BR.GOV.BCB.PIX') + field('01', key);
  const additionalData = field('05', '***');
  const payloadWithoutChecksum = [
    field('00', '01'),
    field('01', '11'),
    field('26', merchantAccount),
    field('52', '0000'),
    field('53', '986'),
    field('58', 'BR'),
    field('59', recipient),
    field('60', city),
    field('62', additionalData),
    '6304'
  ].join('');
  const copyPaste = `${payloadWithoutChecksum}${crc16(payloadWithoutChecksum)}`;

  const api = Object.freeze({ key, recipient, city, copyPaste, crc16 });
  global.CrmPix = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(globalThis);
