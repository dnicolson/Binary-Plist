import * as assert from 'assert';
import * as vscode from 'vscode';
import { spawnSync }  from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as tmp from 'tmp';

import { PlistFileFormat } from '../../plist-file-format';

suite('Plist file format', () => {

  test('node read and write', async () => {
    const plistFileFormat = new PlistFileFormat('NODE');
    const filePath = path.resolve(__dirname, '../../../src/test/fixtures/binary.plist');
    const xmlString = plistFileFormat.binaryToXml(filePath);

    vscode.window.showQuickPick = (_items: readonly string[] | Thenable<readonly string[]>) => {
      return Promise.resolve('Continue') as Thenable<any>;
    };

    const tmpobj = tmp.fileSync();
    await plistFileFormat.xmlToBinary(tmpobj.name, xmlString);
    const fileStat = fs.statSync(tmpobj.name);
    assert.strictEqual(fileStat.size, 68);
  });

  test('python read and write', async function() {
    const result = spawnSync('python', ['-c', 'import plistlib; plistlib.load']);
    if (result.error || (result.stderr && result.stderr.length)) {
      this.skip();
    }

    const plistFileFormat = new PlistFileFormat('PYTHON');
    const filePath = path.resolve(__dirname, '../../../src/test/fixtures/binary.plist');
    const xmlString = plistFileFormat.binaryToXml(filePath);

    const tmpobj = tmp.fileSync();
    await plistFileFormat.xmlToBinary(tmpobj.name, xmlString);
    const fileStat = fs.statSync(tmpobj.name);
    assert.strictEqual(fileStat.size, 68);
  }).timeout(20000);

  test('plutil read and write', async function() {
    if (process.platform !== 'darwin') {
      this.skip();
    }

    const plistFileFormat = new PlistFileFormat('PLUTIL');
    const filePath = path.resolve(__dirname, '../../../src/test/fixtures/binary.plist');
    const xmlString = plistFileFormat.binaryToXml(filePath);

    const tmpobj = tmp.fileSync();
    await plistFileFormat.xmlToBinary(tmpobj.name, xmlString);
    const fileStat = fs.statSync(tmpobj.name);
    assert.strictEqual(fileStat.size, 68);
  });
});
