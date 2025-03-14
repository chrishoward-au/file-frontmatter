import { App, Notice, Plugin, TFile } from 'obsidian';
import { createNoteForFile } from './fileOperations';
import { FileFrontmatterSettings } from './types';

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
                new Notice('Cannot create a note for a markdown file');
                return;
            }
            
            if (!settings.acceptedFileTypes.includes(activeFile.extension.toLowerCase())) {
                new Notice(`File type '${activeFile.extension}' is not supported. Supported types: ${settings.acceptedFileTypes.join(', ')}`);
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