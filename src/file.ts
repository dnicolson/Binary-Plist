import * as fs from 'fs';

const SUPPORTED_EXTENSIONS = ['plist', 'strings'];

export const isBinaryPlist = (fileName: string): boolean => {
  const fileExt = fileName.split('.').pop()!;
  if (SUPPORTED_EXTENSIONS.includes(fileExt)) {
    const BUFFER_LENGTH = 8;
    const fd = fs.openSync(fileName, 'r');
    const buffer = Buffer.alloc(BUFFER_LENGTH);
    fs.readSync(fd, buffer, 0, BUFFER_LENGTH, 0);
    if (buffer.toString() === 'bplist00') {
      return true;
    }
  }
  return false;
};
