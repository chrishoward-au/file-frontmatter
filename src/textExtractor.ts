import { App, TFile } from 'obsidian';

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
 * Extracts text from a file using the Text Extractor plugin
 * @param app The Obsidian App instance
 * @param file The file to extract text from
 * @returns The extracted text or empty string if extraction failed
 */
export async function extractTextFromFile(app: App, file: TFile): Promise<string> {
  try {
    const textExtractor = getTextExtractor(app);
    
    if (!textExtractor) {
      console.warn('Text Extractor plugin is not available');
      return '';
    }
    
    if (!textExtractor.canFileBeExtracted(file.path)) {
      console.warn(`File type '${file.extension}' cannot be extracted`);
      return '';
    }
    
    const text = await textExtractor.extractText(file);
    return text || '';
  } catch (error) {
    console.error('Error extracting text:', error);
    return '';
  }
} 