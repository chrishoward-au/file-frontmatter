import { TFile } from 'obsidian';

export interface FileFrontmatterSettings {
	defaultTemplate: string;
	acceptedFileTypes: string[];
	openAIApiKey: string;
	maxKeywords: number;
	extractTextFromFiles: boolean;
	aiPrompt: string;
}

export const DEFAULT_SETTINGS: FileFrontmatterSettings = {
	defaultTemplate: '---\ntitle: {{title}}\ndate: {{date}}\ntags: []\n---',
	acceptedFileTypes: ['pdf'],
	openAIApiKey: '',
	maxKeywords: 5,
	extractTextFromFiles: true,
	aiPrompt: 'Generate {{max_keywords}} relevant tags for this text. Return only the tags as a comma-separated list, without explanations or additional text.'
}

export type TextExtractorApi = {
	extractText: (file: TFile) => Promise<string>
	canFileBeExtracted: (filePath: string) => boolean
	isInCache: (file: TFile) => Promise<boolean>
} 