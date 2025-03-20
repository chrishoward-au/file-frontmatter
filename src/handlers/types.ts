import { TFile } from 'obsidian';

export type AIProvider = 'openai' | 'gemini' | 'ollama' | 'mistral';
export type TagCaseFormat = 'lowercase' | 'uppercase' | 'titlecase' | 'retain';
export type LanguagePreference = 'uk' | 'us';

export interface TagFilesAndNotesSettings {
	defaultTemplate: string;
	acceptedFileTypes: string[];
	maxTags: number;
	includeExtractedText: boolean;
	maxWordsPerTag: number;
	tagCaseFormat: TagCaseFormat;
	languagePreference: LanguagePreference;
	aiPrompt: string;
	aiProvider: AIProvider;
	openAIApiKey: string;
	mistralAiApiKey:string,
	googleClientId?: string;
	googleClientSecret?: string;
	ollamaHost: string;
	ollamaModel: string;
}

export const DEFAULT_SETTINGS: TagFilesAndNotesSettings = {
	defaultTemplate: '---\ntitle: {{title}}\ndate: {{date}}\ntags: []\n---',
	acceptedFileTypes: ['pdf'],
	aiProvider: 'openai',
	openAIApiKey: '',
	mistralAiApiKey:'',
	maxTags: 5,
	includeExtractedText: false,
	aiPrompt: 'Generate {{max_tags}} relevant tags for this text. Each tag MUST have {{max_words}} words or fewer. Return ONLY a comma-separated list. For multi-word tags, use hyphens to join words. Example format: "single-word, two-words, another-tag". Do not use spaces within tags.',
	ollamaHost: 'http://localhost:11434',
	ollamaModel: 'llama2',
	maxWordsPerTag: 2,
	tagCaseFormat: 'lowercase',
	languagePreference: 'uk'
}

export type TextExtractorApi = {
	extractText: (file: TFile) => Promise<string>
	canFileBeExtracted: (filePath: string) => boolean
	isInCache: (file: TFile) => Promise<boolean>
} 