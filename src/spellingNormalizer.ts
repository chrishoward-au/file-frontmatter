/**
 * Spelling normalization module
 * Handles British/American spelling variations and other common variant spellings
 */

import spellingVariants from './spellingVariants.json';

// Define the type for the spelling variants dictionary
type SpellingVariants = Record<string, string>;

/**
 * Normalize spelling for text comparison
 * Standardizes text by handling common spelling variants
 * @param text The text to normalize
 * @returns Normalized text for comparison
 */
export function normalizeSpelling(text: string): string {
    // Convert to lowercase
    let normalized = text.toLowerCase();
    
    // Apply spelling normalizations
    const variants = spellingVariants as SpellingVariants;
    for (const [variant, standard] of Object.entries(variants)) {
        if (normalized === variant) {
            normalized = standard;
            break;
        }
        if (normalized === standard) {
            break;
        }
    }
    
    // Remove any remaining special characters and extra spaces
    normalized = normalized.replace(/[^\w\s-]/g, '')
                          .replace(/\s+/g, '-')
                          .replace(/-+/g, '-');
    
    return normalized;
}

/**
 * Add a new spelling variant to the dictionary
 * This is a placeholder for future functionality
 * @param variant The variant spelling
 * @param standard The standardized spelling
 */
export function addSpellingVariant(variant: string, standard: string): void {
    // In the future, this could update the spelling variants in storage
    console.log(`Adding spelling variant: ${variant} -> ${standard}`);
    // Implementation would depend on how we want to persist the dictionary
} 