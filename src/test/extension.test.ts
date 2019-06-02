import * as assert from 'assert';
import * as vscode from 'vscode';

const EXTENSION_ID = 'dnicolson.binary-plist';

suite("Extension", () => {

    test('extension should be present', () => {
        assert.ok(vscode.extensions.getExtension(EXTENSION_ID));
    });

    test('should activate', function(done) {
        this.timeout(60 * 1000);
        const extension = vscode.extensions.getExtension(EXTENSION_ID)!;
        if (!extension.isActive) {
            extension.activate().then(api => {
                done();
            }, () => {
                done('Failed to activate extension');
            });
        } else {
            done();
        }
    });
});
