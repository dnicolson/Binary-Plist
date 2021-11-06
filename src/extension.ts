import * as vscode from 'vscode';

import { PlistFileSystemProvider } from './plist-file-system';
import { isBinaryPlist } from "./file";

export function activate(context: vscode.ExtensionContext) {
  let lastClosedPlistDocument: vscode.TextDocument | null;

  const document = vscode.workspace.textDocuments[0];

  if (document && document.uri && document.uri.scheme === 'file' && isBinaryPlist(document.fileName, document.languageId)) {
    vscode.window.showInformationMessage('This is a binary plist file from a previous session, open it again to make changes.');
  }

  vscode.workspace.registerFileSystemProvider('plist', new PlistFileSystemProvider(), {
    isCaseSensitive: process.platform === 'linux'
  });

  vscode.workspace.onDidCloseTextDocument(document => {
    if (document.uri.scheme === 'plist') {
      lastClosedPlistDocument = document;
    }
  });

  vscode.workspace.onDidOpenTextDocument(async document => {
    if (document.uri.scheme === 'plist') {
      vscode.languages.setTextDocumentLanguage(document, 'xml');
    }

    if (lastClosedPlistDocument && lastClosedPlistDocument.fileName === document.fileName) {
      lastClosedPlistDocument = null;
      return;
    }

    const isPlistXmlOpen = vscode.workspace.textDocuments.filter(openDoc => openDoc.fileName === document.fileName && openDoc.uri.scheme === 'plist').length > 0;
    if (isPlistXmlOpen && document.uri.scheme === 'file') {
      return;
    }

    if (document.uri.scheme === 'file' && isBinaryPlist(document.fileName, document.languageId)) {
      vscode.window.showInformationMessage('Changes to this file will be saved as binary.');
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
