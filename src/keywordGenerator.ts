import { requestUrl } from 'obsidian';
import { FileFrontmatterSettings } from './types';

/**
 * A keyword with its relevance score
 */
export interface Keyword {
  term: string;
  score: number;
}

/**
 * Generates keywords from text using the Cortical.io API
 * @param text The text to generate keywords from
 * @param settings Plugin settings
 * @returns An array of keywords or empty array if generation failed
 */
export async function generateKeywords(
  text: string, 
  settings: FileFrontmatterSettings
): Promise<string[]> {
  try {
    if (!text || text.trim().length === 0) {
      console.warn('No text provided for keyword generation');
      return [];
    }

    // Truncate text if it's too long (API might have limits)
    const truncatedText = text.length > 10000 ? text.substring(0, 10000) : text;

    // Make a request to the Cortical.io API
    const response = await requestUrl({
      url: 'https://api.cortical.io/rest/text/keywords',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': settings.corticalApiKey || '',
      },
      body: JSON.stringify({
        text: truncatedText,
        maxKeywords: settings.maxKeywords || 10
      }),
    });

    if (response.status !== 200) {
      console.error('Error from Cortical.io API:', response.text);
      return [];
    }

    // Parse the response
    const keywords = JSON.parse(response.text) as Keyword[];
    
    // Extract terms and filter out any empty terms
    return keywords
      .map(keyword => keyword.term)
      .filter(term => term && term.trim().length > 0);
  } catch (error) {
    console.error('Error generating keywords:', error);
    return [];
  }
} 