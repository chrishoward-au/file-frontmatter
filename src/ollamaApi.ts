import { FileFrontmatterSettings } from './types';
import { makeApiRequest } from './utils';
import { createRetryPrompt } from './openAiApi';

interface OllamaResponse {
    response: string;
    model: string;
    created_at: string;
    done: boolean;
}

/**
 * Generate tags using Ollama API
 * @param text The text to generate tags from
 * @param settings Plugin settings with Ollama configuration
 * @returns Array of generated tags
 */
export async function generateOllamaTags(
    text: string, 
    settings: FileFrontmatterSettings
): Promise<string[]> {
    try {
        // Prepare the prompt by replacing variables
        const finalPrompt = settings.aiPrompt
            .replace('{{max_tags}}', settings.maxTags.toString())
            .replace('{{max_words}}', settings.maxWordsPerTag.toString());
        
        console.log('AI PROMPT', finalPrompt);

        // Get tags from Ollama
        return await makeOllamaRequest(settings.ollamaHost, settings.ollamaModel, finalPrompt, text);
    } catch (error) {
        console.error('Error generating tags with Ollama:', error);
        throw error;
    }
}

/**
 * Make a request to the Ollama API
 */
async function makeOllamaRequest(
    host: string,
    model: string,
    prompt: string,
    text: string
): Promise<string[]> {
    const response = await makeApiRequest({
        url: `${host}/api/generate`,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: model,
            prompt: `${prompt}\n\nText: ${text.slice(0, 4000)}`, // Limit text length
            stream: false,
            options: {
                temperature: 0.3
            }
        })
    }, 'Ollama');

    const data = response.json as OllamaResponse;
    
    // Parse the response to extract tags
    const tags = data.response
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0);
    
    return tags;
} 