import * as vscode from 'vscode';
import { spawnSync, spawn }  from 'child_process';
import * as commandExists from 'command-exists';
import * as plist from "plist";
import * as bplistCreator from 'bplist-creator';
import * as bplistParser from 'bplist-parser';
import { writeFileSync } from 'fs';
import { CreateOptions } from 'xmlbuilder';

async function spawnAsync(command: string, args: string[], input?: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn(command, args);
    let stdout = '';
    let stderr = '';
    
    proc.stdout.on('data', (data) => { stdout += data; });
    proc.stderr.on('data', (data) => { stderr += data; });
    proc.on('close', (code) => code === 0 ? resolve(stdout) : reject(new Error(stderr || `Exit code ${code}`)));
    proc.on('error', reject);
    
    if (input) {
      proc.stdin.end(input);
    }
  });
}

interface Parser {
  toXml: (uri: string) => Promise<string>;
  toBinary: (uri: string, xmlString: string) => Promise<void>;
}

class PlutilParser implements Parser {
  async toXml(uri: string): Promise<string> {
    return await spawnAsync('plutil', ['-convert', 'xml1', uri, '-o', '-']);
  }

  async toBinary(uri: string, xmlString: string): Promise<void> {
    await spawnAsync('plutil', ['-convert', 'binary1', '-o', uri, '-'], xmlString);
  }
}

class PythonParser implements Parser {
  async toXml(uri: string): Promise<string> {
    const python = `
import sys, codecs, plistlib

sys.stdout = codecs.getwriter('utf8')(sys.stdout.buffer)

fp = open("""${uri.replace(/\\/g,'\\\\')}""", 'rb')
pl = plistlib.load(fp)
print(plistlib.dumps(pl).decode('utf-8'))
`;
    return await spawnAsync('python', ['-c', python]);
  }

  async toBinary(uri: string, xmlString: string): Promise<void> {
    const python = `
import sys, os, codecs, tempfile, shutil, plistlib

sys.stdin = codecs.getreader('utf8')(sys.stdin.buffer)

fp = tempfile.NamedTemporaryFile(mode='wb', delete=False)
pl = plistlib.loads(sys.stdin.read().encode('utf-8'), fmt=plistlib.FMT_XML)
plistlib.dump(pl, fp, fmt=plistlib.FMT_BINARY)
path = fp.name
fp.close()
shutil.copy(path, """${uri.replace(/\\/g,'\\\\')}""")
os.remove(path)
`;
    await spawnAsync('python', ['-c', python], xmlString);
  }
}

class NodeParser implements Parser {
  async toXml(uri: string): Promise<string> {
    const content = bplistParser.parseFileSync(uri)[0];
    // @ts-ignore
    const plistContent = plist.build(content, {}, { invalidCharReplacement: '�' } as CreateOptions);
    if (plistContent.indexOf('�') !== -1) {
      vscode.window.showWarningMessage(
        'The “�” symbol appears in this editor, possibly due to control characters in the original file. If you save it now, those symbols will be saved too.'
      );
    }
    return plistContent;
  }

  async toBinary(uri: string, xmlString: string): Promise<void> {
    const result = await vscode.window.showQuickPick(['Continue', 'Cancel'], {
      placeHolder: 'Values of type real that are whole numbers will be saved as type integer. Continue?'
    });
    if (result !== 'Continue') {
      throw Error('Save cancelled.');
    }
    
    try {
      const object = plist.parse(xmlString) as plist.PlistObject | plist.PlistArray;
      const buffer = bplistCreator(object);
      writeFileSync(uri, buffer as Uint8Array);
    } catch(message) {
      throw Error(`An error occurred saving the file: ${message}`);
    }
  }
}

export class PlistFileFormat {
  engine: Parser;
  constructor(parser: string = '') {
    if (parser === 'PLUTIL' || (!parser && this._hasPlutil())) {
      this.engine = new PlutilParser();
    } else if (parser === 'PYTHON' || (!parser && this._hasPlistlib())) {
      this.engine = new PythonParser();
    } else {
      this.engine = new NodeParser();
    }
  }

  _hasPlutil(): boolean {
    return commandExists.sync('plutil');
  }

  _hasPlistlib(): boolean {
    if (commandExists.sync('python')) {
      const output = spawnSync('python', ['-c', 'import plistlib; plistlib.load']);
      if (output.stderr.length === 0) {
        return true;
      }
    }

    return false;
  }

  async binaryToXml(uri: string): Promise<string> {
    return this.engine.toXml(uri);
  }

  async xmlToBinary(uri: string, xmlString: string): Promise<void> {
    return this.engine.toBinary(uri, xmlString);
  }
}
