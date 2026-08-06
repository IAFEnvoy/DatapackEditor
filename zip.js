const encoder = new TextEncoder();

function put16(bytes, offset, value) { bytes[offset] = value & 255; bytes[offset + 1] = (value >>> 8) & 255; }
function put32(bytes, offset, value) { bytes[offset] = value & 255; bytes[offset + 1] = (value >>> 8) & 255; bytes[offset + 2] = (value >>> 16) & 255; bytes[offset + 3] = (value >>> 24) & 255; }

const crcTable = (() => {
  const table = new Uint32Array(256);
  for (let index = 0; index < 256; index += 1) {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) value = (value & 1) ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    table[index] = value >>> 0;
  }
  return table;
})();

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = crcTable[(crc ^ byte) & 255] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

// Creates a standards-compliant stored ZIP without an external dependency.
export function createZip(entries) {
  const files = [];
  const centralDirectory = [];
  let offset = 0;

  for (const [path, content] of Object.entries(entries)) {
    const name = encoder.encode(path);
    const data = content instanceof Uint8Array ? content : encoder.encode(content);
    const checksum = crc32(data);
    const local = new Uint8Array(30 + name.length + data.length);
    put32(local, 0, 0x04034b50); put16(local, 4, 20); put16(local, 6, 0); put16(local, 8, 0);
    put16(local, 10, 0); put16(local, 12, 0); put32(local, 14, checksum); put32(local, 18, data.length); put32(local, 22, data.length);
    put16(local, 26, name.length); put16(local, 28, 0); local.set(name, 30); local.set(data, 30 + name.length);
    files.push(local);

    const record = new Uint8Array(46 + name.length);
    put32(record, 0, 0x02014b50); put16(record, 4, 20); put16(record, 6, 20); put16(record, 8, 0); put16(record, 10, 0);
    put16(record, 12, 0); put16(record, 14, 0); put32(record, 16, checksum); put32(record, 20, data.length); put32(record, 24, data.length);
    put16(record, 28, name.length); put16(record, 30, 0); put16(record, 32, 0); put16(record, 34, 0); put16(record, 36, 0);
    put32(record, 38, 0); put32(record, 42, offset); record.set(name, 46);
    centralDirectory.push(record);
    offset += local.length;
  }

  const centralSize = centralDirectory.reduce((sum, record) => sum + record.length, 0);
  const footer = new Uint8Array(22);
  put32(footer, 0, 0x06054b50); put16(footer, 4, 0); put16(footer, 6, 0); put16(footer, 8, centralDirectory.length); put16(footer, 10, centralDirectory.length);
  put32(footer, 12, centralSize); put32(footer, 16, offset); put16(footer, 20, 0);
  return new Blob([...files, ...centralDirectory, footer], { type: "application/zip" });
}
