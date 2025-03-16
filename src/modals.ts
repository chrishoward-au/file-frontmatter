import { App, Modal, Notice, Setting } from 'obsidian';
import { FileFrontmatterSettings } from './types';
import { handleMarkdownTagGeneration } from './markdownHandler';

/**
 * Modal to confirm tag generation for markdown files
 */
export class MarkdownTagsModal extends Modal {
    private file: any;
    private settings: FileFrontmatterSettings;
    
    constructor(app: App, file: any, settings: FileFrontmatterSettings) {
        super(app);
        this.file = file;
        this.settings = settings;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();

        contentEl.createEl('h2', { text: 'Generate Tags' });
        contentEl.createEl('p', { text: 'Would you like to generate tags for this markdown file?' });

        new Setting(contentEl)
            .addButton(btn => btn
                .setButtonText('Yes')
                .setCta()
                .onClick(() => {
                    this.close();
                    handleMarkdownTagGeneration(this.app, this.file, this.settings);
                }))
            .addButton(btn => btn
                .setButtonText('No')
                .onClick(() => {
                    this.close();
                    new Notice('Tag generation cancelled');
                }));
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}

/**
 * Opens a modal to ask if the user wants to generate tags for a markdown file
 * @param app The Obsidian App instance
 * @param file The markdown file
 * @param settings Plugin settings
 */
export function openMarkdownTagsModal(app: App, file: any, settings: FileFrontmatterSettings): void {
    new MarkdownTagsModal(app, file, settings).open();
} 