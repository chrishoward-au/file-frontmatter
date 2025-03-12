export interface FileFrontmatterSettings {
	defaultTemplate: string;
	acceptedFileTypes: string[];
}

export const DEFAULT_SETTINGS: FileFrontmatterSettings = {
	defaultTemplate: '---\ntitle: {{title}}\ndate: {{date}}\ntags: []\n---',
	acceptedFileTypes: ['pdf']
} 