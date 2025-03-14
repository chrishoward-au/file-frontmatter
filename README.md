# File to Note Plugin for Obsidian

This plugin automatically creates markdown notes with frontmatter for your files in Obsidian.

## Features

- Automatically creates a markdown note when you add a PDF or other supported file
- Extracts text from PDFs using the Text Extractor plugin
- Generates tags using OpenAI's GPT-3.5
- Customizable frontmatter template
- Support for multiple file types

## Installation

1. Install the plugin from Obsidian's Community Plugins
2. Enable the plugin in Obsidian's settings
3. Install and enable the Text Extractor plugin
4. Add your OpenAI API key in the plugin settings

## Configuration

1. Copy `data.template.json` to `data.json`
2. Add your OpenAI API key to `data.json`
3. Customize the template and other settings as needed

## Development

1. Clone this repository
2. Install dependencies with `npm install`
3. Run `npm run dev` to start development build

## Production Build

To create a clean production build:

1. Run `npm run build:prod`

This will:
- Build the plugin
- Remove any existing data.json (with your API keys)
- Create a fresh data.json from the template

**Important**: Always use `npm run build:prod` before sharing or committing your build to ensure your API keys are not included.

## License

MIT 