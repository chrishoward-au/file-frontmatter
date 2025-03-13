import { App, Notice, TFile, TFolder, Vault } from 'obsidian';
import { FileFrontmatterSettings } from './types';
import { formatDate, replaceTemplateVariables } from './utils';
import { extractTextFromFile, generateKeywords } from './textProcessing';

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
        const extractedText = await extractTextFromFile(app, file);
        
        if (!extractedText) {
            throw new Error('No text could be extracted from the file');
        }

        // Check if text extraction is enabled
        if (!settings.extractTextFromFiles) {
            return createBasicNoteContent(file, fileLink, settings);
        }

        // Generate keywords if API key is set
        let keywords: string[] = [];
        if (settings.corticalApiKey) {
            keywords = await generateKeywords(extractedText, settings.corticalApiKey);
        }
        
        // Take only the specified number of keywords
        const selectedKeywords = keywords.slice(0, settings.maxKeywords);

        // Replace template variables and add keywords as tags
        const frontmatter = replaceTemplateVariables(settings.defaultTemplate, {
            title: file.basename,
            date: formatDate(),
            tags: selectedKeywords.map(k => `"${k}"`).join(', ')
        });
        
        // Add extracted text and link to the original file
        return `${frontmatter}\n\n## ${file.basename}\n\n![[${fileLink}]]\n\n## Extracted Text\n\n${extractedText}\n`;
    } catch (error) {
        console.error('Error creating note content:', error);
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
        tags: ''
    });
    
    return `${frontmatter}\n\n## ${file.basename}\n\n![[${fileLink}]]\n`;
} 