import * as assert from 'assert';
import * as path from 'path';

import { isBinaryPlist } from '../file';

suite('File', () => {

  test('empty file', () => {
    const filePath = path.resolve(__dirname, '../../src/test/fixtures/empty');
    assert.strictEqual(isBinaryPlist(filePath, 'plist'), false);
  });

  test('xml file', () => {
    const filePath = path.resolve(__dirname, '../../src/test/fixtures/xml.plist');
    assert.strictEqual(isBinaryPlist(filePath, 'plist'), false);
  });

  test('binary plist file', () => {
    const filePath = path.resolve(__dirname, '../../src/test/fixtures/binary.plist');
    assert.ok(isBinaryPlist(filePath, 'plist'));
  });

  test('binary plist file containing binary data', () => {
    const filePath = path.resolve(__dirname, '../../src/test/fixtures/binary-in-binary.plist');
    assert.ok(isBinaryPlist(filePath, 'code-text-binary'));
  });
});
