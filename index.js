'use strict';

// http://www.color.org/profileheader.xalter






const versionMap = {
  0x02000000: '2.0',
  0x02100000: '2.1',
  0x02400000: '2.4',
  0x04000000: '4.0',
  0x04200000: '4.2',
  0x04300000: '4.3'
};

const intentMap = {
  0: 'Perceptual',
  1: 'Relative',
  2: 'Saturation',
  3: 'Absolute'
};

const valueMap = {
  // Device
  scnr: 'Scanner',
  mntr: 'Monitor',
  prtr: 'Printer',
  link: 'Link',
  abst: 'Abstract',
  spac: 'Space',
  nmcl: 'Named color',
  // Platform
  appl: 'Apple',
  adbe: 'Adobe',
  msft: 'Microsoft',
  sunw: 'Sun Microsystems',
  sgi: 'Silicon Graphics',
  tgnt: 'Taligent'
};

const tagMap = {
  desc: 'description',
  cprt: 'copyright',
  dmdd: 'deviceModelDescription',
  vued: 'viewingConditionsDescription',
  wtpt: 'whitepoint',
  kTRC: 'greyToneReproductionCurve',
  chad: 'chromaticAdaptation',
  A2B0: 'A2B0',
  A2B1: 'A2B1',
  A2B2: 'A2B2',
  B2A0: 'B2A0',
  B2A1: 'B2A1',
  B2A2: 'B2A2',
  gamt: 'famut'
};

const getContentAtOffsetAsString = (buffer, offset) => {
  const value = buffer.slice(offset, offset + 4).toString().trim();
  return (value.toLowerCase() in valueMap) ? valueMap[value.toLowerCase()] : value;
};

const hasContentAtOffset = (buffer, offset) => buffer.readUInt32BE(offset) !== 0;

const readStringUTF16BE = (buffer, start, end) => {
  const data = buffer.slice(start, end);
  let value = '';
  for (let i = 0; i < data.length; i += 2) {
    value += String.fromCharCode((data[i] * 256) + data[i + 1]);
  }
  return value;
};

const readS15FixedNumber16 = (b) => ((b & 0x80000000) >> 16 * -1) + ((b & 0x7FFF0000) >> 16) + ((b & 0x0000FFFF) / 0x10000);
const writeS15FixedNumber16 = (f) => ((f * 0x10000) & 0xFFFF) + (((f & 0x7FFF) - (f & 0x8000)) << 16) >>> 0;

const invalid = (reason) => new Error(`Invalid ICC profile: ${reason}`);

module.exports.parse = (buffer) => {
  // Verify expected length
  const size = buffer.readUInt32BE(0);
  if (size !== buffer.length) {
    throw invalid('length mismatch');
  }
  // Verify 'acsp' signature
  const signature = buffer.slice(36, 40).toString();
  if (signature !== 'acsp') {
    throw invalid('missing signature');
  }
  // Integer attributes
  const profile = {
    length: buffer.readUInt32BE(8),
    version: versionMap[buffer.readUInt32BE(8)],
    intent: intentMap[buffer.readUInt32BE(64)]
  };
  // Four-byte string attributes
  [
    [4, 'cmm'],
    [12, 'deviceClass'],
    [16, 'colorSpace'],
    [20, 'connectionSpace'],
    [40, 'platform'],
    [48, 'manufacturer'],
    [52, 'model'],
    [80, 'creator']
  ].forEach(attr => {
    if (hasContentAtOffset(buffer, attr[0])) {
      profile[attr[1]] = getContentAtOffsetAsString(buffer, attr[0]);
    }
  });
  // Tags
  const tagCount = buffer.readUInt32BE(128);
  profile["tagCount"] = tagCount;
  let tagHeaderOffset = 132;
  const tagTable = new Array(tagCount).fill()
    .map((v, i) => [
      buffer.slice(132 + i * 12, 132 + i * 12 + 4).toString('utf8'),
      buffer.readUInt32BE(132 + i * 12 + 4),
      buffer.readUInt32BE(132 + i * 12 + 8)
    ])
    .map(([key, from, len]) => [
      key,
      buffer.slice(from, from + 4).toString('utf8'),
      buffer.slice(from + 4, from + len),
      from + 4,
      len - 4
    ])

  //console.log(tagTable)
  profile['tagTable'] = tagTable;
  //for (let i = 0; i < tagCount; i++) {
  for (const [tag, type, slice, from,len] of tagTable) {
    console.log({ tag, type, len, slice })
    let off = 0, inToff, inTlen, cluToff, cluTlen, ouToff, ouTlen;
    let e, inputTables, clut, outputTables;

    switch (type) {


      case 'desc':

        const tagValueSize = slice.readUInt32BE(4);

        //console.log({ tag, type, tagValueSize })

        if (tagValueSize > len) {
          throw invalid(`description tag value size out of bounds for ${tag}`);
        }
        off += 4
        profile[tagMap[tag]] = slice.slice(8, 8 + tagValueSize - 1).toString();
        break;

      case 'text':
        //TODO: this is probably wrong
        //off=+4
        const textSize = slice.readUInt32BE(1);

        profile[tagMap[tag]] = slice.slice(4, textSize - 29).toString().trim()
        break;
      case 'mluc':
        //TODO: this is probably wrong
        if (true) {
          // 4 bytes signature, 4 bytes reserved (must be 0), 4 bytes number of names, 4 bytes name record size (must be 12)
          off = 1;
          const numberOfNames = buffer.readUInt32BE(++off * 4);
          const nameRecordSize = buffer.readUInt32BE(++off * 4);
          if (nameRecordSize !== 12) {
            throw invalid(`mluc name record size must be 12 for tag ${tagSignature}`);
          }
          if (numberOfNames > 0) {
            // Entry: 2 bytes language code, 2 bytes country code, 4 bytes length, 4 bytes offset from start of tag
            // const languageCode = buffer.slice(tagOffset + 16, tagOffset + 18).toString();
            // const countryCode = buffer.slice(tagOffset + 18, tagOffset + 20).toString();
            const nameLength = buffer.readUInt32BE(++off * 4);
            const nameOffset = buffer.readUInt32BE(++off * 4);
            const nameStart = off + nameOffset;
            const nameStop = nameStart + nameLength;
            profile[tagMap[tagSignature]] = slice.slice(nameStart, nameStop).readString();//readStringUTF16BE(buffer, nameStart, nameStop);
          }
        }
        break;

      case 'XYZ ':
        profile[tagMap[tag]] = new Array(len / 4).fill()
          .map((v, j) => slice.readInt16BE(4 * j))
        break;

      case 'sf32':
        profile[tagMap[tag]] = new Array(len / 4).fill()
          .map((v, j) => slice.readUint32BE(4 * j))
          .map(readS15FixedNumber16)
        break;

      case 'mft1':
        //const padd1 = slice.slice(0,4).toString()
        off = 4
        const [i, o, g] = [
          slice.readUint8(off++),
          slice.readUint8(off++),
          slice.readUint8(off++)
        ]
        off++
        e = new Array(9).fill()
          .map((v, j) => slice.readUint32BE(off + j * 4))
          .map(readS15FixedNumber16)
        off += 9 * 4;
        inToff = off;
        inTlen = 256 * i;
        cluToff = inToff + inTlen
        ouTlen = 256 * o
        ouToff = len - ouTlen;
        cluTlen = ouToff - cluToff;

        profile[tagMap[tag]] = {
          i, o, g,
          e,
          inputTables: slice.slice(inToff, inToff + inTlen),//new Array(inTlen).fill().map((v,j)=>slice.readUint8(inToff + j))
          clut: slice.slice(cluToff, cluToff + cluTlen),//new Array(cluTlen).fill().map((v,j)=>slice.readUint8(cluToff + j))
          outputTables: slice.slice(ouToff, ouToff + ouTlen),//new Array(ouTlen).fill().map((v,j)=>slice.readUint8(ouToff + j))                       
          //inToff,inTlen,cluToff,cluTlen,ouToff,ouTlen,
          leek:len - ouTlen - cluTlen - inTlen -inToff
        }
        break;
      case 'mft2':
        //const padd1 = slice.slice(0,4).toString()
        off = 4
        const [ii, oo, gg] = [
          slice.readUint8(off++),
          slice.readUint8(off++),
          slice.readUint8(off++)
        ]
        off++
        e = new Array(9).fill()
          .map((v, j) => slice.readUint32BE(off + j * 4))
          .map(readS15FixedNumber16)
        off += 9 * 4;

        const [n, m] = [
          slice.readUint16BE(off),
          slice.readUint16BE(off + 2)
        ]

        inToff = off;
        inTlen = n * ii *2;
        cluToff = inToff + inTlen
        ouTlen = m * oo *2
        ouToff = len - ouTlen;
        cluTlen = ouToff - cluToff;

        profile[(tag in tagMap)?tagMap[tag]:tag] = {
          i: ii, o: oo, g: gg,
          e,
          n, m,
          inputTables: slice.slice(inToff, inToff + inTlen),//new Array(inTlen).fill().map((v,j)=>slice.readUint8(inToff + j))
          clut: slice.slice(cluToff, cluToff + cluTlen),//new Array(cluTlen).fill().map((v,j)=>slice.readUint8(cluToff + j))
          outputTables: slice.slice(ouToff, ouToff + ouTlen),//new Array(ouTlen).fill().map((v,j)=>slice.readUint8(ouToff + j))                       
          //inToff,inTlen,cluToff,cluTlen,ouToff,ouTlen,
          leek:len - ouTlen - cluTlen - inTlen -inToff
        }
        break;

      default:
        profile[(tag in tagMap)?tagMap[tag]:tag] = {
          tag, 
          type, 
          slice,
          from,
          len
        }
        //console.log({ tag, type, slice })
        break;
    }
  }
  return profile;
};


