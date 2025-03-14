import { TFile } from 'obsidian';

export type AIProvider = 'openai' | 'gemini';

export interface FileFrontmatterSettings {
	defaultTemplate: string;
	acceptedFileTypes: string[];
	aiProvider: AIProvider;
	openAIApiKey: string;
	maxTags: number;
	extractTextFromFiles: boolean;
	aiPrompt: string;
	googleClientId?: string;
	googleClientSecret?: string;
}

export const DEFAULT_SETTINGS: FileFrontmatterSettings = {
	defaultTemplate: '---\ntitle: {{title}}\ndate: {{date}}\ntags: []\n---',
	acceptedFileTypes: ['pdf'],
	aiProvider: 'openai',
	openAIApiKey: '',
	maxTags: 5,
	extractTextFromFiles: true,
	aiPrompt: 'Generate {{max_tags}} relevant tags for this text. Return only the tags as a comma-separated list, without explanations or additional text.'
}

export type TextExtractorApi = {
	extractText: (file: TFile) => Promise<string>
	canFileBeExtracted: (filePath: string) => boolean
	isInCache: (file: TFile) => Promise<boolean>
} 