export const isWebp = (buffer: Buffer) => {
  const WEBP = [0x57, 0x45, 0x42, 0x50];
  for (let i = 0; i < WEBP.length; ++i) {
    if (buffer[i + 8] !== WEBP[i]) return false;
  }
  return true;
};

export const isAnimated = (buffer: Buffer) => {
  const ANIM = [0x41, 0x4e, 0x49, 0x4d];
  for (let i = 0; i < buffer.length; ++i) {
    let j = 0;
    while (j < ANIM.length && buffer[i + j] === ANIM[j]) ++j;
    if (j === ANIM.length) return true;
  }
  return false;
};
