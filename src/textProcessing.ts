import { App, Notice, TFile } from 'obsidian';
import { FileFrontmatterSettings, AIProvider } from './types';
import { generateOllamaTags } from './ollamaApi';
import { generateOpenAITags } from './openAiApi';
import { generateGeminiTags } from './geminiApi';
import { stripUrls } from './utils';
import { promptForManualTags } from './modals';

/**
 * Generates tags for text content using the configured AI provider
 * @param text Text content to generate tags for
 * @param settings Plugin settings
 * @param app Obsidian app instance
 * @returns Array of generated tags
 */
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
                tags = await generateGeminiTags(text, settings);
                break;
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