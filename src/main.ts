import { Plugin } from 'obsidian';
import { TagFilesAndNotesSettings, DEFAULT_SETTINGS } from './handlers/types';
import { TagFilesAndNotesSettingTab as TagFilesAndNotesSettingTab } from './handlers/settings';
import { registerCommands } from './libs/commands';

export default class TagFilesAndNotesPlugin extends Plugin {
	settings: TagFilesAndNotesSettings;

	async onload() {
		await this.loadSettings();

		// Register the settings tab
		this.addSettingTab(new TagFilesAndNotesSettingTab(this.app, this));

		// Register commands
		registerCommands(this, this.settings);
	}

	onunload() {
		// Nothing to clean up
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
} 