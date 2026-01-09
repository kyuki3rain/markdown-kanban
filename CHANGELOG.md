# Changelog

All notable changes to the "md-tasks" extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] - 2026-01-09

### Added

- **Path Filtering**: Filter tasks by heading path (hierarchy) from toolbar dropdown ([#90](https://github.com/kyuki3rain/md-tasks/pull/90), closes [#71](https://github.com/kyuki3rain/md-tasks/issues/71))
  - Multi-select checkboxes with hierarchical display
  - Settings persist to frontmatter (`filterPaths` field)
- **Sort Switching from UI**: Change sort order from toolbar dropdown ([#91](https://github.com/kyuki3rain/md-tasks/pull/91), closes [#70](https://github.com/kyuki3rain/md-tasks/issues/70))
  - Options: markdown (file order), priority, due date, alphabetical
  - Settings persist to frontmatter (`sortBy` field)
- **Keyboard Shortcut for Save**: Save document with `Ctrl+S` / `Cmd+S` in WebView ([#92](https://github.com/kyuki3rain/md-tasks/pull/92), closes [#74](https://github.com/kyuki3rain/md-tasks/issues/74))
- **Priority Input in Form**: Add priority dropdown to task edit form ([#93](https://github.com/kyuki3rain/md-tasks/pull/93), closes [#72](https://github.com/kyuki3rain/md-tasks/issues/72))
  - Options: None, High, Medium, Low
  - Saves to task metadata in Markdown
- **Kanban Panel Locking**: Lock panel to specific file, preventing auto-switch on editor change ([#97](https://github.com/kyuki3rain/md-tasks/pull/97), closes [#75](https://github.com/kyuki3rain/md-tasks/issues/75))
  - New commands: `Toggle Kanban Locking`, `Open Locked Kanban to Side`
  - New setting: `mdTasks.defaultLocked` (default: `true`)
  - Lock/unlock button in toolbar (🔒/🔓)

### Changed

- **Shared Package**: Created `@md-tasks/shared` package to centralize type definitions between core and webview ([#99](https://github.com/kyuki3rain/md-tasks/pull/99), closes [#89](https://github.com/kyuki3rain/md-tasks/issues/89))
  - Eliminated ~170 lines of duplicate code
- **EOL Utility**: Unified CRLF/LF handling with new EOL utility functions ([#98](https://github.com/kyuki3rain/md-tasks/pull/98), closes [#94](https://github.com/kyuki3rain/md-tasks/issues/94))

### Technical

- E2E test infrastructure with VSCode test runner ([#78](https://github.com/kyuki3rain/md-tasks/pull/78), [#83](https://github.com/kyuki3rain/md-tasks/pull/83))
- WebView UI tests with React Testing Library ([#88](https://github.com/kyuki3rain/md-tasks/pull/88))
- CI caching for VSCode test environment ([#81](https://github.com/kyuki3rain/md-tasks/pull/81))

## [0.1.2] - 2026-01-05

### Fixed

- Fix status update failing on Windows due to CRLF line endings (#84)
  - When editing Markdown files with CRLF line endings, changing task status via drag & drop would add a new status line instead of updating the existing one
  - This caused the status to appear unchanged because the last status line was read on parse

## [0.1.1] - 2025-12-29

### Changed

- Rename package from `markdown-kanban` to `md-tasks`
  - Command IDs: `markdownKanban.*` → `mdTasks.*`
  - Settings keys: `markdownKanban.*` → `mdTasks.*`

### Fixed

- Exclude unnecessary files from VSIX package

## [0.1.0] - 2025-12-29

### Added

- **Kanban Board View**: Display TODO lists from Markdown files as a Kanban board
- **Drag & Drop**: Change task status by dragging cards between columns
- **Task Management**: Create, edit, and delete tasks directly from the board
- **Path Grouping**: Organize tasks by heading hierarchy (e.g., `Project > Feature > Task`)
- **Markdown Rendering**: Render links, code, and other Markdown formatting in task names
- **Sorting Options**: Sort tasks by file order, priority, due date, or alphabetically
- **Configuration**: Support for VSCode settings and frontmatter configuration
  - `statuses`: Customize status columns
  - `doneStatuses`: Define which statuses mark tasks as complete
  - `defaultStatus` / `defaultDoneStatus`: Set default statuses
  - `sortBy`: Choose default sort order
  - `syncCheckboxWithDone`: Auto-sync checkbox state with done status
- **Save/Discard UI**: Floating buttons to save or discard unsaved changes
- **Editor Integration**: Open board from editor title bar button

### Technical

- Clean Architecture with Domain/Application/Infrastructure/Interface layers
- pnpm workspace with core (extension) and webview (React) packages
- TypeScript strict mode with Zod validation
- neverthrow Result type for error handling
- 225+ unit tests with 85%+ branch coverage
- GitHub Actions CI/CD pipeline
- devbox development environment
