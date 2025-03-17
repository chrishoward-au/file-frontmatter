/**
 * Spelling normalization module
 * Handles British/American spelling variations and other common variant spellings
 */

import spellingVariants from './spellingVariants.json';
import { LanguagePreference } from './types';

// Define the type for the spelling variants dictionary
type SpellingVariants = Record<string, string>;

/**
 * Normalize spelling for text comparison
 * Standardizes text by handling common spelling variants based on user's language preference
 * @param text The text to normalize
 * @param languagePreference The user's language preference (UK or US English)
 * @returns Normalized text for comparison
 */
export function normalizeSpelling(text: string, languagePreference: LanguagePreference = 'uk'): string {
    // Convert to lowercase
    let normalized = text.toLowerCase();
    
    // Apply spelling normalizations based on language preference
    const variants = spellingVariants as SpellingVariants;
    
    if (languagePreference === 'uk') {
        // If UK is preferred, normalize US spellings to UK
        for (const [ukVariant, usStandard] of Object.entries(variants)) {
            // If the text matches the US spelling, convert to UK
            if (normalized === usStandard) {
                normalized = ukVariant;
                break;
            }
        }
    } else {
        // If US is preferred, normalize UK spellings to US
        for (const [ukVariant, usStandard] of Object.entries(variants)) {
            // If the text matches the UK spelling, convert to US
            if (normalized === ukVariant) {
                normalized = usStandard;
                break;
            }
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
 * @param variant The variant spelling (UK version)
 * @param standard The standardized spelling (US version)
 */
export function addSpellingVariant(variant: string, standard: string): void {
    // In the future, this could update the spelling variants in storage
    console.log(`Adding spelling variant: ${variant} -> ${standard}`);
    // Implementation would depend on how we want to persist the dictionary
} 