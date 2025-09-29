# Binary Plist

A Visual Studio Code extension that enables editing of binary property list files as XML text. When you open a binary plist file, it automatically converts it to XML format and opens it in a standard text editor.

The extension uses VS Code's Custom Editor API to seamlessly handle the conversion between binary and XML formats. When you save the XML file, it's automatically converted back to binary format.

The extension is cross-platform but primarily uses the macOS `plutil` binary for conversion, with Python `plistlib` as an alternative if available. The Node.js package `simple-plist` is used as a fallback, though due to JavaScript not having a float type, `real` values that are whole numbers will be cast to `integer` types (a warning dialog is shown first).

## Tests

Tests can be run with `npm test` or running `Extension Tests` in the Visual Studio Code debugger.
