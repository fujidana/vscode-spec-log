# Change Log

All notable changes to the `fujidana/spec-log` extension will be documented in this file.

## [Unreleased]

## [1.3.0] -- 2023-05-23

### Added

- Make continuous lines that consist of number only (typically output of scan and `u`-prefixed move) foldable.

### Fixed

- extension not loaded when a `spec-log` file is open (a bug introduced in v1.2.4)
- minor syntax coloring rule to colorize `+` and `-` signs in numbers

## [1.2.4] -- 2023-03-18

### Changed

- Update Node.js packages.
- Raise the minimum VS Code version to 1.76.0.

## [1.2.3] -- 2022-12-28

### Changed

- Update Node.js packages.
- Raise the minimum VS Code version to 1.74.0.

## [1.2.2] -- 2022-09-26

### Changed

- Migrate the package manager from `npm` to `pnpm`. This affects the extension developers only.
- Update Node.js packages.
- Raise the minimum VS Code version to 1.71.0.

## [1.2.1] -- 2022-06-29

### Changed

- Make _Welcome to "spec" Release x.xx.xx_ message blocks foldable.
- Update Node.js packages.
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

[Unreleased]: https://github.com/fujidana/vscode-spec-log/compare/v1.3.0...HEAD
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
