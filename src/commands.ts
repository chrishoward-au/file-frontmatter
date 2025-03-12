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
        checkCallback: (checking: boolean) => {
            // Get the active file
            const activeFile = plugin.app.workspace.getActiveFile();
            
            // Ensure there is an active file and it's not already a markdown file
            const canRun = !!activeFile && 
                activeFile.extension !== 'md' && 
                settings.acceptedFileTypes.includes(activeFile.extension.toLowerCase());
            
            if (checking) {
                return canRun;
            }
            
            if (canRun) {
                handleCreateNoteCommand(plugin.app, activeFile, settings);
            } else if (!activeFile) {
                new Notice('No file is open');
            } else if (activeFile.extension === 'md') {
                new Notice('Cannot create a note for a markdown file');
            } else {
                new Notice(`File type '${activeFile.extension}' is not in the list of accepted file types`);
            }
            
            return canRun;
        }
    });
}

/**
 * Handles the create note command
 */
async function handleCreateNoteCommand(app: App, file: TFile, settings: FileFrontmatterSettings): Promise<void> {
    await createNoteForFile(app, file, settings);
} 