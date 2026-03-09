/**
 * @since 2019-02-27 10:20
 * @author vivaxy
 */

exports.isWebp = function (buffer) {
  var WEBP = [0x57, 0x45, 0x42, 0x50]
  for (var i = 0; i < WEBP.length; i++) {
    if (buffer[i + 8] !== WEBP[i]) {
      return false
    }
  }
  return true
}

exports.isAnimated = function (buffer) {
  // WebP uses RIFF container format with chunks:
  // 4 bytes chunk FourCC + 4 bytes chunk size + chunk data
  // Start after RIFF header (4) + file size (4) + WEBP (4) = 12
  var offset = 12

  while (offset + 8 <= buffer.length) {
    // Check if this chunk is ANIM (animation parameters)
    if (buffer[offset] === 0x41 && // A
        buffer[offset + 1] === 0x4E && // N
        buffer[offset + 2] === 0x49 && // I
        buffer[offset + 3] === 0x4D) { // M
      return true
    }

    // Read chunk size (little-endian uint32) and skip to next chunk
    var chunkSize = buffer.readUInt32LE(offset + 4)
    // RIFF chunks are padded to even size
    offset += 8 + chunkSize + (chunkSize % 2)
  }

  return false
}
