import { Notice } from 'obsidian';
import { FileFrontmatterSettings } from './types';
import { filterErroneousTags } from './utils';

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