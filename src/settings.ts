import { App, PluginSettingTab, Setting } from 'obsidian';
import FileFrontmatterPlugin from './main';
import { DEFAULT_SETTINGS } from './types';

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
			.setName('OpenAI API Key')
			.setDesc('API key for OpenAI tag generation')
			.addText(text => text
				.setPlaceholder('Enter your OpenAI API key')
				.setValue(this.plugin.settings.openAIApiKey)
				.onChange(async (value) => {
					this.plugin.settings.openAIApiKey = value;
					await this.plugin.saveSettings();
				}));
				
		new Setting(containerEl)
			.setName('Maximum Tags')
			.setDesc('Maximum number of tags to include')
			.addSlider(slider => slider
				.setLimits(1, 20, 1)
				.setValue(this.plugin.settings.maxKeywords)
				.setDynamicTooltip()
				.onChange(async (value) => {
					this.plugin.settings.maxKeywords = value;
					await this.plugin.saveSettings();
				}));

		// Create a custom container for the AI prompt setting
		const promptContainer = containerEl.createDiv();
		promptContainer.createEl('h3', {text: 'AI Prompt'});
		promptContainer.createEl('p', {text: 'Prompt for generating tags. Use {{max_keywords}} to insert the maximum number of tags.'});
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