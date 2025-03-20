import { App, TFile } from 'obsidian';
import { TagFilesAndNotesSettings } from './types';

export class TagHandler {
	constructor(
		private app: App,
		private settings: TagFilesAndNotesSettings
	) {}

	async appendTags(file: TFile, newTags: string[]): Promise<void> {
		try {
			// Get current content and frontmatter
			const content = await this.app.vault.read(file);
			const frontmatter = this.app.metadataCache.getFileCache(file)?.frontmatter;
			
			// Get existing tags from frontmatter and filter out '--'
			const existingTags = (frontmatter?.tags || []).filter((tag: string) => tag !== '--');
			
			// Filter out invalid tags and normalize case
			const validNewTags = newTags
				.filter(tag => {
					const wordCount = tag.split('-').length;
					if (wordCount > this.settings.maxWordsPerTag) {
						console.log(`Tag "${tag}" was filtered out due to word count`);
						return false;
					}
					return true;
				})
				.map(tag => this.normalizeTagCase(tag))
				.filter(tag => tag !== '--'); // Filter out any remaining frontmatter markers
			
			// Remove duplicates and merge with existing tags
			const allTags = [...new Set([...existingTags, ...validNewTags])].filter(tag => tag !== '--');
			
			// Update frontmatter
			const updatedContent = this.updateFrontmatter(content, allTags);
			
			// Write back to file
			await this.app.vault.modify(file, updatedContent);
		} catch (error) {
			console.error('Error appending tags:', error);
			throw error;
		}
	}

	private normalizeTagCase(tag: string): string {
		switch (this.settings.tagCaseFormat) {
			case 'lowercase':
				return tag.toLowerCase();
			case 'uppercase':
				return tag.toUpperCase();
			case 'titlecase':
				return tag.split('-')
					.map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
					.join('-');
			case 'retain':
			default:
				return tag;
		}
	}

	private updateFrontmatter(content: string, tags: string[]): string {
		const frontmatterRegex = /^---\n([\s\S]*?)\n---/;
		const hasFrontmatter = frontmatterRegex.test(content);
		
		if (!hasFrontmatter) {
			// If no frontmatter exists, add it at the start with proper spacing
			return `---\ntags:\n${tags.map(tag => `- ${tag}`).join('\n')}\n---\n\n${content}`;
		}
		
		// Replace existing frontmatter
		return content.replace(frontmatterRegex, (match, frontmatterContent) => {
			// Check if tags already exist in frontmatter
			if (frontmatterContent.includes('tags:')) {
				// Replace existing tags with proper spacing
				const updatedFrontmatter = frontmatterContent.replace(
					/tags:[\s\S]*?(?=\n\w|$)/,
					`tags:\n${tags.map(tag => `- ${tag}`).join('\n')}`
				);
				return `---\n${updatedFrontmatter}\n---\n`;
			} else {
				// Add tags to existing frontmatter with proper spacing
				return `---\n${frontmatterContent.trim()}\ntags:\n${tags.map(tag => `- ${tag}`).join('\n')}\n---\n`;
			}
		});
	}
} 