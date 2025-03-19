import { TagFilesAndNotesSettings } from './types';
import { requestUrl, RequestUrlParam, RequestUrlResponse, Notice } from 'obsidian';
import { retryWithDelay} from '../libs/utils'


interface ollamaAiResponse {
    response: string;
    model: string;
    created_at: string;
    done: boolean;
}

interface OpenAIResponse {
    choices: Array<{
        message: {
            content: string;
        };
    }>;
}


/**
 * Common function to make API requests with proper error handling
 * @param requestParams Request parameters for requestUrl
 * @param errorPrefix Prefix for error messages
 * @returns The response from the API
 */
export async function makeApiRequest(
    requestParams: RequestUrlParam,
    errorPrefix: string = 'API'
): Promise<RequestUrlResponse> {
    try {
        const response = await requestUrl(requestParams);

        if (response.status !== 200) {
            let errorMessage = `${errorPrefix} request failed`;
            try {
                const errorData = response.json;
                errorMessage = errorData.error?.message || `${errorPrefix} error (${response.status})`;
            } catch (e) {
                errorMessage = `${errorPrefix} error (${response.status})`;
            }
            throw new Error(errorMessage);
        }

        return response;
    } catch (error) {
        // Enhance error with rate limiting information if applicable
        if (error.message.includes('429')) {
            error.message = `${errorPrefix} rate limit exceeded. Please try again later.`;
        }
        throw error;
    }
}


/**
 * Validates the AI provider configuration
 * @param settings Plugin settings
 * @returns True if the AI provider is properly configured, false otherwise
 */
export function isAIProviderConfigured(settings: TagFilesAndNotesSettings): boolean {
    switch (settings.aiProvider) {
        case 'openai':
            return !!settings.openAIApiKey;
        case 'gemini':
            return !!settings.googleClientId && !!settings.googleClientSecret;
        case 'ollama':
            return true; // Ollama doesn't need API keys
        case 'mistral':
            return !!settings.mistralAiApiKey;
        default:
            return false;
    }
}

/**
 * Generate tags using specified AI
 * @param text The text to generate tags from
 * @param settings Plugin settings with Ollama configuration
 * @returns Array of generated tags
 */
export async function getTagsFromAI(
    text: string,
    settings: TagFilesAndNotesSettings,
): Promise<string[]> {
    try {
        // Prepare the prompt by replacing variables
        const finalPrompt = settings.aiPrompt
            .replace('{{max_tags}}', settings.maxTags.toString())
            .replace('{{max_words}}', settings.maxWordsPerTag.toString());

        console.log('AI PROMPT', finalPrompt);

        // Get tags from Ollama
        switch (settings.aiProvider){
            case 'ollama':
                return await makeOllamaAiRequest(settings.aiProvider, settings.ollamaHost, settings.ollamaModel, finalPrompt, text);
            case 'openai':
                return await makeOpenAiRequest(settings.aiProvider,settings.openAIApiKey,finalPrompt, text)

        }
    } catch (error) {
        console.error('Error generating tags with ' + settings.aiProvider, error);
        throw error;
    }
    return [];
}


/**
 * Make a request to the Ollama AI
 */
async function makeOllamaAiRequest(
    provider: string,
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
    }, provider);

    const data = response.json as ollamaAiResponse;
    console.log(response);
    console.log('Data from '+provider, data);

    // Parse the response to extract tags
    const tags = data.response
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0);

    return tags;
}


/**
 * Make a request to the OpenAI API
 */
async function makeOpenAiRequest(
    provider: string,
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
        }, provider);
    };

    const response = await retryWithDelay(makeRequest, 2, 5000);
    const data = response.json as OpenAIResponse;
    
    return data.choices[0]?.message?.content?.split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0) || [];
} 
