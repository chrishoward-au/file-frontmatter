import { App, TFile, requestUrl } from 'obsidian';
import { TextExtractorApi } from './types';

export async function extractTextFromFile(app: App, file: TFile): Promise<string | null> {
    // Get Text Extractor plugin API
    const textExtractor = (app as any).plugins?.plugins?.['text-extractor']?.api as TextExtractorApi | undefined;
    
    if (!textExtractor) {
        throw new Error('Text Extractor plugin is not installed or enabled');
    }

    if (!textExtractor.canFileBeExtracted(file.path)) {
        throw new Error('File cannot be processed by Text Extractor');
    }

    return await textExtractor.extractText(file);
}

interface KeywordResponse {
    keywords: string[];
}

export async function generateKeywords(text: string, apiKey: string): Promise<string[]> {
    try {
        const response = await requestUrl({
            url: 'https://api.cortical.io/nlp/keywords',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'api-key': apiKey
            },
            body: JSON.stringify({
                text,
                language: 'en'
            })
        });

        if (response.status !== 200) {
            throw new Error(`API request failed: ${response.status}`);
        }

        const data = response.json as KeywordResponse;
        return data.keywords || [];
    } catch (error) {
        console.error('Error generating keywords:', error);
        if (!apiKey) {
            throw new Error('Cortical.io API key is not set. Please add it in the plugin settings.');
        }
        throw error;
    }
} 