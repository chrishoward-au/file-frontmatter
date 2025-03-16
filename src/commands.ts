import { App, Notice, Plugin, TFile, Modal, Setting, Hotkey, Modifier } from 'obsidian';
import { createNoteForFile } from './fileOperations';
import { FileFrontmatterSettings } from './types';
import { generateTags } from './textProcessing';
import { formatTag } from './utils';

/**
 * Registers all plugin commands
 * @param plugin The plugin instance
 * @param settings The plugin settings
 */
export function registerCommands(plugin: Plugin, settings: FileFrontmatterSettings): void {
    // Command to create a note for the selected file
    plugin.addCommand({
        id: 'create-note-for-file',
        name: 'Create note for selected file',
        hotkeys: settings.hotkey ? [{ modifiers: getModifiers(settings.hotkey), key: getKey(settings.hotkey) }] : [],
        callback: () => {
            // Get the active file
            const activeFile = plugin.app.workspace.getActiveFile();
            
            // Check for API key or local provider
            const hasValidProvider = 
                (settings.aiProvider === 'openai' && settings.openAIApiKey) ||
                (settings.aiProvider === 'gemini' && settings.googleClientId && settings.googleClientSecret) ||
                (settings.aiProvider === 'ollama');
                
            if (!hasValidProvider) {
                new Notice(`Please configure your ${settings.aiProvider} settings`);
                return;
            }
            
            // Check file conditions
            if (!activeFile) {
                new Notice('Please open a PDF or other supported file first');
                return;
            }
            
            if (activeFile.extension === 'md') {
                // For markdown files, ask if the user wants to generate tags
                handleMarkdownFile(plugin.app, activeFile, settings);
                return;
            }
            
            if (!settings.acceptedFileTypes.includes(activeFile.extension.toLowerCase())) {
                new Notice(`File type '${activeFile.extension}' is not supported. Supported types: ${settings.acceptedFileTypes.join(', ')}`);
                return;
            }
            
            // Check if Text Extractor plugin is installed and active for non-markdown files
            const textExtractorPlugin = (plugin.app as any).plugins?.plugins?.['text-extractor'];
            if (!textExtractorPlugin) {
                new Notice('Text Extractor plugin is not installed or enabled. It is required for extracting text from non-markdown files.');
                return;
            }
            
            handleCreateNoteCommand(plugin.app, activeFile, settings);
        }
    });
}

/**
 * Handles the create note command
 */
async function handleCreateNoteCommand(app: App, file: TFile, settings: FileFrontmatterSettings): Promise<void> {
    await createNoteForFile(app, file, settings);
}

/**
 * Modal to confirm tag generation for markdown files
 */
class MarkdownTagsModal extends Modal {
    onYes: () => void;
    onNo: () => void;

    constructor(app: App, onYes: () => void, onNo: () => void) {
        super(app);
        this.onYes = onYes;
        this.onNo = onNo;
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
                    this.onYes();
                    this.close();
                }))
            .addButton(btn => btn
                .setButtonText('No')
                .onClick(() => {
                    this.onNo();
                    this.close();
                }));
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}

/**
 * Handles markdown files by asking if the user wants to generate tags
 */
function handleMarkdownFile(app: App, file: TFile, settings: FileFrontmatterSettings): void {
    new MarkdownTagsModal(
        app,
        // Yes callback
        async () => {
            try {
                // Read the file content
                const fileContent = await app.vault.read(file);
                
                // Generate tags
                const loadingNotice = new Notice(`Connecting to ${settings.aiProvider}... This may take up to 30 seconds`, 30000);
                
                try {
                    const tags = await generateTags(fileContent, settings, app);
                    loadingNotice.hide();
                    
                    if (tags && tags.length > 0) {
                        // Format tags with the selected case format
                        const formattedTags = tags
                            .map(tag => formatTag(tag, settings.tagCaseFormat))
                            .map(tag => `"${tag}"`)
                            .join(', ');
                        
                        // Check if file already has frontmatter
                        let newContent: string;
                        if (fileContent.startsWith('---\n')) {
                            // File has frontmatter, update or add tags
                            const frontmatterEnd = fileContent.indexOf('---\n', 4);
                            if (frontmatterEnd !== -1) {
                                const frontmatter = fileContent.substring(0, frontmatterEnd);
                                const restOfContent = fileContent.substring(frontmatterEnd);
                                
                                if (frontmatter.includes('tags:')) {
                                    // Replace existing tags
                                    newContent = frontmatter.replace(/tags:.*(\r?\n)/i, `tags: [${formattedTags}]$1`) + restOfContent;
                                } else {
                                    // Add tags before the end of frontmatter
                                    newContent = frontmatter + `tags: [${formattedTags}]\n` + restOfContent;
                                }
                            } else {
                                // Malformed frontmatter, add new one
                                newContent = `---\ntags: [${formattedTags}]\n---\n\n${fileContent}`;
                            }
                        } else {
                            // No frontmatter, add new one
                            newContent = `---\ntags: [${formattedTags}]\n---\n\n${fileContent}`;
                        }
                        
                        // Save the updated content
                        await app.vault.modify(file, newContent);
                        new Notice(`Tags added to ${file.basename}`);
                    } else {
                        new Notice('No tags were generated');
                    }
                } catch (error) {
                    loadingNotice.hide();
                    console.error('Error generating tags:', error);
                    new Notice(`Error generating tags: ${error.message}`);
                }
            } catch (error) {
                console.error('Error reading file:', error);
                new Notice(`Error reading file: ${error.message}`);
            }
        },
        // No callback
        () => {
            new Notice('Tag generation cancelled');
        }
    ).open();
}

/**
 * Extract modifiers from a hotkey string (e.g., "Ctrl+Shift+F" -> ["Mod", "Shift"])
 */
function getModifiers(hotkeyStr: string): Modifier[] {
    const modifiers: Modifier[] = [];
    const parts = hotkeyStr.split('+');
    
    // Map common modifier keys to Obsidian's expected format
    for (let i = 0; i < parts.length - 1; i++) {
        const mod = parts[i].trim().toLowerCase();
        if (mod === 'ctrl' || mod === 'cmd' || mod === 'command') {
            modifiers.push('Mod');
        } else if (mod === 'shift') {
            modifiers.push('Shift');
        } else if (mod === 'alt' || mod === 'option') {
            modifiers.push('Alt');
        } else if (mod === 'meta' || mod === 'win' || mod === 'windows') {
            modifiers.push('Meta');
        }
    }
    
    return modifiers;
}

/**
 * Extract the key from a hotkey string (e.g., "Ctrl+Shift+F" -> "F")
 */
function getKey(hotkeyStr: string): string {
    const parts = hotkeyStr.split('+');
    return parts[parts.length - 1].trim();
} 