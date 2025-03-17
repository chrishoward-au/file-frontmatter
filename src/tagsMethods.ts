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
        
        // Process to get valid tags with retry logic
        let proceed = false;
        let passes = 0;
        let validTags: string[] = [];
        
        while (!proceed) {
            // Generate tags based on the selected provider
            const rawTags = await generateTagsForProvider(provider, text, settings, finalPrompt);
            passes++;
            
            // Verify tag integrity
            const integrityResult = filterErroneousTags(rawTags, settings.maxWordsPerTag);
            validTags = integrityResult.validTags;
            
            // If tags pass integrity check or we've made 2 attempts, proceed
            proceed = !integrityResult.hasErroneousTags || passes >= 2;
            
            // If we're going to retry, log it
            if (!proceed) {
                console.log('Erroneous tags found, retrying...');
            } else if (integrityResult.hasErroneousTags) {
                // We're proceeding but found erroneous tags, notify user
                console.log('Still found erroneous tags after retry, using valid tags only');
                new Notice('Some tags were too long and have been skipped', 3000);
            }
        }
        
        // Limit to the maximum number of tags
        const finalTags = validTags.slice(0, settings.maxTags);
        console.log('Final tags:', finalTags);
        
        return finalTags;
    } catch (error) {
        console.error('Error generating tags:', error);
        throw error;
    } finally {
        // Clear the loading notice if it exists
        if (loadingNotice) {
            loadingNotice.hide();
        }
    }
}

/**
 * Helper function to generate tags based on the provider
 * @param provider The AI provider to use
 * @param text The text to generate tags from
 * @param settings Plugin settings
 * @param prompt The prompt to use
 * @returns Array of generated tags
 */
async function generateTagsForProvider(
    provider: string,
    text: string,
    settings: FileFrontmatterSettings,
    prompt: string
): Promise<string[]> {
    switch(provider) {
        case 'openai':
            if (!settings.openAIApiKey) {
                throw new Error('OpenAI API key is not set');
            }
            return await generateOpenAITags(text, settings.openAIApiKey, settings.maxTags, prompt, settings.maxWordsPerTag);
        case 'ollama':
            return await generateOllamaTags(text, settings);
        case 'gemini':
            return await generateGeminiTags(text, settings);
        default:
            throw new Error(`Unknown AI provider: ${provider}`);
    }
}

/**
 * Format a list of tags with consistent formatting
 * @param tags Array of tags to format
 * @param tagCaseFormat The format to apply to tags
 * @param prefix Optional prefix to add before each tag (e.g., '  - ')
 * @param wrapper Optional wrapper for each tag (e.g., '"')
 * @returns Array of formatted tag strings
 */
function formatTagsList(
    tags: string[], 
    tagCaseFormat: TagCaseFormat, 
    prefix: string = '', 
    wrapper: string = ''
): string[] {
    return tags.map(tag => {
        const formattedTag = formatTag(tag, tagCaseFormat);
        return `${prefix}${wrapper}${formattedTag}${wrapper}`;
    });
}

/**
 * Format tags for inclusion in frontmatter as a YAML list
 * @param tags Array of tags
 * @param tagCaseFormat The format to apply to tags
 * @returns Formatted tags as a YAML list
 */
export function formatTagsAsYamlList(tags: string[], tagCaseFormat: TagCaseFormat): string {
    return formatTagsList(tags, tagCaseFormat, '  - ', '"').join('\n');
}

/**
 * Format tags for frontmatter as an inline array
 * @param tags Array of tags
 * @param tagCaseFormat The format to apply to tags
 * @returns Formatted tags as a string for inline array
 */
export function formatTagsForFrontmatter(tags: string[], tagCaseFormat: TagCaseFormat): string {
    return formatTagsList(tags, tagCaseFormat, '', '"').join(', ');
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
    const formattedTags = formatTagsForFrontmatter(tags, tagCaseFormat);
    
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