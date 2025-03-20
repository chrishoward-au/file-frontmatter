import { App, Notice, TFile } from 'obsidian';
import { TagFilesAndNotesSettings, TagCaseFormat, LanguagePreference } from './types';
import { formatTag, filterErroneousTags, replaceTemplateVariables, stripFrontmatter } from '../libs/utils';
import { getTagsFromAI } from './aiApis';
import { promptForManualTags } from './modals';
import { normalizeSpelling, normalizeForComparison } from '../libs/spellingNormalizer';
import { ERROR_MESSAGES, TIMEOUTS, DEFAULT_VALUES } from '../libs/constants';
import { handleOperationError, handleAIError } from '../libs/errorHandling';

/**
 * Core tag generation service that handles AI provider selection and error handling
 */
export async function generateTags(text: string, settings: TagFilesAndNotesSettings, app: App): Promise<string[]> {
    let loadingNotice: Notice | null = null;
    try {
        const provider = settings.aiProvider;
        console.log(`Generating tags using ${provider}`);

        loadingNotice = new Notice(`Connecting to ${provider}... This may take up to 30 seconds`, TIMEOUTS.AI_REQUEST);

        const finalPrompt = preparePrompt(settings);
        const validTags = await generateValidTags(text, settings, finalPrompt);

        return validTags;
    } catch (error) {
        handleAIError(settings.aiProvider, error as Error, app);
        throw error;
    } finally {
        if (loadingNotice) {
            loadingNotice.hide();
        }
    }
}

/**
 * Prepare the AI prompt with variables
 */
function preparePrompt(settings: TagFilesAndNotesSettings): string {
    return settings.aiPrompt
        .replace('{{max_tags}}', settings.maxTags.toString())
        .replace('{{max_words}}', settings.maxWordsPerTag.toString());
}

/**
 * Generate valid tags with retry logic
 */
async function generateValidTags(text: string, settings: TagFilesAndNotesSettings, prompt: string): Promise<string[]> {
    let passes = 0;
    let validTags: string[] = [];

    while (passes < DEFAULT_VALUES.MAX_RETRIES) {
        const rawTags = await getTagsFromAI(text, settings);
        passes++;

        const integrityResult = filterErroneousTags(rawTags, settings.maxWordsPerTag);
        validTags = integrityResult.validTags;

        if (!integrityResult.hasErroneousTags) {
            return validTags;
        }

        console.log('Erroneous tags found, retrying...');
        await new Promise(resolve => setTimeout(resolve, TIMEOUTS.AI_RETRY_DELAY));
    }

    console.log('Still found erroneous tags after retry, using valid tags only');
    return validTags;
}

/**
 * Handle tag generation for markdown files
 */
export async function handleMarkdownTagGeneration(
    app: App,
    file: TFile,
    settings: TagFilesAndNotesSettings,
    mode: 'append' | 'replace' = 'append'
): Promise<void> {
    try {
        const content = await app.vault.read(file);
        const cleanedContent = stripFrontmatter(content);
        
        const tags = await generateTags(cleanedContent, settings, app);
        if (!tags.length) {
            new Notice(ERROR_MESSAGES.AI_RESPONSE_EMPTY);
            return;
        }

        const updatedContent = await manageFrontmatterTags(
            content,
            tags,
            settings.tagCaseFormat,
            mode,
            settings.defaultTemplate,
            {
                title: file.basename,
                date: new Date().toISOString().split('T')[0]
            },
            settings.languagePreference
        );

        await app.vault.modify(file, updatedContent);
        notifyTagUpdate(tags.length, file.name, mode);
    } catch (error) {
        handleOperationError('Tag generation', error as Error, app);
    }
}

/**
 * Manage frontmatter tags in a file
 */
export async function manageFrontmatterTags(
    content: string,
    newTags: string[],
    tagCaseFormat: TagCaseFormat,
    mode: 'append' | 'replace',
    templateStr: string,
    templateVars: Record<string, string>,
    languagePreference: LanguagePreference
): Promise<string> {
    if (hasFrontmatter(content)) {
        return updateExistingFrontmatter(content, newTags, tagCaseFormat, mode, languagePreference);
    } else {
        return createNewFrontmatter(content, newTags, tagCaseFormat, templateStr, templateVars);
    }
}

/**
 * Check if content has frontmatter
 */
function hasFrontmatter(content: string): boolean {
    return content.startsWith('---\n');
}

/**
 * Update existing frontmatter with new tags
 */
function updateExistingFrontmatter(
    content: string,
    newTags: string[],
    tagCaseFormat: TagCaseFormat,
    mode: 'append' | 'replace',
    languagePreference: LanguagePreference
): string {
    const frontmatterEnd = content.indexOf('---\n', 4);
    if (frontmatterEnd === -1) return content;

    const frontmatter = content.substring(0, frontmatterEnd + 4);
    const body = content.substring(frontmatterEnd + 4);

    console.log('Original frontmatter:', frontmatter);
    
    const existingTags = extractExistingTags(frontmatter);
    console.log('Existing tags:', existingTags);
    
    const finalTags = mode === 'append' 
        ? mergeTags(existingTags, newTags, languagePreference)
        : newTags;
    
    console.log('Final tags to add:', finalTags);

    const updatedFrontmatter = updateFrontmatterTags(frontmatter, finalTags, tagCaseFormat);
    console.log('Updated frontmatter:', updatedFrontmatter);

    return updatedFrontmatter + body;
}

/**
 * Create new frontmatter with tags
 */
function createNewFrontmatter(
    content: string,
    tags: string[],
    tagCaseFormat: TagCaseFormat,
    templateStr: string,
    templateVars: Record<string, string>
): string {
    const formattedTags = formatTagsAsYamlList(tags, tagCaseFormat);
    const frontmatter = replaceTemplateVariables(templateStr, {
        ...templateVars,
        tags: formattedTags
    });
    return frontmatter + '\n\n' + content;
}

/**
 * Extract existing tags from frontmatter
 */
function extractExistingTags(frontmatter: string): string[] {
    // Try to match YAML list format first (most common)
    // Format: tags:\n- tag1\n- tag2
    const yamlListMatch = frontmatter.match(/tags:\s*\n((?:\s*-\s*["']?(.*?)["']?\s*\n)+)/i);
    if (yamlListMatch && yamlListMatch[1]) {
        const yamlListContent = yamlListMatch[1];
        const regex = /\s*-\s*["']?(.*?)["']?\s*\n/gi;
        let match;
        const tags: string[] = [];
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
        return inlineArrayMatch[1]
            .split(',')
            .map(tag => tag.trim().replace(/^['"]|['"]$/g, ''))
            .filter(tag => tag);
    }
    
    // Try to match single tag format
    // Format: tags: tag1
    const singleTagMatch = frontmatter.match(/tags:\s*(.*?)(?:\n|$)/i);
    if (singleTagMatch && singleTagMatch[1]) {
        const singleTag = singleTagMatch[1].trim();
        if (singleTag && singleTag !== "[]") {
            return [singleTag.replace(/["']/g, '')];
        }
    }
    
    return [];
}

/**
 * Merge new tags with existing tags, handling duplicates
 */
function mergeTags(existingTags: string[], newTags: string[], languagePreference: LanguagePreference): string[] {
    const normalizedExisting = new Set(existingTags.map(tag => normalizeForComparison(tag)));
    const uniqueNewTags = newTags.filter(tag => !normalizedExisting.has(normalizeForComparison(tag)));
    return [...existingTags, ...uniqueNewTags];
}

/**
 * Update frontmatter with new tags
 */
function updateFrontmatterTags(frontmatter: string, tags: string[], tagCaseFormat: TagCaseFormat): string {
    const formattedTags = formatTagsAsYamlList(tags, tagCaseFormat);
    
    // Check if tags section exists
    if (frontmatter.includes('tags:')) {
        // Replace existing tags section
        return frontmatter.replace(/tags:\s*\[.*?\]/, `tags: ${formattedTags}`);
    } else {
        // Add tags section before the end of frontmatter
        return frontmatter.replace(/---\n$/, `tags: ${formattedTags}\n---\n`);
    }
}

/**
 * Format tags as YAML list
 */
function formatTagsAsYamlList(tags: string[], tagCaseFormat: TagCaseFormat): string {
    return `[${tags.map(tag => `"${formatTag(tag, tagCaseFormat)}"`).join(', ')}]`;
}

/**
 * Notify user about tag updates
 */
function notifyTagUpdate(tagCount: number, filename: string, mode: 'append' | 'replace'): void {
    if (mode === 'append' && tagCount === 0) {
        new Notice(ERROR_MESSAGES.NO_NEW_TAGS(filename));
    } else {
        new Notice(ERROR_MESSAGES.TAGS_ADDED(tagCount, filename));
    }
} 