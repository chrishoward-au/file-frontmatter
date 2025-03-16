import { App, PluginSettingTab, Setting } from 'obsidian';
import FileFrontmatterPlugin from './main';
import { DEFAULT_SETTINGS, AIProvider, TagCaseFormat } from './types';

export class FileFrontmatterSettingTab extends PluginSettingTab {
	plugin: FileFrontmatterPlugin;

	constructor(app: App, plugin: FileFrontmatterPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		containerEl.createEl('h2', {text: 'File Frontmatter Settings'});

		// Create a custom container for the template setting
		const templateContainer = containerEl.createDiv();
		templateContainer.createEl('h3', {text: 'Default frontmatter template'});
		templateContainer.createEl('p', {text: 'The default template to use when adding frontmatter to a file. Use {{title}} for the file name, {{date}} for the current date, and {{tags}} for automatically generated tags.'});
		const templateTextArea = templateContainer.createEl('textarea', {
			attr: {
				style: 'width: 100%; height: 120px; margin-bottom: 1em;'
			}
		});
		templateTextArea.value = this.plugin.settings.defaultTemplate;
		templateTextArea.addEventListener('change', async () => {
			this.plugin.settings.defaultTemplate = templateTextArea.value;
			await this.plugin.saveSettings();
		});
		const templateResetButton = templateContainer.createEl('button', {text: 'Reset to default'});
		templateResetButton.addEventListener('click', async () => {
			this.plugin.settings.defaultTemplate = DEFAULT_SETTINGS.defaultTemplate;
			templateTextArea.value = DEFAULT_SETTINGS.defaultTemplate;
			await this.plugin.saveSettings();
		});

		new Setting(containerEl)
			.setName('Accepted file types')
			.setDesc('Comma-separated list of file extensions (without dots) that can have frontmatter added. Example: pdf,jpg,png')
			.addText(text => text
				.setPlaceholder('pdf,jpg,png')
				.setValue(this.plugin.settings.acceptedFileTypes.join(','))
				.onChange(async (value) => {
					// Split by comma and trim whitespace
					const fileTypes = value.split(',')
						.map(type => type.trim().toLowerCase())
						.filter(type => type.length > 0);
					
					this.plugin.settings.acceptedFileTypes = fileTypes;
					await this.plugin.saveSettings();
				}))
			.addExtraButton(button => {
				button
					.setIcon('reset')
					.setTooltip('Reset to default')
					.onClick(async () => {
						this.plugin.settings.acceptedFileTypes = DEFAULT_SETTINGS.acceptedFileTypes;
						await this.plugin.saveSettings();
						this.display();
					});
			});
			
		containerEl.createEl('h3', {text: 'Text Extraction & Tag Generation'});
		
		new Setting(containerEl)
			.setName('Extract text from files')
			.setDesc('When enabled, the plugin will extract text from PDFs and other supported files using the Text Extractor plugin')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.extractTextFromFiles)
				.onChange(async (value) => {
					this.plugin.settings.extractTextFromFiles = value;
					await this.plugin.saveSettings();
				}));
				
		new Setting(containerEl)
			.setName('Include extracted text in note')
			.setDesc('When enabled, the extracted text will be included in the created note. Disable to keep notes cleaner.')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.includeExtractedText)
				.onChange(async (value) => {
					this.plugin.settings.includeExtractedText = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('AI Provider')
			.setDesc('Choose which AI service to use for generating tags')
			.addDropdown(dropdown => dropdown
				.addOption('openai', 'OpenAI')
				.addOption('gemini', 'Google Gemini')
				.addOption('ollama', 'Ollama (Local)')
				.setValue(this.plugin.settings.aiProvider)
				.onChange(async (value: AIProvider) => {
					this.plugin.settings.aiProvider = value;
					await this.plugin.saveSettings();
					// Refresh the display to show/hide relevant settings
					this.display();
				}));

		// Show provider-specific settings based on selection
		if (this.plugin.settings.aiProvider === 'openai') {
			new Setting(containerEl)
				.setName('OpenAI API Key')
				.setDesc('Enter your OpenAI API key to enable automatic tag generation.')
				.addText(text => text
					.setPlaceholder('Enter your OpenAI API key')
					.setValue(this.plugin.settings.openAIApiKey)
					.onChange(async (value) => {
						this.plugin.settings.openAIApiKey = value;
						await this.plugin.saveSettings();
					}));
		} else if (this.plugin.settings.aiProvider === 'gemini') {
			new Setting(containerEl)
				.setName('Google Client ID')
				.setDesc('Enter your Google Cloud Client ID')
				.addText(text => text
					.setPlaceholder('Enter your Google Cloud Client ID')
					.setValue(this.plugin.settings.googleClientId || '')
					.onChange(async (value) => {
						this.plugin.settings.googleClientId = value;
						await this.plugin.saveSettings();
					}));

			new Setting(containerEl)
				.setName('Google Client Secret')
				.setDesc('Enter your Google Cloud Client Secret')
				.addText(text => text
					.setPlaceholder('Enter your Google Cloud Client Secret')
					.setValue(this.plugin.settings.googleClientSecret || '')
					.onChange(async (value) => {
						this.plugin.settings.googleClientSecret = value;
						await this.plugin.saveSettings();
					}));
		} else if (this.plugin.settings.aiProvider === 'ollama') {
			new Setting(containerEl)
				.setName('Ollama Host')
				.setDesc('The URL where Ollama is running (default: http://localhost:11434)')
				.addText(text => text
					.setPlaceholder('http://localhost:11434')
					.setValue(this.plugin.settings.ollamaHost)
					.onChange(async (value) => {
						this.plugin.settings.ollamaHost = value;
						await this.plugin.saveSettings();
					}));

			new Setting(containerEl)
				.setName('Ollama Model')
				.setDesc('The model to use for tag generation (e.g., llama2, mistral, etc.)')
				.addText(text => text
					.setPlaceholder('llama2')
					.setValue(this.plugin.settings.ollamaModel)
					.onChange(async (value) => {
						this.plugin.settings.ollamaModel = value;
						await this.plugin.saveSettings();
					}));
		}

		new Setting(containerEl)
			.setName('Maximum Tags')
			.setDesc('Maximum number of tags to generate for each file.')
			.addText(text => text
				.setPlaceholder('5')
				.setValue(String(this.plugin.settings.maxTags))
				.onChange(async (value) => {
					const numValue = Number(value);
					if (!isNaN(numValue) && numValue > 0) {
						this.plugin.settings.maxTags = numValue;
						await this.plugin.saveSettings();
					}
				}));

		new Setting(containerEl)
			.setName('Maximum words per tag')
			.setDesc('The maximum number of words allowed in each tag')
			.addSlider(slider => slider
				.setLimits(1, 5, 1)
				.setValue(this.plugin.settings.maxWordsPerTag)
				.setDynamicTooltip()
				.onChange(async (value) => {
					this.plugin.settings.maxWordsPerTag = value;
					await this.plugin.saveSettings();
				}))
			.addExtraButton(button => {
				button
					.setIcon('reset')
					.setTooltip('Reset to default')
					.onClick(async () => {
						this.plugin.settings.maxWordsPerTag = DEFAULT_SETTINGS.maxWordsPerTag;
						await this.plugin.saveSettings();
						this.display();
					});
			});
			
		new Setting(containerEl)
			.setName('Tag case format')
			.setDesc('Choose how to format the case of generated tags')
			.addDropdown(dropdown => dropdown
				.addOption('lowercase', 'Lowercase (e.g., "tag-example")')
				.addOption('uppercase', 'Uppercase (e.g., "TAG-EXAMPLE")')
				.addOption('titlecase', 'Title Case (e.g., "Tag-Example")')
				.addOption('retain', 'Retain Original Case')
				.setValue(this.plugin.settings.tagCaseFormat)
				.onChange(async (value: TagCaseFormat) => {
					this.plugin.settings.tagCaseFormat = value;
					await this.plugin.saveSettings();
				}))
			.addExtraButton(button => {
				button
					.setIcon('reset')
					.setTooltip('Reset to default')
					.onClick(async () => {
						this.plugin.settings.tagCaseFormat = DEFAULT_SETTINGS.tagCaseFormat;
						await this.plugin.saveSettings();
						this.display();
					});
			});

		// Create a custom container for the AI prompt setting
		const promptContainer = containerEl.createDiv();
		promptContainer.createEl('h3', {text: 'AI Prompt'});
		promptContainer.createEl('p', {text: 'Prompt for generating tags. Use {{max_tags}} to insert the maximum number of tags.'});
		const promptTextArea = promptContainer.createEl('textarea', {
			attr: {
				style: 'width: 100%; height: 80px; margin-bottom: 1em;'
			}
		});
		promptTextArea.value = this.plugin.settings.aiPrompt;
		promptTextArea.addEventListener('change', async () => {
			this.plugin.settings.aiPrompt = promptTextArea.value;
			await this.plugin.saveSettings();
		});
		const promptResetButton = promptContainer.createEl('button', {text: 'Reset to default'});
		promptResetButton.addEventListener('click', async () => {
			this.plugin.settings.aiPrompt = DEFAULT_SETTINGS.aiPrompt;
			promptTextArea.value = DEFAULT_SETTINGS.aiPrompt;
			await this.plugin.saveSettings();
		});
	}
} 