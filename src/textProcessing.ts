import { App, Notice, TFile, requestUrl, Modal, Setting } from 'obsidian';
import { TextExtractorApi, FileFrontmatterSettings } from './types';
import { generateOllamaTags } from './ollamaApi';

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
        contentEl.createEl('p', { text: 'Please enter tags separated by commas. Spaces will be replaced with hyphens.' });

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
    retries: number = 2,
    initialDelay: number = 5000
): Promise<T> {
    let lastError: Error | null = null;
    let currentDelay = initialDelay;

    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            if (attempt > 0) {
                console.log(`Retry attempt ${attempt} of ${retries}, waiting ${currentDelay}ms...`);
                await delay(currentDelay);
                // Show retry notification
                new Notice(`Retrying connection to OpenAI (${attempt}/${retries})...`, 3000);
                currentDelay *= 2; // Double the delay for each retry
            }
            return await fn();
        } catch (error) {
            lastError = error;
            if (!error.message.includes('429')) {
                throw error; // If it's not a rate limit error, throw immediately
            }
            if (attempt === retries) {
                console.log('All retry attempts failed');
                throw error;
            }
        }
    }
    throw lastError!; // We know it's not null here because we would have thrown earlier if no error occurred
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
        
        if (provider === 'openai') {
            if (!settings.openAIApiKey) {
                throw new Error('OpenAI API key is not set');
            }
            
            tags = await generateOpenAITags(text, settings.openAIApiKey, settings.maxTags, finalPrompt);
        } else if (provider === 'ollama') {
            tags = await generateOllamaTags(text, settings);
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

async function generateOpenAITags(text: string, apiKey: string, maxTags: number, prompt: string): Promise<string[]> {
    const makeRequest = async () => {
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
                        "content": `${prompt}\n\nText: ${text.slice(0, 4000)}` // Limit text length to avoid token limits
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

    const response = await retryWithDelay(makeRequest, 2, 5000);
    const data = response.json as OpenAIResponse;
    return data.choices[0]?.message?.content?.split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0) || [];
} 