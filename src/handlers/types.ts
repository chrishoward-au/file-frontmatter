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
	aiPrompt: 'Generate {{max_tags}} relevant tags for this text. Each tag should have no more than {{max_words}} words. Return ONLY a comma-separated list of tags in this exact format: "tag1, tag2, tag3". Do not include any other text, explanations, or formatting.',
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