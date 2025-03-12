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
			.setDesc('The default template to use when adding frontmatter to a file. Use {{title}} for the file name and {{date}} for the current date.')
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
	}
} 