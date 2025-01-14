/**
 * @typedef {{ slice(begin: number, end?: number): unknown }} ArrayBufferLike
 * @typedef {{
 *  subarray(begin: number, end?: number): NodeBufferLike;
 *  readUInt32BE(offset: number): number;
 *  toString(encoding: 'hex' | 'utf8'): string;
 *  [index: number]: number;
 *  readonly length: number;
 * }} NodeBufferLike
 * @typedef {ArrayBufferLike | NodeBufferLike} NodeBufferOrArrayBuffer
 * @typedef {{
 *   read(
 *     begin: number,
 *     end?: number,
 *     opts?: {
 *       encoding?: 'utf8' | 'hex';
 *     },
 *   ): string;
 *   readUInt32BE(offset: number): number;
 *   at(index: number): number;
 *   length: number;
 * }} StandardisedBuffer
 */
