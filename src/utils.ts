import { TagCaseFormat } from './types';

/**
 * Format a date as YYYY-MM-DD
 */
export function formatDate(date: Date = new Date()): string {
    return date.toISOString().split('T')[0];
}

/**
 * Replace template variables in a string
 * @param template The template string
 * @param variables An object with variable names as keys and their values
 */
export function replaceTemplateVariables(template: string, variables: Record<string, string>): string {
    let result = template;
    for (const [key, value] of Object.entries(variables)) {
        result = result.replace(new RegExp(`{{${key}}}`, 'g'), value);
    }
    return result;
}

/**
 * Strip URLs from text
 * @param text The text to strip URLs from
 * @returns The text with URLs removed
 */
export function stripUrls(text: string): string {
    if (!text) return '';
    
    // Regular expression to match URLs
    // This matches http, https, ftp URLs and also www.example.com style URLs
    const urlRegex = /(https?:\/\/|www\.)[^\s]+(\.[^\s]+){1,}[^\s.,;:?!)"']/gi;
    
    // Replace URLs with empty string
    return text.replace(urlRegex, ' ');
}

/**
 * Count words in a string
 * @param str The string to count words in
 * @returns The number of words
 */
export function countWords(str: string): number {
    const split = str.trim().replace(/[-_]+/g, ' ').split(/\s+/g);
    return split.length;
}

/**
 * Check if a tag is valid based on the maximum words per tag setting
 * Special handling for one-word requests to allow up to two words
 * @param tag The tag to check
 * @param maxWordsPerTag The maximum words per tag setting
 * @returns True if the tag is valid, false otherwise
 */
export function isValidTag(tag: string, maxWordsPerTag: number): boolean {
    const wordCount = countWords(tag);
    // Special handling for one-word requests
    if (maxWordsPerTag === 1) {
        return wordCount <= 2; // Allow up to two words for one-word requests
    }
    
    return wordCount <= maxWordsPerTag;
}

/**
 * Filter out erroneous tags based on word count
 * @param tags Array of tags
 * @param maxWordsPerTag Maximum words per tag setting
 * @returns Object containing valid tags and a flag indicating if any tags were erroneous
 */
export function filterErroneousTags(tags: string[], maxWordsPerTag: number): { 
    validTags: string[], 
    hasErroneousTags: boolean 
} {
    const validTags = tags.filter(tag => isValidTag(tag, maxWordsPerTag));
    const hasErroneousTags = validTags.length < tags.length;
    
    return { validTags, hasErroneousTags };
}

/**
 * Format a tag to be valid in Obsidian
 * - Remove spaces (replace with hyphens)
 * - Remove quotes
 * - Apply case formatting based on settings
 * @param tag The tag to format
 * @param caseFormat The case format to apply
 * @returns The formatted tag
 */
export function formatTag(tag: string, caseFormat: TagCaseFormat = 'lowercase'): string {
    // First, clean the tag by removing quotes and replacing spaces with hyphens
    let formattedTag = tag.replace(/"/g, '').replace(/\s+/g, '-');
    
    // Apply case formatting based on the setting
    switch (caseFormat) {
        case 'lowercase':
            return formattedTag.toLowerCase();
        case 'uppercase':
            return formattedTag.toUpperCase();
        case 'titlecase':
            return formattedTag
                .split('-')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                .join('-');
        case 'retain':
            return formattedTag;
        default:
            return formattedTag.toLowerCase();
    }
} 