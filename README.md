# Binary Plist

A Visual Studio Code extension that enables editing of binary property list files as XML. It is inspired by the [BinaryPlist](https://github.com/tyrone-sudeium/st3-binaryplist) Sublime Text package, although the experience is not as seamless (the user must agree to opening a binary file and the editing takes place in an additional tab). A virtual file system is used to achieve this using the `FileSystemProvider` API.

The node package `simple-plist` was used in favour of `plutil` so it should work on other platforms than macOS.

## Usage

Simply open a binary property list file and after clicking "Do you want to open it anyway?" another tab will open in XML and all changes saved will be reflected in the other tab as binary. All file operations are synchronous for simplicity and because property list files tend to be small.

## Tests

Tests can be run with `npm test` or running `Extension Tests` in the Visual Studio Code debugger.
