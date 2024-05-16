import * as gif from './types/gif';
import * as webp from './types/webp';
import * as png from './types/png';

/**
 * Checks if buffer contains animated image
 */
export default function isAnimated(buffer: Buffer) {
  if (gif.isGIF(buffer)) return gif.isAnimated(buffer);
  if (png.isPNG(buffer)) return png.isAnimated(buffer);
  if (webp.isWebp(buffer)) return webp.isAnimated(buffer);

  return false;
}
