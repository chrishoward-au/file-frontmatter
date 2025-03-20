# Changelog

All notable changes to the File to Note plugin will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.1] - 2024-03-20
### Fixed
- Fixed YAML frontmatter formatting issues
- Added filtering of '--' string from tag operations
- Improved tag handling in all formats (YAML list, inline array, single tag)

## [0.2.0] - 2024-03-19
### Added
- Support for multiple AI providers (OpenAI, Ollama)
- Configurable tag case formatting
- Language preference settings
- Improved error handling and retry logic

### Changed
- Refactored tag handling logic for better maintainability
- Updated frontmatter management
- Improved tag validation and filtering

### Fixed
- Fixed issues with tag merging and duplicates
- Improved handling of existing frontmatter
- Fixed tag case normalization

## [0.1.0] - 2024-03-18
### Added
- Initial release
- Basic file to note conversion
- AI-powered tag generation
- Support for PDF and image files

## [0.0.1] - 2025-03-10

### Added
- Initial release
- Add frontmatter to files that don't have it
- Customizable frontmatter template
- Support for variables (file title, current date)
- Setting for accepted file types (default: pdf)
- Command to add frontmatter to all files in current folder 