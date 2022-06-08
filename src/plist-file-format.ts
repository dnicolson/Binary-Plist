import * as vscode from 'vscode';
import { spawnSync }  from 'child_process';
import * as commandExists from 'command-exists';
import * as plist from 'simple-plist';

interface Parser {
  toXml: (uri: string) => string;
  toBinary: (uri: string, xmlString: string) => Promise<void>;
}

class PlutilParser implements Parser {
  toXml(uri: string): string {
    return String(spawnSync('plutil', ['-convert', 'xml1', uri, '-o', '-']).stdout);
  }
  async toBinary(uri: string, xmlString: string): Promise<void> {
    const output = spawnSync('plutil', ['-convert', 'binary1', '-o', uri, '-'], { input: xmlString });
    if (String(output.stdout).length) {
      throw Error(String(output.stdout));
    }
    if (String(output.stderr).length) {
      throw Error(String(output.stderr));
    }
  }
}

class PythonParser implements Parser {
  toXml(uri: string): string {
    return spawnSync(commandExists.sync('python3') ? 'python3' : 'python', ['-c', `import plistlib;\nwith open("""${uri.replace(/\\/g,'\\\\')}""", 'rb') as fp: pl = plistlib.load(fp); print(plistlib.dumps(pl).decode('utf-8'))`]).stdout.toString();
  }
  async toBinary(uri: string, xmlString: string): Promise<void> {
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
    const output = spawnSync(commandExists.sync('python3') ? 'python3' : 'python', ['-c', python], { input: xmlString });
    if (String(output.stderr).length) {
      throw Error(String(output.stderr));
    }
  }
}
class NodeParser implements Parser {
  toXml(uri: string): string {
    return plist.stringify(plist.readFileSync(uri));
  }
  async toBinary(uri: string, xmlString: string): Promise<void> {
    const result = await vscode.window.showQuickPick(['Continue', 'Cancel'], {
      placeHolder: 'Values of type real that are whole numbers will be saved as type integer. Continue?'
    });
    if (result !== 'Continue') {
      throw Error('Save cancelled.');
    }
    const originalConsoleError = console.error;
    const originalConsoleWarn = console.warn;
    console.error = message => { throw Error(`An error occurred saving the file: ${message}`); };
    console.warn = message => { throw Error(`An error occurred saving the file: ${message}`); };
    try {
      const object = plist.parse(xmlString);
      try {
        plist.writeBinaryFileSync(uri, object);
      } catch(message) {
        throw Error(`An error occurred saving the file: ${message}`);
      }
    } catch(message) {
      throw Error(`An error occurred parsing the XML: ${message}`);
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
    return commandExists.sync('plutil');
  }

  _hasPlistlib(): boolean {
    let hasPython2 = false;
    if (commandExists.sync('python')) {
      if (spawnSync('python', ['-c', 'import plistlib; plistlib.load']).stderr.length === 0) {
        hasPython2 = true;
      }
    }
    return hasPython2 || commandExists.sync('python3');
  }

  binaryToXml(uri: string): string {
    return this.engine.toXml(uri);
  }

  async xmlToBinary(uri: string, xmlString: string): Promise<void> {
    return this.engine.toBinary(uri, xmlString);
  }
}
