import * as vscode from 'vscode';

import { PlistFileSystemProvider } from './plist-file-system';
import { isBinaryPlist } from "./file";

export function activate(context: vscode.ExtensionContext) {
  let lastClosedPlistDocument: vscode.TextDocument | null;

  vscode.workspace.registerFileSystemProvider('plist', new PlistFileSystemProvider(), {
    isCaseSensitive: process.platform === 'linux'
  });

  vscode.workspace.onDidCloseTextDocument(document => {
    if (document.uri.scheme === 'plist') {
      lastClosedPlistDocument = document;
    }
  });

  vscode.workspace.onDidOpenTextDocument(async document => {
    if (lastClosedPlistDocument && lastClosedPlistDocument.fileName === document.fileName) {
      lastClosedPlistDocument = null;
      return;
    }

    const isPlistXmlOpen = vscode.workspace.textDocuments.filter(openDoc => openDoc.fileName === document.fileName && openDoc.uri.scheme === 'plist').length > 0;
    if (isPlistXmlOpen && document.uri.scheme === 'file') {
      return;
    }

    if (document.uri.scheme === 'file' && document.languageId === 'plist' && isBinaryPlist(document.fileName)) {
      vscode.window.showInformationMessage('Changes to this file will be saved as binary.');
      const uri = vscode.Uri.file(document.fileName).with({scheme: 'plist'});
      try {
        const doc = await vscode.workspace.openTextDocument(uri);
        await vscode.window.showTextDocument(doc, { preview: false });
        vscode.languages.setTextDocumentLanguage(doc, 'xml');
      } catch (error) {
        console.error(error);
      }
    }
  });
}

export function deactivate() {}
