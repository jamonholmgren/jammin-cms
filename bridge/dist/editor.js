import { exec } from 'child_process';
import { promisify } from 'util';
import { existsSync } from 'fs';
const execAsync = promisify(exec);
// Check if an editor command is available
async function isEditorAvailable(command) {
    try {
        await execAsync(`which ${command}`);
        return true;
    }
    catch {
        return false;
    }
}
// Detect available editor
async function detectEditor() {
    // Check for Cursor first (preferred)
    if (await isEditorAvailable('cursor')) {
        return 'cursor';
    }
    // Check for VS Code
    if (await isEditorAvailable('code')) {
        return 'code';
    }
    // Check for common macOS editor locations
    const cursorMacPath = '/Applications/Cursor.app/Contents/Resources/app/bin/cursor';
    if (existsSync(cursorMacPath)) {
        return cursorMacPath;
    }
    const codeMacPath = '/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code';
    if (existsSync(codeMacPath)) {
        return codeMacPath;
    }
    return null;
}
export async function openInEditor(projectPath, file, editorType = 'auto') {
    let editorCommand = null;
    if (editorType === 'auto') {
        editorCommand = await detectEditor();
    }
    else {
        editorCommand = editorType;
        // Verify the specified editor is available
        if (!(await isEditorAvailable(editorCommand))) {
            throw new Error(`Editor '${editorCommand}' is not available`);
        }
    }
    if (!editorCommand) {
        throw new Error('No editor found. Please install Cursor or VS Code.');
    }
    // Build the path to open
    const targetPath = file ? `${projectPath}/${file}` : projectPath;
    // Verify the path exists
    if (!existsSync(targetPath)) {
        throw new Error(`Path does not exist: ${targetPath}`);
    }
    console.log(`Opening ${targetPath} in ${editorCommand}`);
    // Open the editor
    // Use -r to reuse existing window, -g to not focus the editor
    const args = ['-r', targetPath];
    try {
        await execAsync(`"${editorCommand}" ${args.join(' ')}`);
    }
    catch (err) {
        // Editor might return non-zero even on success (e.g., if already open)
        // So we only throw if it's a clear failure
        const error = err;
        if (error.message?.includes('command not found')) {
            throw new Error(`Editor '${editorCommand}' is not available`);
        }
        // Otherwise, assume success
    }
}
//# sourceMappingURL=editor.js.map