import * as assert from 'assert';
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

import { PlistFileSystemProvider } from '../plist-file-system';

suite("Plist File System", () => {

    test('binary file read', () => {
        const plistFileSystem = new PlistFileSystemProvider;
        const filePath = path.resolve(__dirname, '../../src/test/fixtures/binary.plist');
        const stringArray = plistFileSystem.readFile(vscode.Uri.file(filePath));
        assert.equal(stringArray.length, 182);
    });

    test('binary file write', () => {
        const plistFileSystem = new PlistFileSystemProvider;
        const filePath = path.resolve(__dirname, '../../src/test/fixtures/binary.plist');
        const stringArray = plistFileSystem.readFile(vscode.Uri.file(filePath));
        plistFileSystem.writeFile(vscode.Uri.file('/tmp/vscode-binary.plist'), stringArray, {create: true, overwrite: true});
        const fileStat = fs.statSync('/tmp/vscode-binary.plist');
        assert.equal(fileStat.size, 42);
    });
});
