import { Plugin } from 'obsidian';
import { FileFrontmatterSettings, DEFAULT_SETTINGS } from './types';
import { FileFrontmatterSettingTab } from './settings';
import { registerCommands } from './commands';

export default class FileFrontmatterPlugin extends Plugin {
	settings: FileFrontmatterSettings;

	async onload() {
		await this.loadSettings();

		// Register the settings tab
		this.addSettingTab(new FileFrontmatterSettingTab(this.app, this));

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