/** @typedef {import('../types.mjs').StandardisedBuffer} StandardisedBuffer */

/**
 * Returns brands declared in the `ftyp` box (major brand + compatible brands)
 * @param {StandardisedBuffer} buffer
 */
function getBrands(buffer) {
  const boxSize = buffer.readUInt32BE(0);
  const brands = [buffer.read(8, 12)]; // major_brand (minor_version at 12-16 is skipped)

  for (
    let offset = 16;
    offset + 4 <= boxSize && offset + 4 <= buffer.length;
    offset += 4
  ) {
    brands.push(buffer.read(offset, offset + 4));
  }

  return brands;
}

/**
 * Checks if buffer contains AVIF image
 * @param {StandardisedBuffer} buffer
 */
export const isAvif = (buffer) => {
  if (buffer.read(4, 8) !== 'ftyp') return false;

  const brands = getBrands(buffer);
  return brands.includes('avif') || brands.includes('avis');
};

/**
 * Checks if buffer contains animated AVIF image (AV1 Image Sequence)
 * @param {StandardisedBuffer} buffer
 */
export const isAnimated = (buffer) => getBrands(buffer).includes('avis');
