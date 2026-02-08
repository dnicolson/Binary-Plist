import * as vscode from 'vscode';
import * as fs from 'fs';
import * as crypto from 'crypto';
import * as os from 'os';
import * as path from 'path';
import { isBinaryPlist } from './file';
import { PlistFileFormat } from './plist-file-format';

interface BinaryPlistCustomDocument extends vscode.CustomDocument {
  uri: vscode.Uri;
  tempFileUri?: vscode.Uri;
  dispose(): void;
}

export class BinaryPlistEditorProvider implements vscode.CustomReadonlyEditorProvider<BinaryPlistCustomDocument> {
  private plistFileFormat: PlistFileFormat;
  private context: vscode.ExtensionContext;

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
    const config = vscode.workspace.getConfiguration('binaryPlist');
    const engine = config.get<string>('engine');
    this.plistFileFormat = new PlistFileFormat(engine);

    context.subscriptions.push(
      vscode.workspace.onDidChangeConfiguration((event) => {
        if (event.affectsConfiguration('binaryPlist.engine')) {
          const config = vscode.workspace.getConfiguration('binaryPlist');
          const engine = config.get<string>('engine');
          this.plistFileFormat = new PlistFileFormat(engine);
          console.log('Binary plist engine updated to:', engine);
        }
      })
    );
  }

  static register(context: vscode.ExtensionContext): vscode.Disposable {
    const provider = new BinaryPlistEditorProvider(context);
    const registration = vscode.window.registerCustomEditorProvider('binaryPlistEditor.edit', provider);
    context.subscriptions.push(registration);
    return registration;
  }

  async openCustomDocument(uri: vscode.Uri): Promise<BinaryPlistCustomDocument> {
    if (isBinaryPlist(uri.fsPath, 'plist')) {
      const xmlContent = await this.plistFileFormat.binaryToXml(uri.fsPath);
      const base = path.basename(uri.fsPath, path.extname(uri.fsPath));
      const ext = path.extname(uri.fsPath);
      const hash = crypto.createHash('md5').update(uri.fsPath).digest('hex').slice(0, 6);
      const tempName = `${base}.${hash}${ext}`;
      const tempPath = path.join(os.tmpdir(), tempName);
      fs.writeFileSync(tempPath, xmlContent, 'utf8');
      return {uri, tempFileUri: vscode.Uri.file(tempPath), dispose() {}};
    }

    return { uri, dispose() {} };
  }

  async resolveCustomEditor(document: BinaryPlistCustomDocument): Promise<void> {
    if (document.tempFileUri) {
      const openListener = vscode.workspace.onDidOpenTextDocument((openedDoc) => {
        if (openedDoc.uri.fsPath === document.tempFileUri?.fsPath) {
          vscode.window.showInformationMessage('Opened binary plist as XML. Edit and save to update the original binary file.');
          this.context.workspaceState.update('openPlistUris', {});
          let openPlistUris = this.context.workspaceState.get<{ [key: string]: string }>('openPlistUris', {});
          if (!openPlistUris[document.uri.fsPath]) {
            openPlistUris[document.uri.fsPath] = document.tempFileUri.fsPath;
            this.context.workspaceState.update('openPlistUris', openPlistUris);
          }
          openListener.dispose();
        }
      });

      const saveListener = vscode.workspace.onDidSaveTextDocument(async (savedDoc) => {
        if (savedDoc.uri.fsPath === document.tempFileUri?.fsPath) {
          try {
            await this.plistFileFormat.xmlToBinary(document.uri.fsPath, savedDoc.getText());
            vscode.window.showInformationMessage('Binary plist file updated successfully.');
          } catch (error) {
            vscode.window.showErrorMessage(`Failed to save binary plist: ${error}`);
          }
        }
      });

      const closeListener = vscode.workspace.onDidCloseTextDocument((closedDoc) => {
        if (closedDoc.uri.fsPath === document.tempFileUri?.fsPath) {
          let openPlistUris = this.context.workspaceState.get<{ [key: string]: string }>('openPlistUris', {});
          if (openPlistUris[document.uri.fsPath]) {
            delete openPlistUris[document.uri.fsPath];
            this.context.workspaceState.update('openPlistUris', openPlistUris);
          }
          saveListener.dispose();
          closeListener.dispose();
        }
      });

      await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
      await vscode.commands.executeCommand('vscode.openWith', document.tempFileUri, 'default');
    } else {
      await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
      await vscode.commands.executeCommand('vscode.openWith', document.uri, 'default');
    }
  }
}
