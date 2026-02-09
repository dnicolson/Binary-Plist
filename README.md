# Binary Plist

A Visual Studio Code extension that enables editing of binary property list files as XML text. When you open a binary plist file, it automatically converts it to XML format and opens it in a standard text editor.

The extension uses VS Code's Custom Editor API to seamlessly handle the conversion between binary and XML formats. When you save the XML file, it's automatically converted back to binary format.

The extension uses the `libplist` library by default for cross-platform plist conversion. You can configure a different engine through the `binaryPlist.engine` setting:

- **libplist** (default): Cross-platform library with reliable conversion
- **plutil**: macOS native command-line utility
- **python**: Python's plistlib module (requires Python with plistlib)
- **node**: Node.js bplist-parser and bplist-creator libraries (note: due to JavaScript not having a float type, `real` values that are whole numbers will be cast to `integer` types)
