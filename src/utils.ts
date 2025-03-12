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