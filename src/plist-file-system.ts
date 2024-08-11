import * as vscode from 'vscode';
import * as util from 'util';

import { PlistFileFormat } from './plist-file-format';

const fixUncPath = (uri: vscode.Uri): string => {
  if (uri.fsPath.startsWith('\\') && !uri.fsPath.startsWith(`\\${uri.authority}`)) {
    return `//${uri.authority}${uri.path}`;
  }
  return uri.fsPath;
};

export class PlistFileSystemProvider implements vscode.FileSystemProvider {
  readFile(uri: vscode.Uri): Uint8Array {
    const plistFileFormat = new PlistFileFormat;
    const xmlString = plistFileFormat.binaryToXml(fixUncPath(uri));
    const stringArray = new util.TextEncoder().encode(xmlString);
    return stringArray;
  }

  async writeFile(uri: vscode.Uri, content: Uint8Array, options: { create: boolean; overwrite: boolean; }): Promise<void> {
    try {
      const xmlString = new util.TextDecoder().decode(content);
      const plistFileFormat = new PlistFileFormat;
      await plistFileFormat.xmlToBinary(fixUncPath(uri), xmlString);
      vscode.window.showInformationMessage('Plist file successfully saved.');
    } catch(error) {
      vscode.window.showErrorMessage(`An error occurred saving the file: ${error}`);
    }
  }

  stat(uri: vscode.Uri): vscode.FileStat | Thenable<vscode.FileStat> {
    return ({ type: vscode.FileType.File }) as vscode.FileStat;
  }

  onDidChangeFile: vscode.Event<vscode.FileChangeEvent[]> = new vscode.EventEmitter<vscode.FileChangeEvent[]>().event;
  createDirectory(uri: vscode.Uri) { }
  delete(uri: vscode.Uri, options: { recursive: boolean; }) { }
  readDirectory(uri: vscode.Uri) { return []; }
  rename(oldUri: vscode.Uri, newUri: vscode.Uri, options: { overwrite: boolean; }) { }
  watch(uri: vscode.Uri, options: { recursive: boolean; excludes: string[]; }) { return new vscode.Disposable(() => { }); }
}
