# Change Log

<!-- All notable changes to the "vscode-spec-log" extension will be documented in this file. -->

## [Unreleased]

## [1.0.1] - 2021-06-30

### Changed

- Improve syntax highlighting rules:
  - Add syntax highlighting on a successive prompt (e.g., `2.more> ...`).
  - Improve syntax highlighting on a literal string that includes escaped characters (e.g., `"\n"`)

## [1.0.0] - 2021-06-30

### Changed

- Split `spec-log` v1.0.0 (this extenison) from _spec Language Support_ (`vscode-spec`) v1.4.0.
- Improve range detection in code nagivation.

### Security

- Support _Workspace Trust_ (all functions of the extension work in untrusted workspaces)

## vscode-spec 1.4.0 - 2021-06-10

### Changed

- Refine syntax highlighting rules to __spec__ log files.

## vscode-spec 1.3.0 - 2021-05-25

### Added

- initial support to __spec__ log files (language identifier: `spec-log`, file extension: `.tlog`), including the following features:
  - synax highlighting
  - code navigation
  - folding

[Unreleased]: https://github.com/fujidana/vscode-spec-log/compare/v1.0.1...HEAD
[1.0.1]: https://github.com/fujidana/vscode-spec-log/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/fujidana/vscode-spec-log/releases/tag/v1.0.0
