import { App, Notice } from 'obsidian';
import { ERROR_MESSAGES, TIMEOUTS } from './constants';

/**
 * Standardized error handling for the File-to-Note plugin
 */

export class FileToNoteError extends Error {
    constructor(message: string, public readonly code: string) {
        super(message);
        this.name = 'FileToNoteError';
    }
}

export function handleOperationError(
    operation: string,
    error: Error | FileToNoteError,
    app: App,
    showNotice: boolean = true
): void {
    const errorMessage = `${operation} failed: ${error.message}`;
    console.error(`[File-to-Note] ${errorMessage}`);
    
    if (showNotice) {
        new Notice(errorMessage, TIMEOUTS.NOTICE_DURATION);
    }
}

export function handleAIError(
    provider: string,
    error: Error,
    app: App
): void {
    const errorMessage = ERROR_MESSAGES.AI_REQUEST_FAILED(provider);
    console.error(`[File-to-Note] AI Error (${provider}): ${error.message}`);
    new Notice(errorMessage, TIMEOUTS.NOTICE_DURATION);
}

export function handleValidationError(
    message: string,
    app: App
): void {
    console.error(`[File-to-Note] Validation Error: ${message}`);
    new Notice(message, TIMEOUTS.NOTICE_DURATION);
}

export function handleFileError(
    operation: string,
    filePath: string,
    error: Error,
    app: App
): void {
    const errorMessage = `${operation} failed for file '${filePath}': ${error.message}`;
    console.error(`[File-to-Note] ${errorMessage}`);
    new Notice(errorMessage, TIMEOUTS.NOTICE_DURATION);
} 