type ArrayBufferLike = { slice(begin: number, end?: number): unknown };

type NodeBufferLike = {
  subarray(begin: number, end?: number): NodeBufferLike;
  readUInt32BE(offset: number): number;
  toString(encoding: 'hex' | 'utf8'): string;
  readonly length: number;
  [index: number]: number;
};

export type NodeBufferOrArrayBuffer = ArrayBufferLike | NodeBufferLike;

export type StandardisedBuffer = {
  read(
    begin: number,
    end?: number,
    opts?: {
      encoding?: 'utf8' | 'hex';
    },
  ): string;
  readUInt32BE(offset: number): number;
  at(index: number): number;
  length: number;
};
