# __spec__ Log File Extension for Visual Studio Code

The extension enhances user experiences in browsing __spec__ log files with Visual Studio Code.
The term _log files_ here indicates files created when __spec__ software is launched with `-l` option (e.g., `fourc -l 20210414.tlog`).

__spec__ does not specify the filename extension of log files.
While this VS Code extension by default treats `.tlog` as the file extension of log files (language identifier: `spec-log`), users can change the association by themselves.
Read [Language Support in Visual Studio Code](https://code.visualstudio.com/docs/languages/overview) (official document of VS Code) for further details.

## What's __spec__?

> __spec__ is internationally recognized as the leading software for instrument control and data acquisition in X-ray diffraction experiments.
> It is used at more than 200 synchrotrons, industrial laboratories, universities and research facilities around the globe.

_cited from [CSS - Certified Scientific Software](https://www.certif.com) homepage._

Note that the extension is not the official one developed by Certified Scientific Software.
Use [GitHub issues](https://github.com/fujidana/vscode-spec-log/issues) for bug reports and feature requests about the extension.

## Features

* __Syntax highlighting__
* __Code navigation__
  * __Show all symbol definitions within a document__
* __Code folding__

Lines of a __spec__ prompt such as `1.FOURC>` are picked out for code navigation and folding.

![screenshot](resources/screenshot.png)

## Requirements

None.

## Extension Settings

None.

## Known Issues

Nothing known.
