import { requestUrl } from 'obsidian';
import { FileFrontmatterSettings } from './types';

interface OllamaResponse {
    response: string;
    model: string;
    created_at: string;
    done: boolean;
}

export async function generateOllamaTags(
    text: string, 
    settings: FileFrontmatterSettings
): Promise<string[]> {
    try {
        console.log('Generating tags using Ollama');
        console.log('Ollama host:', settings.ollamaHost);
        console.log('Ollama model:', settings.ollamaModel);
        
        // Prepare the prompt by replacing variables
        const finalPrompt = settings.aiPrompt
            .replace('{{max_tags}}', settings.maxTags.toString())
            .replace('{{max_words}}', settings.maxWordsPerTag.toString());
        
        // Make request to Ollama API
        const response = await requestUrl({
            url: `${settings.ollamaHost}/api/generate`,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: settings.ollamaModel,
                prompt: `${finalPrompt}\n\nText: ${text.slice(0, 4000)}`, // Limit text length
                stream: false,
                options: {
                    temperature: 0.3
                }
            })
        });

        if (response.status !== 200) {
            throw new Error(`Ollama API error: ${response.status}`);
        }

        const data = response.json as OllamaResponse;
        
        // Parse the response to extract tags
        const tags = data.response
            .split(',')
            .map(tag => tag.trim())
            .filter(tag => tag.length > 0);
            
        console.log('Generated tags from Ollama:', tags);
        
        return tags;
    } catch (error) {
        console.error('Error generating tags with Ollama:', error);
        throw error;
    }
} 