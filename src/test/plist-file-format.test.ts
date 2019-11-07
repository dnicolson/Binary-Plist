import * as assert from 'assert';
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as tmp from 'tmp';

import { PlistFileFormat } from '../plist-file-format';

suite("Plist File Format", () => {

    test('node read and write', async () => {
        const plistFileFormat = new PlistFileFormat('NODE');
        const filePath = path.resolve(__dirname, '../../src/test/fixtures/binary.plist');
        const xmlString = plistFileFormat.binaryToXml(filePath);

        vscode.window.showQuickPick = (items: string[] | Thenable<string[]>) => {
          return Promise.resolve('Continue') as Thenable<any>;
        };

        const tmpobj = tmp.fileSync();
        await plistFileFormat.xmlToBinary(tmpobj.name, xmlString);
        const fileStat = fs.statSync(tmpobj.name);
        assert.equal(fileStat.size, 42);
    });

    test('python read and write', async () => {
        const plistFileFormat = new PlistFileFormat('PYTHON');
        const filePath = path.resolve(__dirname, '../../src/test/fixtures/binary.plist');
        const xmlString = plistFileFormat.binaryToXml(filePath);

        const tmpobj = tmp.fileSync();
        await plistFileFormat.xmlToBinary(tmpobj.name, xmlString);
        const fileStat = fs.statSync(tmpobj.name);
        assert.equal(fileStat.size, 42);
    });

    test('plutil read and write', async () => {
        const plistFileFormat = new PlistFileFormat('PLUTIL');
        const filePath = path.resolve(__dirname, '../../src/test/fixtures/binary.plist');
        const xmlString = plistFileFormat.binaryToXml(filePath);

        const tmpobj = tmp.fileSync();
        await plistFileFormat.xmlToBinary(tmpobj.name, xmlString);
        const fileStat = fs.statSync(tmpobj.name);
        assert.equal(fileStat.size, 42);
    });
});
