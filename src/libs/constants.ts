/**
 * Centralized constants for the File-to-Note plugin
 */

export const ERROR_MESSAGES = {
    UNSUPPORTED_FILE: (extension: string, supported: string[]) => 
        `File type '${extension}' is not supported. Supported types: ${supported.join(', ')}`,
    TEXT_EXTRACTOR_MISSING: 'Text Extractor plugin is not installed or enabled. It is required for extracting text from non-markdown files.',
    FILE_NOT_IN_FOLDER: 'File is not in a folder',
    NOTE_EXISTS: (noteName: string) => `Note '${noteName}' already exists`,
    AI_CONFIG_MISSING: 'AI provider is not properly configured',
    NO_NEW_TAGS: (filename: string) => `No new tags to add to ${filename}`,
    TAGS_ADDED: (count: number, filename: string) => `${count} tag${count !== 1 ? 's' : ''} added to ${filename}`,
    AI_REQUEST_FAILED: (provider: string) => `Failed to get tags from ${provider}. Please check your configuration.`,
    AI_RESPONSE_INVALID: 'Invalid response from AI provider',
    AI_RESPONSE_EMPTY: 'No tags were generated',
    AI_RESPONSE_TOO_LONG: 'Generated tags exceed maximum length',
    AI_RESPONSE_TOO_MANY_WORDS: 'Some tags contain too many words'
};

export const TIMEOUTS = {
    AI_REQUEST: 30000,
    NOTICE_DURATION: 5000,
    AI_RETRY_DELAY: 1000
};

export const REGEX = {
    URL: /https?:\/\/[^\s]+/g,
    FRONTMATTER_START: /^---\n/,
    FRONTMATTER_END: /^---\n/m,
    TAGS_SECTION: /tags:\s*\[(.*?)\]/,
    SPECIAL_CHARS: /[^\w\s-]/g,
    WHITESPACE: /\s+/g,
    HYPHENS: /-+/g
};

export const DEFAULT_VALUES = {
    MAX_RETRIES: 2,
    MAX_TAGS: 5,
    MAX_WORDS_PER_TAG: 2,
    DEFAULT_LANGUAGE: 'uk' as const
};

export const FILE_PATTERNS = {
    MARKDOWN: /\.md$/i,
    FRONTMATTER_START: '---\n',
    FRONTMATTER_END: '---\n'
}; 