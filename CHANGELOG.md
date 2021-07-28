# Change Log

<!-- All notable changes to the "vscode-spec-log" extension will be documented in this file. -->

## [Unreleased]

## [1.1.0] -- 2021-07-28

### Changed

- Code folding and navigation features are now conscious of spec sessions (separating the text blocks by `welcome to "spec" Release x.x.x` lines)
  - prompt lines such as `1.SPEC> ...` are grouped in the respective sessions.
  - Previously it was a flat sctucture consisting of the prompt lines.

### Fixed

- syntax highlighting not working on successive prompts (e.g., `2.more> ...`)
- unenclosed string (a solitary double quoation mark, `"`) messing up syntax highlighting

## [1.0.1] -- 2021-07-19

### Fixed

- syntax highlighting on a literal string that includes escaped characters (e.g., `"\n"`) not properly working

## [1.0.0] -- 2021-06-30

### Changed

- Split `spec-log` v1.0.0 (this extenison) from _spec Language Support_ (`vscode-spec`) v1.4.0.
- Improve range detection in code nagivation.

### Security

- Support _Workspace Trust_ (all functions of the extension work in untrusted workspaces)

## vscode-spec 1.4.0 -- 2021-06-10

### Changed

- Refine syntax highlighting rules to __spec__ log files.

## vscode-spec 1.3.0 -- 2021-05-25

### Added

- initial support to __spec__ log files (language identifier: `spec-log`, file extension: `.tlog`), including the following features:
  - synax highlighting
  - code navigation
  - folding

[Unreleased]: https://github.com/fujidana/vscode-spec-log/compare/v1.1.0...HEAD
[1.1.0]: https://github.com/fujidana/vscode-spec-log/compare/v1.0.1...v1.1.0
[1.0.1]: https://github.com/fujidana/vscode-spec-log/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/fujidana/vscode-spec-log/releases/tag/v1.0.0
