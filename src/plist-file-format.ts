import * as vscode from 'vscode';
import { spawnSync }  from 'child_process';
const hasbin = require('hasbin');
const plist = require('simple-plist');

interface Parser {
  toXml: (uri: string) => string;
  toBinary: (uri: string, xmlString: string) => Promise<any>;
}

class PlutilParser implements Parser {
  toXml(uri: string): string {
    return spawnSync('plutil', ['-convert', 'xml1', uri, '-o', '-']).stdout.toString();
  }
  async toBinary(uri: string, xmlString: string): Promise<any> {
    const output = spawnSync('plutil', ['-convert', 'binary1', '-o', uri, '-'], { input: xmlString });
    if (String(output.stdout).length) {
      return Promise.reject(String(output.stdout));
    }
    if (String(output.stderr).length) {
      return Promise.reject(String(output.stderr));
    }
  }
}

class PythonParser implements Parser {
  toXml(uri: string): string {
    return spawnSync(hasbin.sync('python3') ? 'python3' : 'python', ['-c', `import plistlib;\nwith open("""${uri.replace(/\\/g,'\\\\')}""", 'rb') as fp: pl = plistlib.load(fp); print(plistlib.dumps(pl).decode('utf-8'))`]).stdout.toString();
  }
  async toBinary(uri: string, xmlString: string): Promise<any> {
    const python = `
import sys, os, tempfile, shutil, plistlib

fp = tempfile.NamedTemporaryFile(mode='wb', delete=False)
pl = plistlib.loads(sys.stdin.read().encode('utf-8'), fmt=plistlib.FMT_XML)
plistlib.dump(pl, fp, fmt=plistlib.FMT_BINARY)
path = fp.name
fp.close()
shutil.copy(path, """${uri.replace(/\\/g,'\\\\')}""")
os.remove(path)
`;
    const output = spawnSync(hasbin.sync('python3') ? 'python3' : 'python', ['-c', python], { input: xmlString });
    if (String(output.stderr).length) {
      return Promise.reject(String(output.stderr));
    }
  }
}

class NodeParser implements Parser {
  toXml(uri: string): string {
    return plist.stringify(plist.readFileSync(uri));
  }
  async toBinary(uri: string, xmlString: string): Promise<any> {
    const result = await vscode.window.showQuickPick(['Continue', 'Cancel'], {
      placeHolder: 'Values of type real that are whole numbers will be saved as type integer. Continue?'
    });
    if (result !== 'Continue') {
      return Promise.reject('Save cancelled.');
    }
    const originalConsoleError = console.error;
    const originalConsoleWarn = console.warn;
    console.error = message => { throw new Error(`An error occurred saving the file: ${message}`); };
    console.warn = message => { throw new Error(`An error occurred saving the file: ${message}`); };
    try {
      const object = plist.parse(xmlString);
      try {
        plist.writeBinaryFileSync(uri, object);
      } catch(message) {
        throw new Error(`An error occurred saving the file: ${message}`);
      }
    } catch(message) {
      throw new Error(`An error occurred parsing the XML: ${message}`);
    }
    console.error = originalConsoleError;
    console.warn = originalConsoleWarn;
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
    return hasbin.sync('plutil');
  }

  _hasPlistlib(): boolean {
    const output = hasbin.sync('python') && spawnSync('python', ['-c', 'import plistlib; plistlib.load']);
    return String(output.stderr).length === 0 || hasbin.sync('python3');
  }

  binaryToXml(uri: string): string {
    return this.engine.toXml(uri);
  }

  async xmlToBinary(uri: string, xmlString: string): Promise<any> {
    return this.engine.toBinary(uri, xmlString);
  }
}
