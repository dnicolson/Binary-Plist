import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';

import { isBinaryPlist } from '../file';

suite('File', () => {

  test('empty file', () => {
    const filePath = path.resolve(__dirname, '../../src/test/fixtures/empty');
    assert.equal(isBinaryPlist(filePath), false);
  });

  test('xml file', () => {
    const filePath = path.resolve(__dirname, '../../src/test/fixtures/xml.plist');
    assert.equal(isBinaryPlist(filePath), false);
  });

  test('binary plist file', () => {
    const filePath = path.resolve(__dirname, '../../src/test/fixtures/binary.plist');
    assert.ok(isBinaryPlist(filePath));
  });
});
