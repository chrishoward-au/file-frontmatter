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

		new Setting(containerEl)
			.setName('Default frontmatter template')
			.setDesc('The default template to use when adding frontmatter to a file. Use {{title}} for the file name, {{date}} for the current date, and {{tags}} for automatically generated tags.')
			.addTextArea(text => text
				.setPlaceholder('Enter your template')
				.setValue(this.plugin.settings.defaultTemplate)
				.onChange(async (value) => {
					this.plugin.settings.defaultTemplate = value;
					await this.plugin.saveSettings();
				}))
			.addExtraButton(button => {
				button
					.setIcon('reset')
					.setTooltip('Reset to default')
					.onClick(async () => {
						this.plugin.settings.defaultTemplate = DEFAULT_SETTINGS.defaultTemplate;
						await this.plugin.saveSettings();
						this.display();
					});
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
			
		containerEl.createEl('h3', {text: 'Text Extraction & Keyword Generation'});
		
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
			.setName('Cortical.io API Key')
			.setDesc('API key for keyword generation')
			.addText(text => text
				.setPlaceholder('Enter your API key')
				.setValue(this.plugin.settings.corticalApiKey)
				.onChange(async (value) => {
					this.plugin.settings.corticalApiKey = value;
					await this.plugin.saveSettings();
				}));
				
		new Setting(containerEl)
			.setName('Maximum Keywords')
			.setDesc('Maximum number of keywords to include as tags')
			.addSlider(slider => slider
				.setLimits(1, 20, 1)
				.setValue(this.plugin.settings.maxKeywords)
				.setDynamicTooltip()
				.onChange(async (value) => {
					this.plugin.settings.maxKeywords = value;
					await this.plugin.saveSettings();
				}));
	}
} 