import * as fs from 'fs';

export const isBinaryPlist = (fileName: string, languageId: string): boolean => {
  if (!['plist', 'code-text-binary'].includes(languageId)) {
    return false;
  }

  const BUFFER_LENGTH = 8;
  const fd = fs.openSync(fileName, 'r');
  const buffer = Buffer.alloc(BUFFER_LENGTH);
  fs.readSync(fd, buffer, 0, BUFFER_LENGTH, 0);
  return buffer.toString() === 'bplist00';
};
