import * as vscode from 'vscode';

import { PlistFileSystemProvider } from './plist-file-system';
import { isBinaryPlist } from "./file";

export function activate(context: vscode.ExtensionContext) {
  let lastClosedPlistXmlPath: string | null;

  const document = vscode.workspace.textDocuments[0];

  if (document && document.uri && document.uri.scheme === 'file' && isBinaryPlist(document.fileName, document.languageId)) {
    vscode.window.showInformationMessage('This is a binary plist file from a previous session, open it again to make changes.');
  }

  vscode.workspace.registerFileSystemProvider('plist', new PlistFileSystemProvider(), {
    isCaseSensitive: process.platform === 'linux'
  });

  vscode.window.tabGroups.onDidChangeTabs(event => {
    event.closed.forEach(tab => {
      const tabInput = (tab.input as vscode.TextDocument);
      if (tabInput.uri.scheme === 'plist') {
        lastClosedPlistXmlPath = tabInput.uri.path;
      }
      if (tabInput.uri.scheme === 'file') {
        lastClosedPlistXmlPath = null;
      }
    });
  });

  vscode.workspace.onDidOpenTextDocument(async document => {
    if (document.uri.scheme === 'plist' || document.uri.path.endsWith('.plist') && !isBinaryPlist(document.fileName, document.languageId)) {
      vscode.languages.setTextDocumentLanguage(document, 'xml');
    }

    // after restart this prevents the XML tab from re-opening after closing
    if (lastClosedPlistXmlPath && lastClosedPlistXmlPath === document.fileName) {
      lastClosedPlistXmlPath = null;
      return;
    }

    // after restart this prevents the XML tab from being selected when selecting the binary tab
    const isPlistXmlOpen = vscode.window.tabGroups.activeTabGroup.tabs.filter(tab => (tab.input as vscode.TextDocument).uri.path === document.fileName && (tab.input as vscode.TextDocument).uri.scheme === 'plist').length === 1;
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
