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