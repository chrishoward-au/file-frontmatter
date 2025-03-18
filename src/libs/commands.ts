import { App, Notice, Plugin, TFile } from 'obsidian';
import { TagFilesAndNotesSettings } from '../handlers/types';
import { openMarkdownTagsModal } from '../handlers/modals';
import {isAIProviderConfigured} from '../handlers/aiApis'
import {isFileTypeSupported} from './utils'
import {createNoteForFile} from '../handlers/notes'

/**
 * Registers all plugin commands
 * @param plugin The plugin instance
 * @param settings The plugin settings
 */
export function registerCommands(plugin: Plugin, settings: TagFilesAndNotesSettings): void {
    // Command to create a note for the selected file
    plugin.addCommand({
        id: 'create-note-for-file',
        name: 'Create note for selected file',
        callback: () => {
            // Get the active file
            const activeFile = plugin.app.workspace.getActiveFile();
            
            // Validate prerequisites
            if (!validatePrerequisites(plugin.app, activeFile, settings)) {
                return;
            }
            
            // At this point, activeFile is guaranteed to be non-null
            // because validatePrerequisites would have returned false otherwise
            const file = activeFile as TFile; // Type assertion
            
            // Handle the file based on its type
            if (file.extension === 'md') {
                // For markdown files, ask if the user wants to generate tags
                openMarkdownTagsModal(plugin.app, file, settings);
            } else {
                // For other file types, create a note
                createNoteForFile(plugin.app, file, settings);
            }
        }
    });
}

/**
 * Validates prerequisites for command execution
 * @param app The Obsidian App instance
 * @param file The active file
 * @param settings Plugin settings
 * @returns True if prerequisites are met, false otherwise
 */
function validatePrerequisites(app: App, file: TFile | null, settings: TagFilesAndNotesSettings): boolean {
    // Check for AI provider configuration
    if (!isAIProviderConfigured(settings)) {
        new Notice(`Please configure your ${settings.aiProvider} settings`);
        return false;
    }
    
    // Check if a file is open
    if (!file) {
        new Notice('Please open a PDF or other supported file first');
        return false;
    }
    
    // For non-markdown files, check if the file type is supported
    if (file.extension !== 'md' && !isFileTypeSupported(file, settings.acceptedFileTypes)) {
        new Notice(`File type '${file.extension}' is not supported. Supported types: ${settings.acceptedFileTypes.join(', ')}`);
        return false;
    }
    
    return true;
} 