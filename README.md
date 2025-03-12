# File Frontmatter

A plugin for [Obsidian](https://obsidian.md) that helps manage frontmatter in your markdown files.

## Features

- Add frontmatter to files that don't have it
- Customizable frontmatter template
- Variables support (file title, current date)

## Usage

1. Open a file that doesn't have frontmatter
2. Use the command "Add frontmatter to current file" from the command palette
3. Frontmatter will be added to the beginning of the file based on your template

## Settings

- **Default frontmatter template**: Customize the template used when adding frontmatter to files
  - Use `{{title}}` to insert the file name
  - Use `{{date}}` to insert the current date

## Installation

### From Obsidian

1. Open Settings > Community plugins
2. Turn off Safe mode if it's on
3. Click Browse community plugins
4. Search for "File Frontmatter"
5. Click Install
6. Once installed, enable the plugin

### Manual Installation

1. Download the latest release from the Releases section
2. Extract the zip file into your Obsidian vault's `.obsidian/plugins` folder
3. Reload Obsidian
4. Enable the plugin in Settings > Community plugins

## Development

1. Clone this repository to your `.obsidian/plugins` folder
2. Install dependencies: `npm install`
3. Build the plugin: `npm run build`
4. To start development mode: `npm run dev`

## License

This project is licensed under the MIT License - see the LICENSE file for details. 