import * as vscode from 'vscode';
import { BinaryPlistEditorProvider } from './binary-plist-editor-provider';

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(BinaryPlistEditorProvider.register(context));

  const openPlistUris = context.workspaceState.get<{ [key: string]: boolean }>('openPlistUris');
  if (openPlistUris && typeof openPlistUris === 'object') {
    for (const fsPath of Object.keys(openPlistUris)) {
      try {
        vscode.commands.executeCommand('vscode.openWith', vscode.Uri.file(fsPath), 'binaryPlistEditor.edit');
      } catch (error) {
        console.error('Failed to reopen plist URI with custom editor:', fsPath, error);
      }
    }
  }
}

export function deactivate() {}
