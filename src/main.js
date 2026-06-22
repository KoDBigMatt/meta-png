/**
 * Packs a number into a 4 bytes Uint8Array, treating it as uint32.
 *
 * @param {number} n - The number to convert
 * @returns {Uint8Array} - The array
*/
function packNumberAs4Bytes(n) {
  const buffer = new ArrayBuffer(4);
  const view = new DataView(buffer);
  view.setUint32(0, n);
  return new Uint8Array(view.buffer);
}

/**
 * Return a string from a DataView, starting from a certain offset, up to length bytes.
 *
 * @param {DataView} view - The source DataView
 * @param {number=} offset - The offset from which to start reading the DataView
 * @param {number=} length - The maximum number of bytes to read
 *
 * @returns {string} - A string containing the interpetation of the values in the view.
*/
function dataViewToString(view, offset = 0, length = view.byteLength) {
  let res = '';
  const maxLength = Math.min(length, view.byteLength - offset);
  for (let i = 0; i < maxLength; i += 1) {
    res += String.fromCharCode(view.getUint8(offset + i));
  }
  return res;
}

/**
 * Encodes a string (UTF-8) into an array of bytes.
 *
 * @param {string} s - The string to encode
 * @returns {Uint8Array} - The resulting array containing the encoded string.
*/
function encodeString(s) {
  return new TextEncoder().encode(s);
}

/**
 * Concatenates (joins) a sequence of Uint8Arrays.
 *
 * @param {Uint8Array[]} arrays - An array of Uint8Arrays to be concatenated in order.
 * @returns {Uint8Array} - The resulting concatenated array.
*/
function concatArrays(arrays) {
  const length = arrays.reduce((prev, array) => prev + array.byteLength, 0);
  const finalArray = new Uint8Array(length);
  for (let i = 0, lenSoFar = 0; i < arrays.length; i += 1) {
    finalArray.set(arrays[i], lenSoFar);
    lenSoFar += arrays[i].byteLength;
  }
  return finalArray;
}

/**
 * Returns a dataview on the entire the TypedArray/Buffer.
 * We need to be very careful here, because the are subtle incompatibilities
 * between JavaScript TypedArrays and Node.js Buffers.
 * A Buffer might not start from a zero offset on the underlying ArrayBuffer.
 * Using byteOffset, even when `array` is using only a portion of the
 * underlying ArrayBuffer (e.g., for optimization purposes with small arrays),
 * we still get a view on the right values.
 * See https://nodejs.org/api/buffer.html#bufbyteoffset
 * @param {Uint8Array} array - The array to get a DataView on.
 * @returns {DataView} - A DataView on the array.
 */
function getDataView(array) {
  return new DataView(array.buffer, array.byteOffset, array.byteLength);
}

/**
 * Checks whether a given array has a valid PNG header.
 *
 * @param {Uint8Array} array - The array to check.
 * @returns {boolean} - true if array has a valid PNG header, false otherwise.
*/
function isPNG(array) {
  const pngSignature = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
  if (array.length < pngSignature.length) {
    return false;
  }
  return getDataView(pngSignature).getBigUint64() === getDataView(array).getBigUint64();
}

/**
 * Computes the CRC32 of a given array.
 * Source: https://github.com/image-js/fast-png/blob/bdb81f93cc55aa89b312b50e5e2e8a39cdbde657/src/common.ts
 *
 * @param {Uint8Array} data - The array to compute the CRC32 of.
 * @returns {number} - The CRC32 of the array.
*/

const crcTable = [];
function crc(data) {
  /* eslint-disable no-plusplus */
  /* eslint-disable no-bitwise */
  // Pre-compute CRC table
  if (crcTable.length === 0) {
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) {
        if (c & 1) {
          c = 0xedb88320 ^ (c >>> 1);
        } else {
          c >>>= 1;
        }
      }
      crcTable[n] = c;
    }
  }
  const initialCrc = 0xffffffff;
  const updateCrc = (currentCrc, d, length) => {
    let c = currentCrc;
    for (let n = 0; n < length; n++) {
      c = crcTable[(c ^ d[n]) & 0xff] ^ (c >>> 8);
    }
    return c;
  };
  return (updateCrc(initialCrc, data, data.byteLength) ^ initialCrc) >>> 0;
}

/**
 * Adds in a tEXt chunk of a PNG file a metadata with the given key and value.
 * Warning: this function does not check whether the supplied key already exists.
 *
 * @param {Uint8Array} PNGUint8Array - Array containing bytes of a PNG file.
 * @param {string} key - Key (between 1 and 79 characters) used to identify the metadata.
 * @param {string} value - Value of the metadata to be set.
 * @returns {Uint8Array} - Array containing bytes of a PNG file with metadata.
*/
export function addMetadata(PNGUint8Array, key, value) {
  if (!isPNG(PNGUint8Array)) {
    throw new TypeError('Invalid PNG');
  }

  if (key.length < 1 || key.length > 79) {
    throw new TypeError('Invalid length for key');
  }

  // Prepare tEXt chunk to insert
  const chunkType = encodeString('tEXt');
  const chunkData = encodeString(`${key}\0${value}`);
  const chunkCRC = packNumberAs4Bytes(crc(concatArrays([chunkType, chunkData])));
  const chunkDataLen = packNumberAs4Bytes(chunkData.byteLength);
  const chunk = concatArrays([chunkDataLen, chunkType, chunkData, chunkCRC]);

  // Compute header (IHDR) length
  const headerDataLenOffset = 8;
  const headerDataLen = getDataView(PNGUint8Array).getUint32(headerDataLenOffset);
  const headerLen = 8 + 4 + 4 + headerDataLen + 4;

  // Assemble new PNG
  const head = PNGUint8Array.subarray(0, headerLen);
  const tail = PNGUint8Array.subarray(headerLen);
  return concatArrays([head, chunk, tail]);
}

/**
 * Adds in a tEXt chunk of a PNG file a metadata with the given key and value.
 * Warning: this function does not check whether the supplied key already exists.
 *
 * @param {string} dataURI - Data URL (staring with 'data:image/png;base64,')
 *                           containing a PNG file.
 * @param {string} key - Key (between 1 and 79 characters) used to identify the metadata.
 * @param {string} value - Value of the metadata to be set.
 * @returns {string} - Data URL with a base64 encoded PNG file with metadata.
*/
export function addMetadataFromBase64DataURI(dataURI, key, value) {
  const prefix = 'data:image/png;base64,';
  if (typeof dataURI !== 'string' || dataURI.substring(0, prefix.length) !== prefix) {
    throw new TypeError('Invalid PNG as Base64 Data URI');
  }
  const dataStr = atob(dataURI.substring(prefix.length));
  const PNGUint8Array = new Uint8Array(dataStr.length);
  for (let i = 0; i < dataStr.length; i += 1) {
    PNGUint8Array[i] = dataStr.charCodeAt(i);
  }
  const newPNGUint8Array = addMetadata(PNGUint8Array, key, value);
  return prefix + btoa(dataViewToString(getDataView(newPNGUint8Array)));
}

/**
 * Retrieves (if present) a metadata with the given key contained in a tEXt chunk
 * of a PNG file.
 *
 * @param {Uint8Array} PNGUint8Array - Array containing bytes of a PNG file.
 * @param {string} key - Key (between 1 and 79 characters) used to identify the metadata.
 * @returns {string|undefined} - A string containing the extracted value or undefined if it could
 *                               not be found.
*/
export function getMetadata(PNGUint8Array, key) {
  if (!isPNG(PNGUint8Array)) {
    throw new TypeError('Invalid PNG');
  }

  const view = getDataView(PNGUint8Array);
  let offset = 8;
  while (offset < view.byteLength) {
    const chunkLength = view.getUint32(offset);
    if (dataViewToString(view, offset + 4, 4 + key.length) === `tEXt${key}`) {
      return dataViewToString(view, offset + 4 + 4 + key.length + 1, chunkLength - key.length - 1);
    }
    offset += chunkLength + 12; // skip 4 bytes of chunkLength, 4 of chunkType, 4 of CRC
  }
  return undefined;
}

/**
 * Retrieves all tEXt chunks of a PNG file.
 *
 * @param {Uint8Array} PNGUint8Array - Array containing bytes of a PNG file.
 * @returns {array} - Array of strings of all tEXt chunks.
*/
export function getAllTextMetadata(PNGUint8Array) {
  if (!isPNG(PNGUint8Array)) {
    throw new TypeError('Invalid PNG');
  }

  const view = getDataView(PNGUint8Array);
  let offset = 8;
  let data = [];
  while (offset < view.byteLength) {
    // Get the next chunk to process
    const chunkLength = view.getUint32(offset);
    const dataView = dataViewToString(view, offset + 4, 4 + chunkLength);

    // Just get the tEXt chunks
    if(dataView.substring(0, 4) === 'tEXt') {
      // Cut off the 'tEXt' section
      data.push(dataView.substring(4));
    }

    // skip 4 bytes of chunkLength, 4 of chunkType, 4 of CRC
    offset += chunkLength + 12; 
  }
  return data;
}

/**
 * Retrieves all metadata chunks of a PNG file.
 *
 * @param {Uint8Array} PNGUint8Array - Array containing bytes of a PNG file.
 * @returns {array} - Array of strings of all tEXt chunks.
*/
export function getAllMetadata(PNGUint8Array) {
  if (!isPNG(PNGUint8Array)) {
    throw new TypeError('Invalid PNG');
  }

  const view = getDataView(PNGUint8Array);
  let offset = 8;
  let data = [];
  while (offset < view.byteLength) {
    // Get the next chunk to process
    const chunkLength = view.getUint32(offset);
    const dataView = dataViewToString(view, offset + 4, 4 + chunkLength);
    data.push(dataView);

    // skip 4 bytes of chunkLength, 4 of chunkType, 4 of CRC
    offset += chunkLength + 12; 
  }
  return data;
}

// TODO FIXME!!
export function removeAllTextMetadata(PNGUint8Array) {
  if (!isPNG(PNGUint8Array)) {
    throw new TypeError('Invalid PNG');
  }
  
  // Get necessary data from original PNG to process
  const view = getDataView(PNGUint8Array);
  let offset = 8;

  // Get view and array of all text metadata
  const textMetadata = getAllTextMetadata(PNGUint8Array);

  // Calculate the number of bytes to remove
  let totalBytesToRemove = 0;
  for(let i = 0; i < textMetadata.length; i++) {
    // There 12 additional bytes with 'tEXt' (4), chunk length (4), and CRC (4)
    totalBytesToRemove += textMetadata[i].length + 12;
  }

  // Create a new buffer of the expected size
  let newPNGUint8Array = Buffer.alloc(PNGUint8Array.length - totalBytesToRemove);

  // Copy over the bytes that are not part of the text metadata
  for(let i = 0, j = 0; i < PNGUint8Array.length;) {
    // If it's part of the first 8 bytes, it's the PNG header and we need it
    if(i < 8) {
      newPNGUint8Array[j++] = PNGUint8Array[i++];
    } else {
      // Get the chunk and check if it is a text chunk
      // If it is a text chunk, skip it, otherwise copy it over

      // Get the next chunk to process
      const chunkLength = view.getUint32(i);
      const dataView = dataViewToString(view, i + 4, 4 + chunkLength);

      // If dataView contains a text chunk, skip it
      if(dataView.substring(0, 4) === 'tEXt') {
        // Chunk format
        // (4) Length
        // (4) Type
        // (n) Data
        // (4) CRC
        // skip 4 bytes of chunkLength, 4 of chunkType, 4 of CRC
        i += chunkLength + 12; 
      } else {
        // Copy over the chunk
        for(let k = 0; k < chunkLength + 12; k++) {
          newPNGUint8Array[j++] = PNGUint8Array[i++];
        }
      }
    }
  }

  return newPNGUint8Array;
}

// TODO FIXME!!
export function removeTextMetadata(PNGUint8Array, key) {
  if (!isPNG(PNGUint8Array)) {
    throw new TypeError('Invalid PNG');
  }

  const view = getDataView(PNGUint8Array);
  // view.replace('tEXt' + key, '');

  return Buffer.from(view.buffer);
}

function getKey(chunk) {
  return chunk.split('\0')[0];
}