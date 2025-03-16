import { App, Notice, TFile } from 'obsidian';
import { FileFrontmatterSettings, TagCaseFormat } from './types';
import { formatTag, filterErroneousTags } from './utils';
import { generateOpenAITags } from './openAiApi';
import { generateOllamaTags } from './ollamaApi';
import { generateGeminiTags } from './geminiApi';
import { promptForManualTags } from './modals';

/**
 * Core tag generation service that handles AI provider selection and error handling
 * @param text Text content to generate tags from
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

/**
 * Process tags from any AI service with validation and retry logic
 * @param rawTags Initial tags from AI service
 * @param settings Plugin settings
 * @param retryFunction Function to call for retry attempt
 * @returns Processed and validated tags
 */
export async function processTagsWithRetry(
    rawTags: string[],
    settings: FileFrontmatterSettings,
    retryFunction: () => Promise<string[]>
): Promise<string[]> {
    
    // Check for erroneous tags
    let { validTags, hasErroneousTags } = filterErroneousTags(rawTags, settings.maxWordsPerTag);
    
    // If erroneous tags found, retry once
    if (hasErroneousTags) {
        console.log('Erroneous tags found, retrying...');
        
        // Retry using the provided retry function
        const retryTags = await retryFunction();
        console.log('Retry attempt tags:', retryTags);
        
        // Check again for erroneous tags
        const retryResult = filterErroneousTags(retryTags, settings.maxWordsPerTag);
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
}

/**
 * Create a more explicit prompt for retry attempts
 * @param maxTags Maximum number of tags
 * @param maxWordsPerTag Maximum words per tag
 * @returns A more explicit prompt
 */
export function createRetryPrompt(maxTags: number, maxWordsPerTag: number): string {
    return `Generate exactly ${maxTags} relevant tags for this text. 
    Each tag MUST have no more than ${maxWordsPerTag} word${maxWordsPerTag > 1 ? 's' : ''}.
    Return ONLY the tags as a comma-separated list (e.g., "tag1, tag2, tag3").
    Do not include explanations, hashes, or additional text.
    Do not concatenate tags with hyphens or other characters.
    Do not number the tags.`;
}

/**
 * Handles the process of generating tags for a markdown file
 * @param app The Obsidian App instance
 * @param file The markdown file
 * @param settings Plugin settings
 */
export async function handleMarkdownTagGeneration(app: App, file: TFile, settings: FileFrontmatterSettings): Promise<void> {
    try {
        // Read the file content
        const fileContent = await app.vault.read(file);
        
        // Generate tags - generateTags already handles loading notices
        const tags = await generateTags(fileContent, settings, app);
        
        if (tags && tags.length > 0) {
            // Update the file with the generated tags
            await updateFileWithTags(app, file, fileContent, tags, settings.tagCaseFormat);
        } else {
            new Notice('No tags were generated');
        }
    } catch (error) {
        console.error('Error handling markdown tag generation:', error);
        new Notice(`Error: ${error.message}`);
    }
}

/**
 * Updates a markdown file with generated tags
 * @param app The Obsidian App instance
 * @param file The file to update
 * @param fileContent The current content of the file
 * @param tags The tags to add
 * @param tagCaseFormat The format to apply to tags
 */
export async function updateFileWithTags(
    app: App, 
    file: TFile, 
    fileContent: string, 
    tags: string[], 
    tagCaseFormat: TagCaseFormat
): Promise<void> {
    // Format tags with the selected case format
    const formattedTags = tags
        .map(tag => formatTag(tag, tagCaseFormat))
        .map(tag => `"${tag}"`)
        .join(', ');
    
    // Check if file already has frontmatter
    let newContent: string;
    if (fileContent.startsWith('---\n')) {
        // File has frontmatter, update or add tags
        const frontmatterEnd = fileContent.indexOf('---\n', 4);
        if (frontmatterEnd !== -1) {
            const frontmatter = fileContent.substring(0, frontmatterEnd);
            const restOfContent = fileContent.substring(frontmatterEnd);
            
            if (frontmatter.includes('tags:')) {
                // Replace existing tags
                newContent = frontmatter.replace(/tags:.*(\r?\n)/i, `tags: [${formattedTags}]$1`) + restOfContent;
            } else {
                // Add tags before the end of frontmatter
                newContent = frontmatter + `tags: [${formattedTags}]\n` + restOfContent;
            }
        } else {
            // Malformed frontmatter, add new one
            newContent = `---\ntags: [${formattedTags}]\n---\n\n${fileContent}`;
        }
    } else {
        // No frontmatter, add new one
        newContent = `---\ntags: [${formattedTags}]\n---\n\n${fileContent}`;
    }
    
    // Save the updated content
    await app.vault.modify(file, newContent);
    new Notice(`Tags added to ${file.basename}`);
}

/**
 * Format a list of tags according to settings and prepare for inclusion in frontmatter
 * @param tags Raw tags to format
 * @param tagCaseFormat Format to apply to tags
 * @returns Formatted tags as a string ready for frontmatter
 */
export function formatTagsForFrontmatter(tags: string[], tagCaseFormat: TagCaseFormat): string {
    return tags
        .map(tag => formatTag(tag, tagCaseFormat))
        .map(tag => `"${tag}"`)
        .join(', ');
}

/**
 * Prepare tags in YAML list format for inclusion in frontmatter
 * @param tags Raw tags to format
 * @param tagCaseFormat Format to apply to tags
 * @returns Formatted tags in YAML list format
 */
export function formatTagsAsYamlList(tags: string[], tagCaseFormat: TagCaseFormat): string {
    return tags
        .map(tag => formatTag(tag, tagCaseFormat))
        .map(tag => `- ${tag}`)
        .join('\n');
} 