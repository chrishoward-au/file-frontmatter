import { App, Editor, MarkdownView, Notice, Plugin, TFile } from 'obsidian';
import { FileFrontmatterSettings, DEFAULT_SETTINGS } from './types';
import { FileFrontmatterSettingTab } from './settings';
import { formatDate, replaceTemplateVariables } from './utils';

export default class FileFrontmatterPlugin extends Plugin {
	settings: FileFrontmatterSettings;

	async onload() {
		await this.loadSettings();

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new FileFrontmatterSettingTab(this.app, this));

		// This adds a command to add frontmatter to the current file
		this.addCommand({
			id: 'add-frontmatter',
			name: 'Add frontmatter to current file',
			editorCallback: (editor: Editor, view: MarkdownView) => {
				const file = view.file;
				if (!file) {
					new Notice('No file is open');
					return;
				}
				
				this.addFrontmatterToFile(editor, file);
			}
		});

		// Add a command to add frontmatter to all files of accepted types in the current folder
		this.addCommand({
			id: 'add-frontmatter-to-folder',
			name: 'Add frontmatter to all files in current folder',
			callback: async () => {
				const activeFile = this.app.workspace.getActiveFile();
				if (!activeFile) {
					new Notice('No file is open');
					return;
				}

				const folder = activeFile.parent;
				if (!folder) {
					new Notice('Current file is not in a folder');
					return;
				}

				let count = 0;
				for (const file of folder.children) {
					if (file instanceof TFile && this.isAcceptedFileType(file)) {
						// Skip files that already have frontmatter
						const content = await this.app.vault.read(file);
						if (content.startsWith('---')) {
							continue;
						}

						// Add frontmatter to the file
						const template = replaceTemplateVariables(this.settings.defaultTemplate, {
							title: file.basename,
							date: formatDate()
						});
						
						await this.app.vault.modify(file, template + '\n\n' + content);
						count++;
					}
				}

				new Notice(`Added frontmatter to ${count} files`);
			}
		});
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
	
	private addFrontmatterToFile(editor: Editor, file: TFile) {
		const content = editor.getValue();
		
		// Check if frontmatter already exists
		if (content.startsWith('---')) {
			new Notice('Frontmatter already exists in this file');
			return;
		}

		// Check if the file type is accepted
		if (!this.isAcceptedFileType(file)) {
			new Notice(`File type '${file.extension}' is not in the list of accepted file types`);
			return;
		}
		
		// Replace template variables
		const template = replaceTemplateVariables(this.settings.defaultTemplate, {
			title: file.basename,
			date: formatDate()
		});
		
		// Add frontmatter to the beginning of the file
		editor.setValue(template + '\n\n' + content);
		
		new Notice('Frontmatter added');
	}

	/**
	 * Check if a file's extension is in the list of accepted file types
	 */
	private isAcceptedFileType(file: TFile): boolean {
		return this.settings.acceptedFileTypes.includes(file.extension.toLowerCase());
	}
} 