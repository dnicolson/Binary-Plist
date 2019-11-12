import * as vscode from 'vscode';

import { PlistFileSystemProvider } from './plist-file-system';
import { isBinaryPlist } from "./file";

export function activate(context: vscode.ExtensionContext) {
  vscode.workspace.registerFileSystemProvider('plist', new PlistFileSystemProvider(), {
    isCaseSensitive: process.platform === 'linux'
  });

  vscode.workspace.onDidOpenTextDocument(async document => {
    if (!document.isUntitled && isBinaryPlist(document.fileName)) {
      vscode.window.showInformationMessage('XML file changes will be saved as binary in the tab to the left.');
      const uri = vscode.Uri.file(document.fileName).with({scheme: 'plist'});
      try {
        const doc = await vscode.workspace.openTextDocument(uri);
        await vscode.window.showTextDocument(doc, { preview: false });
      } catch (error) {
        console.error(error);
      }
    }
  });
}

export function deactivate() {}
