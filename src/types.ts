import { TFile } from 'obsidian';

export interface FileFrontmatterSettings {
	defaultTemplate: string;
	acceptedFileTypes: string[];
	corticalApiKey: string;
	maxKeywords: number;
	extractTextFromFiles: boolean;
}

export const DEFAULT_SETTINGS: FileFrontmatterSettings = {
	defaultTemplate: '---\ntitle: {{title}}\ndate: {{date}}\ntags: []\n---',
	acceptedFileTypes: ['pdf'],
	corticalApiKey: '',
	maxKeywords: 5,
	extractTextFromFiles: true
}

export type TextExtractorApi = {
	extractText: (file: TFile) => Promise<string>
	canFileBeExtracted: (filePath: string) => boolean
	isInCache: (file: TFile) => Promise<boolean>
} 