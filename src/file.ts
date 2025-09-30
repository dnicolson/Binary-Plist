import * as fs from 'fs';

export const isBinaryPlist = (fileName: string, languageId: string): boolean => {
  const BUFFER_LENGTH = 8;
  const fd = fs.openSync(fileName, 'r');
  const buffer = Buffer.alloc(BUFFER_LENGTH);
  fs.readSync(fd, buffer as Uint8Array, 0, BUFFER_LENGTH, 0);
  return buffer.toString() === 'bplist00';
};
