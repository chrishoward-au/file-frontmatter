/**
 * Spelling normalization module
 * Handles British/American spelling variations and other common variant spellings
 */

import spellingVariants from './spellingVariants.json';
import { LanguagePreference } from './types';

// Define the type for the spelling variants dictionary
type SpellingVariants = Record<string, string>;

/**
 * Normalize spelling for text comparison and standardization
 * Returns the preferred spelling variant based on language preference
 * @param text The text to normalize
 * @param languagePreference The user's language preference (UK or US English)
 * @returns Text with normalized spelling based on preference
 */
export function normalizeSpelling(text: string, languagePreference: LanguagePreference = 'uk'): string {
    // Convert to lowercase for comparison
    const lowercased = text.toLowerCase();
    
    // Get the variants dictionary
    const variants = spellingVariants as SpellingVariants;
    
    // Check if this is a known spelling variant
    for (const [ukVariant, usVariant] of Object.entries(variants)) {
        // If it matches either variant (UK or US spelling)
        if (lowercased === ukVariant.toLowerCase() || lowercased === usVariant.toLowerCase()) {
            // Return the preferred spelling, preserving original case pattern
            const preferred = languagePreference === 'uk' ? ukVariant : usVariant;
            
            // If original had first letter capitalized, capitalize the preferred version too
            if (text[0] === text[0].toUpperCase()) {
                return preferred.charAt(0).toUpperCase() + preferred.slice(1);
            }
            return preferred;
        }
    }
    
    // If no variant is found, return the original text
    return text;
}

/**
 * Normalize text for comparison purposes only (not for display)
 * @param text The text to normalize for comparison
 * @returns Text stripped of special characters and normalized to lowercase
 */
export function normalizeForComparison(text: string): string {
    // Convert to lowercase and remove special characters
    return text.toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');
}

/**
 * Add a new spelling variant to the dictionary
 * This is a placeholder for future functionality
 * @param ukVariant The UK spelling variant
 * @param usVariant The US spelling variant
 */
export function addSpellingVariant(ukVariant: string, usVariant: string): void {
    // In the future, this could update the spelling variants in storage
    console.log(`Adding spelling variant: ${ukVariant} <-> ${usVariant}`);
    // Implementation would depend on how we want to persist the dictionary
} 