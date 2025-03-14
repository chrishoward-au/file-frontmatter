import { App, Notice, TFile, TFolder, Vault } from 'obsidian';
import { FileFrontmatterSettings } from './types';
import { formatDate, replaceTemplateVariables } from './utils';
import { extractTextFromFile, generateTags, promptForManualTags } from './textProcessing';

/**
 * Creates a note alongside a PDF or other allowed file type
 * @param app The Obsidian App instance
 * @param file The file to create a note for
 * @param settings Plugin settings
 * @returns Promise that resolves when the note is created
 */
export async function createNoteForFile(
    app: App,
    file: TFile,
    settings: FileFrontmatterSettings
): Promise<void> {
    try {
        // Check if the file type is accepted
        if (!isAcceptedFileType(file, settings.acceptedFileTypes)) {
            new Notice(`File type '${file.extension}' is not in the list of accepted file types`);
            return;
        }

        // Get the parent folder
        const folder = file.parent;
        if (!folder) {
            new Notice('File is not in a folder');
            return;
        }

        // Create the note name (same as the file but with .md extension)
        const noteName = `${file.basename}.md`;
        const notePath = `${folder.path}/${noteName}`;

        // Check if the note already exists
        const existingNote = app.vault.getAbstractFileByPath(notePath);
        if (existingNote) {
            new Notice(`Note '${noteName}' already exists`);
            return;
        }

        // Create the note content with frontmatter and link to the original file
        const fileLink = app.metadataCache.fileToLinktext(file, '');
        const noteContent = await createNoteContent(file, fileLink, settings, app);

        // Create the note
        await app.vault.create(notePath, noteContent);
        
        new Notice(`Created note for ${file.basename}`);
        
        // Open the new note
        const newNote = app.vault.getAbstractFileByPath(notePath) as TFile;
        if (newNote) {
            await app.workspace.getLeaf().openFile(newNote);
        }
    } catch (error) {
        console.error('Error creating note:', error);
        new Notice(`Error creating note: ${error.message}`);
    }
}

/**
 * Check if a file's extension is in the list of accepted file types
 */
function isAcceptedFileType(file: TFile, acceptedFileTypes: string[]): boolean {
    return acceptedFileTypes.includes(file.extension.toLowerCase());
}

/**
 * Creates the content for the new note
 */
async function createNoteContent(file: TFile, fileLink: string, settings: FileFrontmatterSettings, app: App): Promise<string> {
    try {
        // Extract text from PDF
        console.log('Starting text extraction for file:', file.basename);
        const extractedText = await extractTextFromFile(app, file);
        console.log('Extracted text length:', extractedText?.length || 0);
        
        if (!extractedText) {
            new Notice('No text could be extracted from the file');
            throw new Error('No text could be extracted from the file');
        }

        // Check if text extraction is enabled
        console.log('Text extraction enabled:', settings.extractTextFromFiles);
        if (!settings.extractTextFromFiles) {
            return createBasicNoteContent(file, fileLink, settings);
        }

        // Generate tags if AI provider is configured
        console.log('AI Provider:', settings.aiProvider);
        let tags: string[] = [];
        
        const hasValidProvider = (settings.aiProvider === 'openai' && settings.openAIApiKey) ||
                               (settings.aiProvider === 'gemini' && settings.googleClientId && settings.googleClientSecret) ||
                               (settings.aiProvider === 'ollama');
        
        if (hasValidProvider) {
            try {
                tags = await generateTags(extractedText, settings, app);
                console.log('Generated tags:', tags);
            } catch (error) {
                if (error.message === 'Note creation cancelled') {
                    throw error;
                }
                // For other errors, we'll prompt for manual tags
                console.error('Error generating tags:', error);
                new Notice('Could not generate tags automatically. Would you like to enter them manually?');
                try {
                    tags = await promptForManualTags(app);
                } catch (e) {
                    throw new Error('Note creation cancelled');
                }
            }
        }
        
        // Take only the specified number of tags and format them properly
        const selectedTags = tags
            .slice(0, settings.maxTags)
            .map(tag => formatTag(tag));
        console.log('Selected tags:', selectedTags);

        // Replace template variables and add tags
        const templateVariables = {
            title: file.basename,
            date: formatDate(),
            tags: selectedTags.join(', ')
        };
        console.log('Template variables:', templateVariables);
        
        const frontmatter = replaceTemplateVariables(settings.defaultTemplate, templateVariables);
        console.log('Generated frontmatter:', frontmatter);
        
        // Create note content with or without extracted text based on settings
        let noteContent = `${frontmatter}\n\n## ${file.basename}\n\n![[${fileLink}]]`;
        
        // Only include extracted text if the setting is enabled
        if (settings.includeExtractedText) {
            noteContent += `\n\n## Extracted Text\n\n${extractedText}`;
        }
        
        return noteContent + '\n';
    } catch (error) {
        console.error('Error creating note content:', error);
        if (error.message === 'Note creation cancelled') {
            new Notice('Note creation cancelled');
        } else {
            new Notice(`Error creating note: ${error.message}`);
        }
        throw error;
    }
}

/**
 * Creates basic note content without text extraction or keyword generation
 */
function createBasicNoteContent(file: TFile, fileLink: string, settings: FileFrontmatterSettings): string {
    const frontmatter = replaceTemplateVariables(settings.defaultTemplate, {
        title: file.basename,
        date: formatDate(),
        tags: '' // Empty tags for basic content
    });
    
    return `${frontmatter}\n\n## ${file.basename}\n\n![[${fileLink}]]\n`;
}

/**
 * Format a tag to be valid in Obsidian
 * - Remove spaces (replace with hyphens)
 * - Remove quotes
 * - Convert to lowercase
 */
function formatTag(tag: string): string {
    return tag
        .toLowerCase()
        .replace(/"/g, '')
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-_]/g, ''); // Remove any other special characters
} 