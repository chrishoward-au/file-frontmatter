import { App, Modal, Notice, Setting, TFile } from 'obsidian';
import { FileFrontmatterSettings } from './types';
import { handleMarkdownTagGeneration } from './markdownHandler';

/**
 * Modal for entering tags manually
 */
export class ManualTagsModal extends Modal {
    tags: string = '';
    onSubmit: (result: string[]) => void;
    onCancel: () => void;

    constructor(app: App, onSubmit: (result: string[]) => void, onCancel: () => void) {
        super(app);
        this.onSubmit = onSubmit;
        this.onCancel = onCancel;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();

        contentEl.createEl('h2', { text: 'Enter Tags Manually' });
        contentEl.createEl('p', { text: 'Please enter tags separated by commas. Spaces will be replaced with hyphens.' });

        new Setting(contentEl)
            .setName('Tags')
            .addText(text => text
                .setPlaceholder('tag1, tag2, tag3')
                .onChange(value => {
                    this.tags = value;
                }));

        new Setting(contentEl)
            .addButton(btn => btn
                .setButtonText('Submit')
                .setCta()
                .onClick(() => {
                    const tagList = this.tags
                        .split(',')
                        .map(tag => tag.trim())
                        .filter(tag => tag.length > 0);
                    this.onSubmit(tagList);
                    this.close();
                }))
            .addButton(btn => btn
                .setButtonText('Cancel')
                .onClick(() => {
                    this.onCancel();
                    this.close();
                }));
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}

/**
 * Opens a modal to prompt for manual tags
 * @param app The Obsidian App instance
 * @returns Promise that resolves with the entered tags
 */
export async function promptForManualTags(app: App): Promise<string[]> {
    return new Promise((resolve, reject) => {
        new ManualTagsModal(app, resolve, reject).open();
    });
}

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