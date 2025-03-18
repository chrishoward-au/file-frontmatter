import { App, TFile } from 'obsidian';
import { stripUrls, stripFrontmatter } from '../libs/utils';


/**
 * Type definition for the Text Extractor API
 */
export type TextExtractorApi = {
  extractText: (file: TFile) => Promise<string>
  canFileBeExtracted: (filePath: string) => boolean
  isInCache: (file: TFile) => Promise<boolean>
}

/**
 * Gets the Text Extractor API if available
 * @param app The Obsidian App instance
 * @returns The Text Extractor API or undefined if not available
 */
export function getTextExtractor(app: App): TextExtractorApi | undefined {
  return (app as any).plugins?.plugins?.['text-extractor']?.api;
}



/**
 * Extracts text from a file based on its type
 * @param app The Obsidian App instance
 * @param file The file to extract text from
 * @returns The extracted text or null if extraction failed
 */
export async function extractTextFromFile(app: App, file: TFile): Promise<string | null> {

  let extractedText = '';

  // For markdown files, read the content directly
  if (file.extension === 'md') {
      console.log('Reading markdown file content directly');
      extractedText= await app.vault.read(file);
  } else {

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
      extractedText = await textExtractor.extractText(file);

  }
  
  extractedText = stripUrls(extractedText);
  extractedText = stripFrontmatter(extractedText);

  return extractedText;
}