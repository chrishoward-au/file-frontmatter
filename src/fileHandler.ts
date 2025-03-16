import { App, Notice, TFile } from 'obsidian';
import { FileFrontmatterSettings, TextExtractorApi } from './types';
import { stripUrls } from './utils';

/**
 * Checks if the file type is supported
 * @param file The file to check
 * @param acceptedFileTypes List of accepted file extensions
 * @returns True if the file type is supported, false otherwise
 */
export function isFileTypeSupported(file: TFile, acceptedFileTypes: string[]): boolean {
    return acceptedFileTypes.includes(file.extension.toLowerCase());
}

/**
 * Checks if the Text Extractor plugin is available
 * @param app The Obsidian App instance
 * @returns True if the Text Extractor plugin is available, false otherwise
 */
export function isTextExtractorAvailable(app: App): boolean {
    return !!(app as any).plugins?.plugins?.['text-extractor']?.api;
}

/**
 * Extracts text from a file based on its type
 * @param app The Obsidian App instance
 * @param file The file to extract text from
 * @returns The extracted text or null if extraction failed
 */
export async function extractTextFromFile(app: App, file: TFile): Promise<string | null> {
    // For markdown files, read the content directly
    if (file.extension === 'md') {
        console.log('Reading markdown file content directly');
        const content = await app.vault.read(file);
        return stripUrls(content);
    }
    
    // For other file types, use the Text Extractor plugin
    // Get Text Extractor plugin API
    const textExtractor = (app as any).plugins?.plugins?.['text-extractor']?.api as TextExtractorApi | undefined;
    
    if (!textExtractor) {
        throw new Error('Text Extractor plugin is not installed or enabled. It is required for extracting text from non-markdown files.');
    }

    if (!textExtractor.canFileBeExtracted(file.path)) {
        throw new Error(`File type '${file.extension}' cannot be processed by Text Extractor.`);
    }

    // Extract text from file
    const extractedText = await textExtractor.extractText(file);
    
    // Strip URLs from the extracted text
    if (extractedText) {
        console.log('Stripping URLs from extracted text');
        return stripUrls(extractedText);
    }
    
    return extractedText;
}

/**
 * Validates the AI provider configuration
 * @param settings Plugin settings
 * @returns True if the AI provider is properly configured, false otherwise
 */
export function isAIProviderConfigured(settings: FileFrontmatterSettings): boolean {
    switch (settings.aiProvider) {
        case 'openai':
            return !!settings.openAIApiKey;
        case 'gemini':
            return !!settings.googleClientId && !!settings.googleClientSecret;
        case 'ollama':
            return true; // Ollama doesn't need API keys
        default:
            return false;
    }
}

/**
 * Handles file processing for non-markdown files
 * @param app The Obsidian App instance
 * @param file The file to process
 * @param settings Plugin settings
 */
export async function handleNonMarkdownFile(app: App, file: TFile, settings: FileFrontmatterSettings): Promise<void> {
    try {
        // Validate file type
        if (!isFileTypeSupported(file, settings.acceptedFileTypes)) {
            new Notice(`File type '${file.extension}' is not supported. Supported types: ${settings.acceptedFileTypes.join(', ')}`);
            return;
        }
        
        // Check if Text Extractor plugin is available
        if (!isTextExtractorAvailable(app)) {
            new Notice('Text Extractor plugin is not installed or enabled. It is required for extracting text from non-markdown files.');
            return;
        }
        
        // Create note for the file
        const { createNoteForFile } = await import('./fileOperations');
        await createNoteForFile(app, file, settings);
    } catch (error) {
        console.error('Error handling non-markdown file:', error);
        new Notice(`Error: ${error.message}`);
    }
} 