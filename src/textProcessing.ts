import { App, Notice, TFile, requestUrl } from 'obsidian';
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

interface OpenAIResponse {
    choices: Array<{
        message: {
            content: string;
        };
    }>;
}

// Add delay function for rate limiting
function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export async function generateKeywords(text: string, apiKey: string, maxKeywords: number, prompt: string): Promise<string[]> {
    try {
        console.log('Generating keywords using OpenAI');
        console.log('API Key provided:', apiKey ? 'Yes' : 'No');
        
        // Prepare the prompt by replacing variables
        const finalPrompt = prompt.replace('{{max_keywords}}', maxKeywords.toString());
        
        const response = await requestUrl({
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
                        "content": `${finalPrompt}\n\nText: ${text.slice(0, 4000)}` // Limit text length to avoid token limits
                    }
                ],
                temperature: 0.3 // Lower temperature for more focused responses
            })
        });

        console.log('API Response status:', response.status);

        if (response.status === 429) {
            new Notice('OpenAI rate limit reached. Please wait a moment and try again.');
            // Add a delay before retrying
            await delay(2000);
            throw new Error('Rate limit reached. Please try again in a few moments.');
        }

        if (response.status !== 200) {
            let errorMessage = 'API request failed';
            try {
                const errorData = response.json;
                errorMessage = errorData.error?.message || `API error (${response.status})`;
            } catch (e) {
                errorMessage = `API error (${response.status})`;
            }
            new Notice(`OpenAI API error: ${errorMessage}`);
            throw new Error(errorMessage);
        }

        const data = response.json as OpenAIResponse;
        const tags = data.choices[0]?.message?.content?.split(',')
            .map(tag => tag.trim())
            .filter(tag => tag.length > 0) || [];
            
        console.log('Generated tags:', tags);
        return tags;
    } catch (error) {
        console.error('Error generating keywords:', error);
        if (!apiKey) {
            throw new Error('OpenAI API key is not set. Please add it in the plugin settings.');
        }
        // Make error messages more user-friendly
        const errorMessage = error.message.includes('Rate limit') 
            ? error.message 
            : 'Failed to generate tags. Please check your API key and try again.';
        new Notice(errorMessage);
        throw error;
    }
} 