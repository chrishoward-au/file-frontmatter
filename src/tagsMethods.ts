import { App, Notice, TFile } from 'obsidian';
import { FileFrontmatterSettings, TagCaseFormat } from './types';
import { formatTag, filterErroneousTags, replaceTemplateVariables } from './utils';
import { generateOpenAITags } from './openAiApi';
import { generateOllamaTags } from './ollamaApi';
import { generateGeminiTags } from './geminiApi';
import { promptForManualTags } from './modals';

/**
 * Strip frontmatter from content to avoid confusing the AI
 * @param content The content to strip frontmatter from
 * @returns The content without frontmatter
 */
function stripFrontmatter(content: string): string {
    if (content.startsWith('---\n')) {
        const frontmatterEnd = content.indexOf('---\n', 4);
        if (frontmatterEnd !== -1) {
            return content.substring(frontmatterEnd + 4).trim();
        }
    }
    return content;
}

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

        // Strip frontmatter to prevent AI from just returning existing tags
        const cleanText = stripFrontmatter(text);
        console.log('Stripping frontmatter before sending to AI');

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
            const rawTags = await generateTagsForProvider(provider, cleanText, settings, finalPrompt);
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
    switch (provider) {
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
    return formatTagsList(tags, tagCaseFormat, '- ', '').join('\n');
}

/**
 * Extract tags from frontmatter content
 * @param frontmatter The frontmatter content
 * @returns Array of extracted tags
 */
function extractExistingTags(frontmatter: string): string[] {
    const tags: string[] = [];
    
    // Try to match YAML list format first (most common)
    // Format: tags:\n- tag1\n- tag2
    const yamlListMatch = frontmatter.match(/tags:\s*\n((?:\s*-\s*["']?(.*?)["']?\s*\n)+)/i);
    if (yamlListMatch && yamlListMatch[1]) {
        const yamlListContent = yamlListMatch[1];
        // Use a regular for loop instead of matchAll which requires ES2018+
        const regex = /\s*-\s*["']?(.*?)["']?\s*\n/gi;
        let match;
        while ((match = regex.exec(yamlListContent)) !== null) {
            if (match[1]) {
                tags.push(match[1].trim());
            }
        }
        return tags;
    }
    
    // Try to match inline array format
    // Format: tags: [tag1, tag2]
    const inlineArrayMatch = frontmatter.match(/tags:\s*\[(.*?)\]/i);
    if (inlineArrayMatch && inlineArrayMatch[1]) {
        const inlineTags = inlineArrayMatch[1].split(',');
        for (const tag of inlineTags) {
            // Remove quotes and trim
            const cleanTag = tag.replace(/["']/g, '').trim();
            if (cleanTag) {
                tags.push(cleanTag);
            }
        }
        return tags;
    }
    
    // Try to match single tag format
    // Format: tags: tag1
    const singleTagMatch = frontmatter.match(/tags:\s*(.*?)(?:\n|$)/i);
    if (singleTagMatch && singleTagMatch[1]) {
        const singleTag = singleTagMatch[1].trim();
        if (singleTag && singleTag !== "[]") {
            tags.push(singleTag.replace(/["']/g, ''));
        }
    }
    
    return tags;
}

/**
 * Centralized function to manage frontmatter tags in Obsidian notes
 * @param content Current content of an existing file or base content for a new file
 * @param tags Tags to add to the file
 * @param tagCaseFormat Format to apply to tags
 * @param mode How to handle existing tags: 'append' or 'replace'
 * @param templateStr Optional template string to use for new frontmatter
 * @param templateVars Optional additional template variables
 * @returns The updated content with frontmatter including tags
 */
export function manageFrontmatterTags(
    content: string,
    tags: string[],
    tagCaseFormat: TagCaseFormat,
    mode: 'append' | 'replace' = 'replace',
    templateStr?: string,
    templateVars?: Record<string, string>
): string {
    // Check if content already has frontmatter
    if (content.startsWith('---\n')) {
        // Content has frontmatter, update or add tags
        const frontmatterEnd = content.indexOf('---\n', 4);
        if (frontmatterEnd !== -1) {
            const frontmatter = content.substring(0, frontmatterEnd);
            const restOfContent = content.substring(frontmatterEnd);

            if (frontmatter.includes('tags:')) {
                // Handle based on mode (append or replace)
                console.log(mode);
                if (mode === 'append') {
                    // Extract existing tags
                    const existingTags = extractExistingTags(frontmatter);
                    console.log('Existing tags:', existingTags);
                    
                    // Filter out tags that already exist (case insensitive)
                    const newTags = tags.filter(tag => {
                        const formattedTag = formatTag(tag, tagCaseFormat);
                        return !existingTags.some(existingTag => 
                            existingTag.toLowerCase() === formattedTag.toLowerCase()
                        );
                    });
                    console.log('New tags to add:', newTags);
                    
                    // Combine existing and new tags
                    const combinedTags = [...existingTags, ...newTags];
                    
                    // Format the combined tags
                    const formattedTagsList = formatTagsAsYamlList(combinedTags, tagCaseFormat);
                    
                    // Replace the entire tags section - avoid using /s flag
                    let newFrontmatter = replaceTagsSection(frontmatter, formattedTagsList);
                    
                    return newFrontmatter + restOfContent;
                } else {
                    // Replace existing tags
                    const formattedTagsList = formatTagsAsYamlList(tags, tagCaseFormat);
                   console.log(formattedTagsList);
                    // Replace the entire tags section - avoid using /s flag
                    const newFrontmatter = replaceTagsSection(frontmatter, formattedTagsList);
                    return newFrontmatter + restOfContent;
                }
            } else {
                // Add tags before the end of frontmatter
                const formattedTagsList = formatTagsAsYamlList(tags, tagCaseFormat);
                return frontmatter + `tags:\n${formattedTagsList}\n` + restOfContent;
            }
        } else {
            // Malformed frontmatter, add new one
            return createNewFrontmatter(content, tags, tagCaseFormat, templateStr, templateVars);
        }
    } else {
        // No frontmatter, add new one
        return createNewFrontmatter(content, tags, tagCaseFormat, templateStr, templateVars);
    }
}

/**
 * Helper function to replace the tags section in frontmatter without using /s flag
 */
function replaceTagsSection(frontmatter: string, formattedTagsList: string): string {
    // Try to find the tags section and replace it
    const tagsStartIndex = frontmatter.toLowerCase().indexOf('tags:');
    if (tagsStartIndex === -1) return frontmatter;
    
    // Find where the tags section ends (next property or end of frontmatter)
    let tagsEndIndex = frontmatter.indexOf('\n', tagsStartIndex);
    // Look for the next property or end of frontmatter
    while (tagsEndIndex < frontmatter.length - 1) {
        // Check if the next line starts a new property or ends the frontmatter
        const nextLineStart = frontmatter.indexOf('\n', tagsEndIndex + 1);
        if (nextLineStart === -1) break;
        
        const nextLine = frontmatter.substring(tagsEndIndex + 1, nextLineStart).trim();
        // If it's a new property (contains a colon) or end of frontmatter (---)
        if (nextLine.includes(':') || nextLine === '---') {
            tagsEndIndex = tagsEndIndex + 1; // Include the newline
            break;
        }
        // Otherwise, it's part of the tags section
        tagsEndIndex = nextLineStart;
    }
    
    // Replace just the tags section
    return frontmatter.substring(0, tagsStartIndex) + 
           `tags:\n${formattedTagsList}` + 
           frontmatter.substring(tagsEndIndex);
}

/**
 * Helper function to create new frontmatter
 */
function createNewFrontmatter(
    content: string,
    tags: string[],
    tagCaseFormat: TagCaseFormat,
    templateStr?: string,
    templateVars?: Record<string, string>
): string {
    const formattedTagsList = formatTagsAsYamlList(tags, tagCaseFormat);

    // If we have no template string, create default
    templateStr = !templateStr ? '---\ntags:\n{{tags}}\n---\n' : templateStr;
    // Combine the provided template variables with the tags
    const allVars = {
        ...templateVars,
        tags: formattedTagsList
    };

    const frontmatter = replaceTemplateVariables(templateStr, allVars);

    return `${frontmatter}\n\n${content}`;

}

/**
 * Handles the process of generating tags for a markdown file
 * @param app The Obsidian App instance
 * @param file The markdown file
 * @param settings Plugin settings
 * @param mode How to handle existing tags: 'append' or 'replace'
 */
export async function handleMarkdownTagGeneration(
    app: App, 
    file: TFile, 
    settings: FileFrontmatterSettings,
    mode: 'append' | 'replace' = 'replace'
): Promise<void> {
    try {
        // Read the file content
        const fileContent = await app.vault.read(file);

        // Generate tags - generateTags already handles loading notices
        const tags = await generateTags(fileContent, settings, app);

        if (tags && tags.length > 0) {
            // If in append mode, check if we're actually adding any new tags
            if (mode === 'append') {
                const frontmatterEnd = fileContent.indexOf('---\n', 4);
                if (frontmatterEnd !== -1) {
                    const frontmatter = fileContent.substring(0, frontmatterEnd);
                    if (frontmatter.includes('tags:')) {
                        const existingTags = extractExistingTags(frontmatter);
                        
                        // Count how many new tags we're adding
                        const newTagsCount = tags.filter(tag => {
                            const formattedTag = formatTag(tag, settings.tagCaseFormat);
                            return !existingTags.some(existingTag => 
                                existingTag.toLowerCase() === formattedTag.toLowerCase()
                            );
                        }).length;
                        
                        // Update the file with the generated tags
                        const newContent = manageFrontmatterTags(
                            fileContent, 
                            tags, 
                            settings.tagCaseFormat,
                            mode
                        );
                        await app.vault.modify(file, newContent);
                        
                        // Show appropriate notification
                        if (newTagsCount === 0) {
                            new Notice(`No new tags to add to ${file.basename}`);
                        } else {
                            new Notice(`${newTagsCount} tag${newTagsCount > 1 ? 's' : ''} added to ${file.basename}`);
                        }
                        return;
                    }
                }
            }
            
            // For replace mode or if there was no tags section
            const newContent = manageFrontmatterTags(
                fileContent, 
                tags, 
                settings.tagCaseFormat,
                mode
            );
            await app.vault.modify(file, newContent);
            new Notice(`Tags ${mode === 'append' ? 'added to' : 'updated for'} ${file.basename}`);
        } else {
            new Notice('No tags were generated');
        }
    } catch (error) {
        console.error('Error handling markdown tag generation:', error);
        new Notice(`Error: ${error.message}`);
    }
} 