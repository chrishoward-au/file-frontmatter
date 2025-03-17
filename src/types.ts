import { TFile } from 'obsidian';

export type AIProvider = 'openai' | 'gemini' | 'ollama';
export type TagCaseFormat = 'lowercase' | 'uppercase' | 'titlecase' | 'retain';
export type LanguagePreference = 'uk' | 'us';

export interface FileFrontmatterSettings {
	defaultTemplate: string;
	acceptedFileTypes: string[];
	aiProvider: AIProvider;
	openAIApiKey: string;
	maxTags: number;
	includeExtractedText: boolean;
	aiPrompt: string;
	googleClientId?: string;
	googleClientSecret?: string;
	ollamaHost: string;
	ollamaModel: string;
	maxWordsPerTag: number;
	tagCaseFormat: TagCaseFormat;
	languagePreference: LanguagePreference;
}

export const DEFAULT_SETTINGS: FileFrontmatterSettings = {
	defaultTemplate: '---\ntitle: {{title}}\ndate: {{date}}\ntags: []\n---',
	acceptedFileTypes: ['pdf'],
	aiProvider: 'openai',
	openAIApiKey: '',
	maxTags: 5,
	includeExtractedText: false,
	aiPrompt: 'Generate {{max_tags}} relevant tags for this text. Each tag should have no more than {{max_words}} words. Return only the tags as a comma-separated list, without explanations or additional text.',
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