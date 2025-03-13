import { App, Notice, TFile, requestUrl, Modal, Setting } from 'obsidian';
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

class ManualTagsModal extends Modal {
    tags: string = '';
    onSubmit: (result: string[]) => void;
    onCancel: () => void;

    constructor(app: App, onSubmit: (result: string[]) => void, onCancel: () => void) {
        super(app);
        this.onSubmit = onSubmit;
        this.onCancel = onCancel;
    }

    onOpen() {
        const { contentEl } = this;
        contentEl.empty();

        contentEl.createEl('h2', { text: 'Enter Tags Manually' });
        contentEl.createEl('p', { text: 'Please enter tags separated by commas' });

        new Setting(contentEl)
            .setName('Tags')
            .addText(text => text
                .setPlaceholder('tag1, tag2, tag3')
                .onChange(value => {
                    this.tags = value;
                }));

        new Setting(contentEl)
            .addButton(btn => btn
                .setButtonText('Submit')
                .setCta()
                .onClick(() => {
                    const tagList = this.tags
                        .split(',')
                        .map(tag => tag.trim())
                        .filter(tag => tag.length > 0);
                    this.onSubmit(tagList);
                    this.close();
                }))
            .addButton(btn => btn
                .setButtonText('Cancel')
                .onClick(() => {
                    this.onCancel();
                    this.close();
                }));
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}

export async function promptForManualTags(app: App): Promise<string[]> {
    return new Promise((resolve, reject) => {
        new ManualTagsModal(app, resolve, reject).open();
    });
}

async function retryWithDelay<T>(
    fn: () => Promise<T>,
    retries: number = 3,
    delay: number = 2000
): Promise<T> {
    try {
        return await fn();
    } catch (error) {
        if (retries > 0 && error.message.includes('429')) {
            await new Promise(resolve => setTimeout(resolve, delay));
            return retryWithDelay(fn, retries - 1, delay * 2);
        }
        throw error;
    }
}

export async function generateKeywords(text: string, apiKey: string, maxKeywords: number, prompt: string, app: App): Promise<string[]> {
    try {
        console.log('Generating keywords using OpenAI');
        console.log('API Key provided:', apiKey ? 'Yes' : 'No');
        
        // Prepare the prompt by replacing variables
        const finalPrompt = prompt.replace('{{max_keywords}}', maxKeywords.toString());
        
        const makeRequest = async () => {
            const response = await requestUrl({
                url: 'https://api.openai.com/v1/chat/completions',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`,
                    'OpenAI-Beta': 'assistants=v1'
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

            if (response.status !== 200) {
                let errorMessage = 'API request failed';
                try {
                    const errorData = response.json;
                    errorMessage = errorData.error?.message || `API error (${response.status})`;
                } catch (e) {
                    errorMessage = `API error (${response.status})`;
                }
                throw new Error(errorMessage);
            }

            return response;
        };

        try {
            const response = await retryWithDelay(makeRequest);
            const data = response.json as OpenAIResponse;
            const tags = data.choices[0]?.message?.content?.split(',')
                .map(tag => tag.trim())
                .filter(tag => tag.length > 0) || [];
                
            console.log('Generated tags:', tags);
            return tags;
        } catch (error) {
            if (error.message.includes('429')) {
                new Notice('OpenAI rate limit reached. Would you like to enter tags manually?');
                try {
                    return await promptForManualTags(app);
                } catch (e) {
                    throw new Error('Note creation cancelled');
                }
            }
            throw error;
        }
    } catch (error) {
        console.error('Error generating keywords:', error);
        if (!apiKey) {
            throw new Error('OpenAI API key is not set. Please add it in the plugin settings.');
        }
        throw error;
    }
} 