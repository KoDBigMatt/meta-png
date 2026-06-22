/**
 * Adds in a tEXt chunk of a PNG file a metadata with the given key and value.
 * Warning: this function does not check whether the supplied key already exists.
 *
 * @param {Uint8Array} PNGUint8Array - Array containing bytes of a PNG file.
 * @param {string} key - Key (between 1 and 79 characters) used to identify the metadata.
 * @param {string} value - Value of the metadata to be set.
 * @returns {Uint8Array} - Array containing bytes of a PNG file with metadata.
*/
export function addMetadata(PNGUint8Array: Uint8Array, key: string, value: string): Uint8Array;
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
export function addMetadataFromBase64DataURI(dataURI: string, key: string, value: string): string;
/**
 * Retrieves (if present) a metadata with the given key contained in a tEXt chunk
 * of a PNG file.
 *
 * @param {Uint8Array} PNGUint8Array - Array containing bytes of a PNG file.
 * @param {string} key - Key (between 1 and 79 characters) used to identify the metadata.
 * @returns {string|undefined} - A string containing the extracted value or undefined if it could
 *                               not be found.
*/
export function getMetadata(PNGUint8Array: Uint8Array, key: string): string | undefined;
/**
 * Retrieves all tEXt chunks of a PNG file.
 *
 * @param {Uint8Array} PNGUint8Array - Array containing bytes of a PNG file.
 * @returns {array} - Array of strings of all tEXt chunks.
*/
export function getAllTextMetadata(PNGUint8Array: Uint8Array): any[];
/**
 * Retrieves all metadata chunks of a PNG file.
 *
 * @param {Uint8Array} PNGUint8Array - Array containing bytes of a PNG file.
 * @returns {array} - Array of strings of all tEXt chunks.
*/
export function getAllMetadata(PNGUint8Array: Uint8Array): any[];
export function removeAllTextMetadata(PNGUint8Array: any): Buffer;
export function removeTextMetadata(PNGUint8Array: any, key: any): Buffer;
//# sourceMappingURL=main.d.ts.map