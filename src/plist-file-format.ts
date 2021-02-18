import * as vscode from 'vscode';
import { spawnSync }  from 'child_process';
const hasbin = require('hasbin');
const plist = require('simple-plist');

const Parser = Object({
  PLUTIL: false,
  PYTHON: false,
  NODE:   false
});

export class PlistFileFormat {
  constructor(parser: string = '') {
    if (!parser) {
      if (this._hasPlutil()) {
        Parser.PLUTIL = true;
      } else if (this._hasPlistlib()) {
        Parser.PYTHON = true;
      } else {
        Parser.NODE = true;
      }
    } else {
      Parser[parser] = true;
    }
  }

  _hasPlutil(): boolean {
    return hasbin.sync('plutil');
  }

  _hasPlistlib(): boolean {
    const output = hasbin.sync('python') && spawnSync('python', ['-c', 'import plistlib;']);
    return String(output.stderr).length === 0;
  }

  binaryToXml(uri: string) {
    if (Parser.PLUTIL) {
      return spawnSync('plutil', ['-convert', 'xml1', uri, '-o',  '-']).stdout;
    } else if (Parser.PYTHON) {
      return spawnSync('python', ['-c', `import plistlib;\nwith open('${uri}'.replace("'","\\'"), 'rb') as fp: pl = plistlib.load(fp); print(plistlib.dumps(pl).decode('utf-8'))`]).stdout;
    } else if (Parser.NODE) {
      return plist.stringify(plist.readFileSync(uri));
    }
  }

  async xmlToBinary(uri: string, xmlString: string) {
    if (Parser.PLUTIL) {
      const output = spawnSync('plutil', ['-convert', 'binary1', '-o', uri,  '-'], { input: xmlString });
      if (String(output.stdout).length) {
        return Promise.reject(String(output.stdout));
      }
      if (String(output.stderr).length) {
        return Promise.reject(String(output.stderr));
      }
    } else if (Parser.PYTHON) {
      const python = `
import sys, os, tempfile, shutil, plistlib

fp = tempfile.NamedTemporaryFile(mode='wb', delete=False)
pl = plistlib.loads(sys.stdin.read().encode('utf-8'), fmt=plistlib.FMT_XML)
plistlib.dump(pl, fp, fmt=plistlib.FMT_BINARY)
path = fp.name
fp.close()
shutil.copy(path, '${uri}'.replace("'","\\'"))
os.remove(path)
`;
      const output = spawnSync('python', ['-c', python], { input: xmlString });
      if (String(output.stderr).length) {
        return Promise.reject(String(output.stderr));
      }
    } else if (Parser.NODE) {
      const result = await vscode.window.showQuickPick(['Continue', 'Cancel'], {
        placeHolder: 'Values of type real that are whole numbers will be saved as type integer. Continue?'
      });
      if (result !== 'Continue') {
        return Promise.reject();
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
}
