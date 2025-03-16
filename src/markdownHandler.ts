import { App, Notice, TFile } from 'obsidian';
import { FileFrontmatterSettings, TagCaseFormat } from './types';
import { formatTag } from './utils';
import { generateTags } from './textProcessing';

/**
 * Handles the process of generating tags for a markdown file
 * @param app The Obsidian App instance
 * @param file The markdown file
 * @param settings Plugin settings
 */
export async function handleMarkdownTagGeneration(app: App, file: TFile, settings: FileFrontmatterSettings): Promise<void> {
    try {
        // Read the file content
        const fileContent = await app.vault.read(file);
        
        // Generate tags
        const loadingNotice = new Notice(`Connecting to ${settings.aiProvider}... This may take up to 30 seconds`, 30000);
        
        try {
            const tags = await generateTags(fileContent, settings, app);
            loadingNotice.hide();
            
            if (tags && tags.length > 0) {
                // Update the file with the generated tags
                await updateFileWithTags(app, file, fileContent, tags, settings.tagCaseFormat);
            } else {
                new Notice('No tags were generated');
            }
        } catch (error) {
            loadingNotice.hide();
            console.error('Error generating tags:', error);
            new Notice(`Error generating tags: ${error.message}`);
        }
    } catch (error) {
        console.error('Error reading file:', error);
        new Notice(`Error reading file: ${error.message}`);
    }
}

/**
 * Updates a markdown file with generated tags
 * @param app The Obsidian App instance
 * @param file The file to update
 * @param fileContent The current content of the file
 * @param tags The tags to add
 * @param tagCaseFormat The format to apply to tags
 */
async function updateFileWithTags(
    app: App, 
    file: TFile, 
    fileContent: string, 
    tags: string[], 
    tagCaseFormat: TagCaseFormat
): Promise<void> {
    // Format tags with the selected case format
    const formattedTags = tags
        .map(tag => formatTag(tag, tagCaseFormat))
        .map(tag => `"${tag}"`)
        .join(', ');
    
    // Check if file already has frontmatter
    let newContent: string;
    if (fileContent.startsWith('---\n')) {
        // File has frontmatter, update or add tags
        const frontmatterEnd = fileContent.indexOf('---\n', 4);
        if (frontmatterEnd !== -1) {
            const frontmatter = fileContent.substring(0, frontmatterEnd);
            const restOfContent = fileContent.substring(frontmatterEnd);
            
            if (frontmatter.includes('tags:')) {
                // Replace existing tags
                newContent = frontmatter.replace(/tags:.*(\r?\n)/i, `tags: [${formattedTags}]$1`) + restOfContent;
            } else {
                // Add tags before the end of frontmatter
                newContent = frontmatter + `tags: [${formattedTags}]\n` + restOfContent;
            }
        } else {
            // Malformed frontmatter, add new one
            newContent = `---\ntags: [${formattedTags}]\n---\n\n${fileContent}`;
        }
    } else {
        // No frontmatter, add new one
        newContent = `---\ntags: [${formattedTags}]\n---\n\n${fileContent}`;
    }
    
    // Save the updated content
    await app.vault.modify(file, newContent);
    new Notice(`Tags added to ${file.basename}`);
} 