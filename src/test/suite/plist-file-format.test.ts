import * as assert from 'assert';
import * as vscode from 'vscode';
import { spawnSync }  from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

import { PlistFileFormat } from '../../plist-file-format';

suite('Plist file format', () => {

  test('node read and write', async () => {
    const plistFileFormat = new PlistFileFormat('node');
    const filePath = path.resolve(__dirname, '../../../src/test/fixtures/binary.plist');
    const xmlString = await plistFileFormat.binaryToXml(filePath);

    vscode.window.showQuickPick = (_items: readonly string[] | Thenable<readonly string[]>) => {
      return Promise.resolve('Continue') as Thenable<any>;
    };

    const tmpFilePath = path.join(os.tmpdir(), `tmp-${Date.now()}`);
    fs.writeFileSync(tmpFilePath, '');
    await plistFileFormat.xmlToBinary(tmpFilePath, xmlString);
    const fileStat = fs.statSync(tmpFilePath);
    assert.strictEqual(fileStat.size, 68);
    fs.unlinkSync(tmpFilePath);
  });

  test('python read and write', async function() {
    const result = spawnSync('python', ['-c', 'import plistlib; plistlib.load']);
    if (result.error || (result.stderr && result.stderr.length)) {
      this.skip();
    }

    const plistFileFormat = new PlistFileFormat('python');
    const filePath = path.resolve(__dirname, '../../../src/test/fixtures/binary.plist');
    const xmlString = await plistFileFormat.binaryToXml(filePath);

    const tmpFilePath = path.join(os.tmpdir(), `tmp-${Date.now()}`);
    fs.writeFileSync(tmpFilePath, '');
    await plistFileFormat.xmlToBinary(tmpFilePath, xmlString);
    const fileStat = fs.statSync(tmpFilePath);
    assert.strictEqual(fileStat.size, 68);
    fs.unlinkSync(tmpFilePath);
  }).timeout(20000);

  test('plutil read and write', async function() {
    if (process.platform !== 'darwin') {
      this.skip();
    }

    const plistFileFormat = new PlistFileFormat('plutil');
    const filePath = path.resolve(__dirname, '../../../src/test/fixtures/binary.plist');
    const xmlString = await plistFileFormat.binaryToXml(filePath);

    const tmpFilePath = path.join(os.tmpdir(), `tmp-${Date.now()}`);
    fs.writeFileSync(tmpFilePath, '');
    await plistFileFormat.xmlToBinary(tmpFilePath, xmlString);
    const fileStat = fs.statSync(tmpFilePath);
    assert.strictEqual(fileStat.size, 68);
    fs.unlinkSync(tmpFilePath);
  });

  test('libplist read and write', async () => {
    const plistFileFormat = new PlistFileFormat('libplist');
    const filePath = path.resolve(__dirname, '../../../src/test/fixtures/binary.plist');
    const xmlString = await plistFileFormat.binaryToXml(filePath);

    const tmpFilePath = path.join(os.tmpdir(), `tmp-${Date.now()}`);
    fs.writeFileSync(tmpFilePath, '');
    await plistFileFormat.xmlToBinary(tmpFilePath, xmlString);
    const fileStat = fs.statSync(tmpFilePath);
    assert.strictEqual(fileStat.size, 68);
    fs.unlinkSync(tmpFilePath);
  });
});
