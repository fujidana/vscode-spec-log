# Change Log

All notable changes to the `fujidana/spec-log` extension will be documented in this file.

## [Unreleased]

### Added

- Make file paths in a scan headers clickable links. The path is relative to the workspace, not to the log file.

### Changed

- Restructure the code to make it parse log files more efficiently.

## [1.4.3] -- 2025-06-07

### Changed

- Migrate the bundler from `webpack` to `esbuild`.
- Raise the minimum VS Code version to 1.100.0.

## [1.4.2] -- 2025-02-17

### Changed

- Raise the minimum VS Code version to 1.97.0.

## [1.4.1] -- 2024-10-31

### Changed

- Raise the minimum VS Code version to 1.95.0.
- Make continous lines that consist of both date/time and number foldable. Previously lines were foldable only when those cosinst of number only or date/time only; mixed use was not supported.

## [1.4.0] -- 2024-08-25

### Added

- Navigation feature (breadcrumb) is now conscious of ouputs of built-in scan commands such as `dscan` and `ascan`. The feature will be benefitial in cases multiple scans are operated by a single command (this typically happens when a user calls a user-defined macro).
- Make continuous lines that consist of date and time only foldable. This may be useful for users who uses a user-defined count-down timer macro.

### Changed

- Raise the minimum VS Code version to 1.91.0.
- Update syntax highlighting rules.
  - Rename several scope names (reference: [Sublime Text / Scope Naming](https://www.sublimetext.com/docs/scope_naming.html)).
  - Make command string a user typed (i.e., strings following a __spec__ prompt) bold-faced, like codes in spec_manA4.pdf.
  - Apply minor fixes.

## [1.3.2] -- 2023-12-30

### Changed

- Raise the minimum VS Code version to 1.85.0.

## [1.3.1] -- 2023-08-20

### Changed

- Raise the minimum VS Code version to 1.78.0.

## [1.3.0] -- 2023-05-23

### Added

- Make continuous lines that consist of number only (typically output of scan and `u`-prefixed move) foldable.

### Fixed

- extension not loaded when a `spec-log` file is open (a bug introduced in v1.2.4)
- minor syntax coloring rule to colorize `+` and `-` signs in numbers

## [1.2.4] -- 2023-03-18

### Changed

- Raise the minimum VS Code version to 1.76.0.

## [1.2.3] -- 2022-12-28

### Changed

- Raise the minimum VS Code version to 1.74.0.

## [1.2.2] -- 2022-09-26

### Changed

- Migrate the package manager from `npm` to `pnpm`. This affects the extension developers only.
- Raise the minimum VS Code version to 1.71.0.

## [1.2.1] -- 2022-06-29

### Changed

- Make _Welcome to "spec" Release x.xx.xx_ message blocks foldable.
- Raise the minimum VS Code version to 1.68.0.

## [1.2.0] -- 2021-09-13

### Changed

- Adapt for a web extension.
- Migrate the extension to use webpack.

## [1.1.1] -- 2021-08-14

### Fixed

- Improve symbol range detection for code nagivation.

## [1.1.0] -- 2021-07-28

### Changed

- Code folding and navigation features are now conscious of spec sessions (text blocks separated by the `welcome to "spec" Release x.x.x` lines). Prompt lines such as `1.SPEC> ...` are grouped in the respective sessions. Previously prompts are structured flatly.

### Fixed

- syntax highlighting not working on successive prompts (e.g., `2.more> ...`)
- unenclosed string (a solitary double quoation mark, `"`) messing up syntax highlighting

## [1.0.1] -- 2021-07-19

### Fixed

- syntax highlighting on a literal string that includes escaped characters (e.g., `"\n"`) not properly working

## [1.0.0] -- 2021-06-30

### Fixed

- Improve symbol range detection for code nagivation.

### Security

- Adapt for _Workspace Trust_ (all functions of the extension work in untrusted workspaces)

## vscode-spec 1.4.0 -- 2021-06-10

### Changed

- Refine syntax highlighting rules to __spec__ log files.

## vscode-spec 1.3.0 -- 2021-05-25

### Added

- initial support to __spec__ log files (language identifier: `spec-log`, file extension: `.tlog`), including the following features:
  - synax highlighting
  - code navigation
  - folding

[Unreleased]: https://github.com/fujidana/vscode-spec-log/compare/v1.4.3...HEAD
[1.4.3]: https://github.com/fujidana/vscode-spec-log/compare/v1.4.2...v1.4.3
[1.4.2]: https://github.com/fujidana/vscode-spec-log/compare/v1.4.1...v1.4.2
[1.4.1]: https://github.com/fujidana/vscode-spec-log/compare/v1.4.0...v1.4.1
[1.4.0]: https://github.com/fujidana/vscode-spec-log/compare/v1.3.2...v1.4.0
[1.3.2]: https://github.com/fujidana/vscode-spec-log/compare/v1.3.1...v1.3.2
[1.3.1]: https://github.com/fujidana/vscode-spec-log/compare/v1.3.0...v1.3.1
[1.3.0]: https://github.com/fujidana/vscode-spec-log/compare/v1.2.4...v1.3.0
[1.2.4]: https://github.com/fujidana/vscode-spec-log/compare/v1.2.3...v1.2.4
[1.2.3]: https://github.com/fujidana/vscode-spec-log/compare/v1.2.2...v1.2.3
[1.2.2]: https://github.com/fujidana/vscode-spec-log/compare/v1.2.1...v1.2.2
[1.2.1]: https://github.com/fujidana/vscode-spec-log/compare/v1.2.0...v1.2.1
[1.2.0]: https://github.com/fujidana/vscode-spec-log/compare/v1.1.1...v1.2.0
[1.1.1]: https://github.com/fujidana/vscode-spec-log/compare/v1.1.0...v1.1.1
[1.1.0]: https://github.com/fujidana/vscode-spec-log/compare/v1.0.1...v1.1.0
[1.0.1]: https://github.com/fujidana/vscode-spec-log/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/fujidana/vscode-spec-log/releases/tag/v1.0.0
