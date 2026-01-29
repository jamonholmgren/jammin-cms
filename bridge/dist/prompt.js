function formatChange(change, index) {
    return `### Change ${index + 1}
**Location**: ${change.elementPath}
**Selector**: ${change.selector}

**Original content:**
\`\`\`html
${change.originalContent}
\`\`\`

**New content (user edited):**
\`\`\`html
${change.newContent}
\`\`\``;
}
export function buildPrompt(job) {
    const { siteUrl, changes, customInstructions } = job;
    const changesSection = changes
        .map((change, index) => formatChange(change, index))
        .join('\n\n');
    const instructionsSection = customInstructions
        ? `## Site-Specific Instructions
${customInstructions}

`
        : '';
    return `# Website Content Update Request

The user has made inline edits to their website at: ${siteUrl}

${instructionsSection}## Changes Made

${changesSection}

## Instructions
1. Find the source files that generate this content
2. Update the content to match the user's edits
3. Preserve all existing formatting, structure, and code
4. Briefly summarize what files were modified

Important:
- The content may come from markdown files, React components, or other templates
- Match the existing code style and patterns
- Only change the specific content that was edited
- Do not add comments or explanations to the code`;
}
//# sourceMappingURL=prompt.js.map