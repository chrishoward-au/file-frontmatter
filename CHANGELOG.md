# Changelog

All notable changes to the File Frontmatter plugin will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2023-07-10

### Added
- AI-powered tag generation using multiple providers:
  - OpenAI integration for generating tags from extracted text
  - Google Gemini support (OAuth implementation pending)
  - Local Ollama integration for offline tag generation
- Text extraction from PDFs using the Text Extractor plugin
- Customizable AI prompt with support for variables
- Setting for maximum number of tags to generate
- Setting for maximum words per tag (1-3 words)
- Option to include or exclude extracted text in notes (off by default)
- Manual tag entry when automatic generation fails
- Improved tag formatting for Obsidian compatibility
- Error handling and retry mechanism for API rate limits

### Changed
- Updated the default template to include tags in YAML format
- Improved user interface with conditional settings based on selected AI provider
- Enhanced error notifications with more descriptive messages

### Fixed
- Tag formatting to ensure compatibility with Obsidian's tag system
- Proper handling of API errors and rate limits
- Memory usage optimization by limiting text length for API requests

## [0.0.1] - 2023-05-15

### Added
- Initial release
- Add frontmatter to files that don't have it
- Customizable frontmatter template
- Support for variables (file title, current date)
- Setting for accepted file types (default: pdf)
- Command to add frontmatter to all files in current folder 