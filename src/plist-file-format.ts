import * as vscode from 'vscode';
import { spawnSync, spawn }  from 'child_process';
import * as commandExists from 'command-exists';
import * as plist from "plist";
import * as bplistCreator from 'bplist-creator';
import * as bplistParser from 'bplist-parser';
import { readFile, writeFile } from 'fs/promises';
import { CreateOptions } from 'xmlbuilder';
import { binaryToXml as libplistBinaryToXml, xmlToBinary as libplistXmlToBinary } from 'libplist';

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
  constructor() {
    if (!commandExists.sync('plutil')) {
      throw new Error('plutil command not found');
    }
  }

  async toXml(uri: string): Promise<string> {
    return await spawnAsync('plutil', ['-convert', 'xml1', uri, '-o', '-']);
  }

  async toBinary(uri: string, xmlString: string): Promise<void> {
    await spawnAsync('plutil', ['-convert', 'binary1', '-o', uri, '-'], xmlString);
  }
}

class PythonParser implements Parser {
  constructor() {
    if (!commandExists.sync('python')) {
      throw new Error('python command not found');
    }

    const output = spawnSync('python', ['-c', 'import plistlib; plistlib.load']);
    if (output.error || (output.stderr && output.stderr.length > 0) || output.status !== 0) {
      throw new Error('python plistlib not available');
    }
  }

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
      await writeFile(uri, buffer);
    } catch(message) {
      throw Error(`An error occurred saving the file: ${message}`);
    }
  }
}

class LibplistParser implements Parser {
  async toXml(uri: string): Promise<string> {
    const data = await readFile(uri);
    return await libplistBinaryToXml(data);
  }

  async toBinary(uri: string, xmlString: string): Promise<void> {
    const data = await libplistXmlToBinary(xmlString);
    await writeFile(uri, data);
  }
}
  
export class PlistFileFormat {
  engine: Parser;
  constructor(parser: string | undefined) {    
    try {
      if (parser === 'plutil') {
        this.engine = new PlutilParser();
        return;
      } else if (parser === 'python') {
        this.engine = new PythonParser();
        return;
      } else if (parser === 'node') {
        this.engine = new NodeParser();
        return;
      }
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to initialize plist engine: ${error}`);
    }
    this.engine = new LibplistParser();
  }

  async binaryToXml(uri: string): Promise<string> {
    return this.engine.toXml(uri);
  }

  async xmlToBinary(uri: string, xmlString: string): Promise<void> {
    return this.engine.toBinary(uri, xmlString);
  }
}
