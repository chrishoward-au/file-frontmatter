import { App, Notice, TFile } from 'obsidian';
import { FileFrontmatterSettings, AIProvider } from './types';
import { generateOllamaTags } from './ollamaApi';
import { stripUrls, makeApiRequest, retryWithDelay, delay } from './utils';
import { processTagsWithRetry, createRetryPrompt } from './tagProcessing';
import { promptForManualTags } from './modals';

// extractTextFromFile function has been moved to fileHandler.ts

interface OpenAIResponse {
    choices: Array<{
        message: {
            content: string;
        };
    }>;
}

export async function generateTags(text: string, settings: FileFrontmatterSettings, app: App): Promise<string[]> {
    let loadingNotice: Notice | null = null;
    try {
        const provider = settings.aiProvider;
        console.log(`Generating tags using ${provider}`);
        
        // Show loading notification
        loadingNotice = new Notice(`Connecting to ${provider}... This may take up to 30 seconds`, 30000);
        
        // Prepare the prompt by replacing variables
        const finalPrompt = settings.aiPrompt
            .replace('{{max_tags}}', settings.maxTags.toString())
            .replace('{{max_words}}', settings.maxWordsPerTag.toString());
        
        let tags: string[] = [];
        
        // Generate tags based on the selected provider
        switch(provider) {
            case 'openai':
                if (!settings.openAIApiKey) {
                    throw new Error('OpenAI API key is not set');
                }
                tags = await generateOpenAITags(text, settings.openAIApiKey, settings.maxTags, finalPrompt, settings.maxWordsPerTag);
                break;
            case 'ollama':
                tags = await generateOllamaTags(text, settings);
                break;
            case 'gemini':
                // Placeholder for future Gemini implementation
                throw new Error('Gemini AI provider is not yet implemented');
            default:
                throw new Error(`Unknown AI provider: ${provider}`);
        }

        // Clear the loading notice on success
        if (loadingNotice) {
            loadingNotice.hide();
            loadingNotice = null;
        }

        // Show success notification
        new Notice('Tags generated successfully!', 3000);
        return tags;
    } catch (error) {
        // Clear the loading notice if it's still showing
        if (loadingNotice) {
            loadingNotice.hide();
            loadingNotice = null;
        }
        
        console.error('Error generating tags:', error);
        
        if (error.message.includes('429')) {
            new Notice('AI service rate limit reached. Would you like to enter tags manually?', 5000);
            try {
                const manualTags = await promptForManualTags(app);
                if (manualTags.length > 0) {
                    new Notice('Tags added manually!', 3000);
                }
                return manualTags;
            } catch (e) {
                throw new Error('Note creation cancelled');
            }
        }
        
        throw error;
    }
}

async function generateOpenAITags(
    text: string, 
    apiKey: string, 
    maxTags: number, 
    prompt: string,
    maxWordsPerTag: number
): Promise<string[]> {
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