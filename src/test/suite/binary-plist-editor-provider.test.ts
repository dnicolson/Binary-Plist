import * as assert from 'assert';
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { BinaryPlistEditorProvider } from '../../binary-plist-editor-provider';

suite('BinaryPlistEditorProvider', () => {
  const fixturesDir = path.resolve(__dirname, '../../../src/test/fixtures');
  const binaryPlistPath = path.join(fixturesDir, 'binary.plist');

  test('registers the custom editor provider', async () => {
		const context = { subscriptions: [], workspaceState: typeof vscode.workspace.getWorkspaceFolder === 'function' ? vscode.workspace : { get: () => ({}), update: () => {} } } as any;
    const disposable = BinaryPlistEditorProvider.register(context);
    assert.ok(disposable, 'Provider registration should return a disposable');
    disposable.dispose();
  });

  test('opens a binary plist and creates a temp XML file', async () => {
		const context = { subscriptions: [], workspaceState: typeof vscode.workspace.getWorkspaceFolder === 'function' ? vscode.workspace : { get: () => ({}), update: () => {} } } as any;
    const provider = new BinaryPlistEditorProvider(context);
    const doc = await provider.openCustomDocument(vscode.Uri.file(binaryPlistPath));
    assert.ok(doc.tempFileUri, 'Should create a tempFileUri for binary plist');
    assert.ok(fs.existsSync(doc.tempFileUri.fsPath), 'Temp XML file should exist');
    const xmlContent = fs.readFileSync(doc.tempFileUri.fsPath, 'utf8');
    assert.ok(xmlContent.includes('<?xml'), 'Temp file should contain XML');
    doc.dispose();
  });
});
