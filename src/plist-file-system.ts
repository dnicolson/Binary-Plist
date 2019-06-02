import * as vscode from 'vscode';
const util = require('util');
const plist = require('simple-plist');

export class PlistFileSystemProvider implements vscode.FileSystemProvider {
	readFile(uri: vscode.Uri): Uint8Array {
		const xmlString = plist.stringify(plist.readFileSync(uri.fsPath));
		const stringArray = new util.TextEncoder('utf-8').encode(xmlString);
		return stringArray;
	}

	writeFile(uri: vscode.Uri, content: Uint8Array, options: { create: boolean; overwrite: boolean; }): void {
		const xmlString = new util.TextDecoder('utf-8').decode(content);
		const object = plist.parse(xmlString);
		plist.writeBinaryFileSync(uri.fsPath, object, (err: Error) => { if (err) { throw err; } });
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
