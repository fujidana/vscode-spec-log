# Change Log

All notable changes to the "vscode-spec-log" extension will be documented in this file.

## [Unreleased]

## [1.0.0] - 2021-06-30

### Added

- Support _Workspace Trust_ (all functions of the extension work even in an untrusted workspace)

### Changed

- Extract the features related to __spec__ log files from `vscode-spec` extension and make a new extention with its identifier `spec-log`. The language identifier is `spec-log`, which is not changed and is the same as the extension identifier.
- Improve range detection in code nagivation

## `vscode-spec` 1.4.0 - 2021-06-10

### Changed

- Refine syntax highlighting rules to __spec__ log files.

## `vscode-spec` 1.3.0 - 2021-05-25

### Added

- initial support to __spec__ log files (language identifier: `spec-log`, file extension: `.tlog`), including the following features:
  - synax highlighting
  - code navigation
  - folding

[Unreleased]: https://github.com/fujidana/vscode-spec-log/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/fujidana/vscode-spec-log/releases/tag/v1.0.0

<!--markdownlint-configure-file { "MD024": false } -->
