import * as vscode from 'vscode';
import { BinaryPlistEditorProvider } from './binary-plist-editor-provider';
import { isBinaryPlist } from './file';

type OpenPlistUris = { [key: string]: string };

interface ParserQuickPickItem extends vscode.QuickPickItem {
  value: string;
}

const PARSER_OPTIONS: ParserQuickPickItem[] = [
  {
    label: 'libplist',
    description: 'Default',
    detail: 'Use libplist'
  },
  {
    label: 'plutil',
    detail: 'Use plutil command (macOS only)'
  },
  {
    label: 'python',
    detail: 'Use Python plistlib module'
  },
  {
    label: 'node',
    detail: 'Use Node.js bplist-parser and bplist-creator libraries'
  }
].map(option => ({ ...option, value: option.label }));

export function activate(context: vscode.ExtensionContext) {
  context.subscriptions.push(BinaryPlistEditorProvider.register(context));
  context.subscriptions.push(vscode.commands.registerCommand('binaryPlist.setParser', () => setParser(context)));

  const openPlistUris = context.workspaceState.get<OpenPlistUris>('openPlistUris');
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

async function setParser(context: vscode.ExtensionContext): Promise<void> {
  const resource = vscode.window.activeTextEditor?.document.uri;
  const currentPlistUri = getCurrentPlistUri(context, resource);
  const config = vscode.workspace.getConfiguration('binaryPlist', resource);
  const currentParser = config.get<string>('engine', 'libplist');
  const selected = await vscode.window.showQuickPick(
    PARSER_OPTIONS.map(option => ({
      ...option,
      picked: option.value === currentParser
    })),
    {
      placeHolder: 'Select binary plist parser'
    }
  );

  if (!selected) {
    return;
  }

  if (selected.value === currentParser) {
    vscode.window.showInformationMessage(`Binary Plist parser already set to ${selected.value}.`);
    return;
  }

  if (hasUnsavedPlistChanges(context, currentPlistUri)) {
    vscode.window.showWarningMessage('Save or discard XML changes before switching parsers.');
    return;
  }

  await config.update('engine', selected.value, getConfigurationTarget(config.inspect('engine')));
  await reloadCurrentPlist(currentPlistUri);
  vscode.window.showInformationMessage(`Binary Plist parser set to ${selected.value}.`);
}

function getConfigurationTarget(inspection: { workspaceFolderValue?: unknown; workspaceValue?: unknown } | undefined): vscode.ConfigurationTarget {
  if (inspection?.workspaceFolderValue !== undefined) {
    return vscode.ConfigurationTarget.WorkspaceFolder;
  }

  if (inspection?.workspaceValue !== undefined) {
    return vscode.ConfigurationTarget.Workspace;
  }

  return vscode.ConfigurationTarget.Global;
}

function getCurrentPlistUri(context: vscode.ExtensionContext, activeUri: vscode.Uri | undefined): vscode.Uri | undefined {
  if (!activeUri || activeUri.scheme !== 'file') {
    return undefined;
  }

  const openPlistUris = getOpenPlistUris(context);
  for (const [plistPath, tempPath] of Object.entries(openPlistUris)) {
    if (activeUri.fsPath === plistPath || activeUri.fsPath === tempPath) {
      return vscode.Uri.file(plistPath);
    }
  }

  try {
    if (activeUri.fsPath.endsWith('.plist') && isBinaryPlist(activeUri.fsPath, 'plist')) {
      return activeUri;
    }
  } catch {
    return undefined;
  }

  return undefined;
}

function getOpenPlistUris(context: vscode.ExtensionContext): OpenPlistUris {
  const openPlistUris = context.workspaceState.get<OpenPlistUris>('openPlistUris', {});
  return openPlistUris && typeof openPlistUris === 'object' ? openPlistUris : {};
}

function hasUnsavedPlistChanges(context: vscode.ExtensionContext, plistUri: vscode.Uri | undefined): boolean {
  if (!plistUri) {
    return false;
  }

  const activeDocument = vscode.window.activeTextEditor?.document;
  if (!activeDocument?.isDirty) {
    return false;
  }

  const tempPath = getOpenPlistUris(context)[plistUri.fsPath];
  return activeDocument.uri.fsPath === plistUri.fsPath || activeDocument.uri.fsPath === tempPath;
}

async function reloadCurrentPlist(plistUri: vscode.Uri | undefined): Promise<void> {
  if (!plistUri) {
    return;
  }

  await vscode.commands.executeCommand('workbench.action.closeActiveEditor');
  await vscode.commands.executeCommand('vscode.openWith', plistUri, 'binaryPlistEditor.edit');
}
