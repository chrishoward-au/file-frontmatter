import { Notice, requestUrl } from 'obsidian';
import { FileFrontmatterSettings } from './types';
import { filterErroneousTags } from './utils';

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
        let tags = await makeOllamaRequest(settings.ollamaHost, settings.ollamaModel, finalPrompt, text);
        console.log('First attempt tags:', tags);
        
        // Check for erroneous tags
        let { validTags, hasErroneousTags } = filterErroneousTags(tags, settings.maxWordsPerTag);
        
        // If erroneous tags found, retry once
        if (hasErroneousTags) {
            console.log('Erroneous tags found, retrying...');
            
            // Create a more explicit prompt for the retry
            const retryPrompt = 
                `Generate exactly ${settings.maxTags} relevant tags for this text. 
                Each tag MUST have no more than ${settings.maxWordsPerTag} word${settings.maxWordsPerTag > 1 ? 's' : ''}.
                Return ONLY the tags as a comma-separated list (e.g., "tag1, tag2, tag3").
                Do not include explanations, hashes, or additional text.
                Do not concatenate tags with hyphens or other characters.
                Do not number the tags.`;
            
            // Retry
            tags = await makeOllamaRequest(settings.ollamaHost, settings.ollamaModel, retryPrompt, text);
            console.log('Retry attempt tags:', tags);
            
            // Check again for erroneous tags
            const retryResult = filterErroneousTags(tags, settings.maxWordsPerTag);
            validTags = retryResult.validTags;
            
            // If still has erroneous tags, notify user
            if (retryResult.hasErroneousTags) {
                console.log('Still found erroneous tags after retry, using valid tags only');
                new Notice('Some tags were too long and have been skipped', 3000);
            }
        }
        
        // Limit to the maximum number of tags
        const finalTags = validTags.slice(0, settings.maxTags);
        console.log('Final tags:', finalTags);
        
        return finalTags;
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

    console.log('response', response);

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
} 