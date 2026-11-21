/**
 * Wrap bytes in a Blob without copying them.
 *
 * TypeScript 6 types `Uint8Array` as `Uint8Array<ArrayBufferLike>`, which `BlobPart` no longer
 * accepts; the cast is type-level only, so a multi-megabyte image is not duplicated in memory.
 */
export function bytesToBlob(bytes: Uint8Array, type: string): Blob {
  return new Blob([bytes as unknown as BlobPart], { type });
}
