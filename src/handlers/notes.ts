import { App, Notice, TFile } from 'obsidian';
import { TagFilesAndNotesSettings } from './types';
import { formatDate, isFileTypeSupported } from '../libs/utils';
import { generateTags, manageFrontmatterTags } from './tags';
import { extractTextFromFile, getTextExtractor } from './text';
import { promptForManualTags } from './modals';
import { isAIProviderConfigured } from './aiApis'

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
    settings: TagFilesAndNotesSettings
): Promise<void> {
    try {
        // Check if the file type is accepted
        if (!isFileTypeSupported(file, settings.acceptedFileTypes)) {
            new Notice(`File type '${file.extension}' is not supported. Supported types: ${settings.acceptedFileTypes.join(', ')}`);
            return;
        }

        // Check if Text Extractor plugin is available
        // This prevents file being created before text extraction.
        if (!getTextExtractor(app)) {
            new Notice('Text Extractor plugin is not installed or enabled. It is required for extracting text from non-markdown files.');
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
 * Creates the content for the new note
 */
async function createNoteContent(file: TFile, fileLink: string, settings: TagFilesAndNotesSettings, app: App): Promise<string> {
    try {
        // Extract text from PDF
        console.log('Starting text extraction for file:', file.basename);
        const extractedText = await extractTextFromFile(app, file);
        console.log('Extracted text length:', extractedText?.length || 0);

        if (!extractedText) {
            new Notice('No text could be extracted from the file');
            throw new Error('No text could be extracted from the file');
        }

        // Generate tags if AI provider is configured
        console.log('AI Provider:', settings.aiProvider);
        let tags: string[] = [];

        if (isAIProviderConfigured(settings)) {
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

        // Add file extension as an additional tag
        tags.push(file.extension);

        // Create base content without frontmatter
        let baseContent = `## ${file.basename}\n\n![[${fileLink}]]`;

        // Only include extracted text if the setting is enabled
        if (settings.includeExtractedText) {
            baseContent += `\n\n## Extracted Text\n\n${extractedText}`;
        }

        // Add template variables for the frontmatter
        const templateVars = {
            title: file.basename,
            date: formatDate()
        };

        // Apply frontmatter with tags and template
        return manageFrontmatterTags(
            baseContent,
            tags,
            settings.tagCaseFormat,
            'replace',  // Always use replace mode for new notes
            settings.defaultTemplate,
            templateVars
        );
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