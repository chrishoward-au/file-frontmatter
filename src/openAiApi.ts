import { FileFrontmatterSettings } from './types';
import { makeApiRequest, retryWithDelay } from './utils';
import { processTagsWithRetry, createRetryPrompt } from './tagProcessing';

interface OpenAIResponse {
    choices: Array<{
        message: {
            content: string;
        };
    }>;
}

/**
 * Generate tags using OpenAI API
 * @param text The text to generate tags from
 * @param settings Plugin settings
 * @returns Array of generated tags
 */
export async function generateOpenAITags(
    text: string, 
    apiKey: string,
    maxTags: number,
    prompt: string,
    maxWordsPerTag: number
): Promise<string[]> {
    try {
        console.log('Generating tags using OpenAI');
        
        // First attempt
        const rawTags = await makeOpenAIRequest(text, apiKey, prompt);
        
        // Process tags with retry logic
        return await processTagsWithRetry(
            rawTags,
            { maxTags, maxWordsPerTag } as FileFrontmatterSettings,
            // Retry function
            async () => {
                const retryPrompt = createRetryPrompt(maxTags, maxWordsPerTag);
                return await makeOpenAIRequest(text, apiKey, retryPrompt);
            }
        );
    } catch (error) {
        console.error('Error generating tags with OpenAI:', error);
        throw error;
    }
}

/**
 * Make a request to the OpenAI API
 */
async function makeOpenAIRequest(
    text: string,
    apiKey: string,
    prompt: string
): Promise<string[]> {
    const makeRequest = async () => {
        return await makeApiRequest({
            url: 'https://api.openai.com/v1/chat/completions',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: "gpt-3.5-turbo",
                messages: [
                    {
                        "role": "system",
                        "content": "You are a helpful assistant that generates tags for documents. Return only the tags as requested, no other text."
                    },
                    {
                        "role": "user",
                        "content": `${prompt}\n\nText: ${text.slice(0, 4000)}` // Limit text length to avoid token limits
                    }
                ],
                temperature: 0.3 // Lower temperature for more focused responses
            })
        }, 'OpenAI');
    };

    const response = await retryWithDelay(makeRequest, 2, 5000);
    const data = response.json as OpenAIResponse;
    
    return data.choices[0]?.message?.content?.split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0) || [];
} 