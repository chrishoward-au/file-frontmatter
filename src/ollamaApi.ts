import { requestUrl } from 'obsidian';
import { FileFrontmatterSettings } from './types';
import { processTagsWithRetry, createRetryPrompt } from './tagProcessing';

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
        
        console.log('AI PROMPT', finalPrompt);

        // First attempt
        const rawTags = await makeOllamaRequest(settings.ollamaHost, settings.ollamaModel, finalPrompt, text);
        
        // Process tags with retry logic
        return await processTagsWithRetry(
            rawTags,
            settings,
            // Retry function
            async () => {
                const retryPrompt = createRetryPrompt(settings.maxTags, settings.maxWordsPerTag);
                return await makeOllamaRequest(settings.ollamaHost, settings.ollamaModel, retryPrompt, text);
            }
        );
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
    const response = await requestUrl({
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
    
    return tags;
} 