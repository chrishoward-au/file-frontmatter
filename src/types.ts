import { TFile } from 'obsidian';

export type AIProvider = 'openai' | 'gemini' | 'ollama';

export interface FileFrontmatterSettings {
	defaultTemplate: string;
	acceptedFileTypes: string[];
	aiProvider: AIProvider;
	openAIApiKey: string;
	maxTags: number;
	extractTextFromFiles: boolean;
	includeExtractedText: boolean;
	aiPrompt: string;
	googleClientId?: string;
	googleClientSecret?: string;
	ollamaHost: string;
	ollamaModel: string;
	maxWordsPerTag: number;
}

export const DEFAULT_SETTINGS: FileFrontmatterSettings = {
	defaultTemplate: '---\ntitle: {{title}}\ndate: {{date}}\ntags: []\n---',
	acceptedFileTypes: ['pdf'],
	aiProvider: 'openai',
	openAIApiKey: '',
	maxTags: 5,
	extractTextFromFiles: true,
	includeExtractedText: false,
	aiPrompt: 'Generate {{max_tags}} relevant tags for this text. Each tag should have no more than {{max_words}} words. Return only the tags as a comma-separated list, without explanations or additional text.',
	ollamaHost: 'http://localhost:11434',
	ollamaModel: 'llama2',
	maxWordsPerTag: 2
}

export type TextExtractorApi = {
	extractText: (file: TFile) => Promise<string>
	canFileBeExtracted: (filePath: string) => boolean
	isInCache: (file: TFile) => Promise<boolean>
} 