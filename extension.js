const vscode = require('vscode');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

// Create output channel for debugging
const outputChannel = vscode.window.createOutputChannel('OctoPwn');


/**
 * Check if the Python extension is installed
 * @returns {Promise<boolean>} True if Python extension is installed
 */
async function isPythonExtensionInstalled() {
    const pythonExtension = vscode.extensions.getExtension('ms-python.python');
    return pythonExtension !== undefined;
}


/**
 * @param {vscode.ExtensionContext} context
 */
async function activate(context) {
    outputChannel.appendLine('OctoPwn extension activated');
    
    // Configure Python stubs for IntelliSense
    configurePythonStubs(context);

    const pythonInstalled = await isPythonExtensionInstalled();
    if (!pythonInstalled) {
        const message = 'Python extension is required to run OctoPwn plugins.';
        vscode.window.showErrorMessage(message);
        outputChannel.appendLine(message);
        return;
    }
    
    // Register the configurePythonStubs command
    let configurePythonStubsCommand = vscode.commands.registerCommand('octopwn.configurePythonStubs', function () {
        outputChannel.appendLine('Manually configuring Python stubs...');
        vscode.window.showInformationMessage('Configuring OctoPwn Python stubs');
        configurePythonStubs(context);
    });

    // Register the runPlugin command
    let runPluginCommand = vscode.commands.registerCommand('octopwn.runPlugin', async (uri) => {
        outputChannel.appendLine('Running OctoPwn plugin...');
        // Get the file path from the URI or active editor
        let filePath;
        if (uri) {
            filePath = uri.fsPath;
        } else if (vscode.window.activeTextEditor) {
            filePath = vscode.window.activeTextEditor.document.uri.fsPath;
        } else {
            vscode.window.showErrorMessage('No file selected to run as OctoPwn plugin');
            return;
        }

        // Check if the file exists and is a Python file
        if (!fs.existsSync(filePath) || !filePath.endsWith('.py')) {
            vscode.window.showErrorMessage('Selected file is not a valid Python file');
            return;
        }

        // Get configuration
        const config = vscode.workspace.getConfiguration('octopwn');
        const binaryPath = config.get('binaryPath');
        const licensePath = config.get('licensePath');
        const extraFilesPath = config.get('extraFilesPath');

        // Validate binary path
        if (!binaryPath) {
            const result = await vscode.window.showErrorMessage(
                'OctoPwn binary path is not configured. Would you like to configure it now?',
                'Yes', 'No'
            );
            
            if (result === 'Yes') {
                const binaryUri = await vscode.window.showOpenDialog({
                    canSelectFiles: true,
                    canSelectFolders: false,
                    canSelectMany: false,
                    openLabel: 'Select OctoPwn Binary'
                });
                
                if (binaryUri && binaryUri.length > 0) {
                    await config.update('binaryPath', binaryUri[0].fsPath, vscode.ConfigurationTarget.Global);
                } else {
                    return;
                }
            } else {
                return;
            }
        }

        // Build command arguments
        const args = ['--plugin', filePath];
        
        if (licensePath) {
            args.push('--license', licensePath);
        }
        
        if (extraFilesPath) {
            args.push('--extra-files', extraFilesPath);
        }

        outputChannel.appendLine(`Running OctoPwn with plugin: ${filePath}`);
        outputChannel.appendLine(`Command: ${binaryPath} ${args.join(' ')}`);
        
        // Run the OctoPwn binary with the plugin
        const octopwn = spawn(binaryPath, args);

        octopwn.stdout.on('data', (data) => {
            outputChannel.append(data.toString());
        });

        octopwn.stderr.on('data', (data) => {
            outputChannel.append(data.toString());
        });

        octopwn.on('close', (code) => {
            outputChannel.appendLine(`\nOctoPwn process exited with code ${code}`);
        });

        octopwn.on('error', (err) => {
            outputChannel.appendLine(`\nError running OctoPwn: ${err.message}`);
            vscode.window.showErrorMessage(`Failed to run OctoPwn: ${err.message}`);
        });

        // Use the existing output channel instead of creating a new one
        outputChannel.show();
    });

    context.subscriptions.push(configurePythonStubsCommand);
    context.subscriptions.push(runPluginCommand);
    
    // Show the output channel for debugging
    outputChannel.show();
}

/**
 * Configure Python stubs for IntelliSense
 * @param {vscode.ExtensionContext} context 
 */
async function configurePythonStubs(context) {
    try {
        // Get the path to the stubs directory
        const stubsPath = path.join(context.extensionPath, 'dist', 'stubs');
        outputChannel.appendLine(`OctoPwn Stubs path: ${stubsPath}`);
        
        // Check if stubs directory exists
        if (!fs.existsSync(stubsPath)) {
            outputChannel.appendLine('OctoPwn Stubs directory not found!');
            vscode.window.showErrorMessage('OctoPwn stubs directory not found!');
            return;
        }
        
        // List files in stubs directory for debugging
        const files = fs.readdirSync(stubsPath);
        outputChannel.appendLine(`Files in OctoPwn Stubs directory: ${files.join(', ')}`);
        
        // Check if workspace is open
        if (!vscode.workspace.workspaceFolders || vscode.workspace.workspaceFolders.length === 0) {
            outputChannel.appendLine('No workspace folder is open. Cannot configure Python settings.');
            vscode.window.showWarningMessage('Please open a workspace folder to configure Python IntelliSense for OctoPwn.');
            return;
        }
        
        // Get Python extension settings
        const pythonConfig = vscode.workspace.getConfiguration('python');
        
        // Configure extraPaths for autocompletion
        const extraPaths = pythonConfig.get('analysis.extraPaths') || [];
        if (!extraPaths.includes(stubsPath)) {
            outputChannel.appendLine('Adding stubs path to Python analysis.extraPaths');
            extraPaths.push(stubsPath);
            await pythonConfig.update('analysis.extraPaths', extraPaths, vscode.ConfigurationTarget.Workspace);
        } else {
            outputChannel.appendLine('Stubs path already in Python analysis.extraPaths');
        }
        
        // Configure Pylance/Pyright settings
        const pylanceConfig = vscode.workspace.getConfiguration('python.analysis');
        
        // Add stub path to typeshedPaths
        const typeshedPaths = pylanceConfig.get('typeshedPaths') || [];
        if (!typeshedPaths.includes(stubsPath)) {
            outputChannel.appendLine('Adding stubs path to Python analysis.typeshedPaths');
            typeshedPaths.push(stubsPath);
            await pylanceConfig.update('typeshedPaths', typeshedPaths, vscode.ConfigurationTarget.Workspace);
        }
        
        // Enable auto import completions
        await pylanceConfig.update('autoImportCompletions', true, vscode.ConfigurationTarget.Workspace);
        
        // Configure Python type checking
        await pylanceConfig.update('typeCheckingMode', 'basic', vscode.ConfigurationTarget.Workspace);
        
        outputChannel.appendLine('Python stubs configuration completed');
        
        // Restart Python language server
        outputChannel.appendLine('Restarting Python language server...');
        await vscode.commands.executeCommand('python.analysis.restartLanguageServer');
        
        vscode.window.showInformationMessage('OctoPwn stubs configured successfully. Python language server restarted.');
    } catch (error) {
        outputChannel.appendLine(`Error configuring Python stubs: ${error.message}`);
        vscode.window.showErrorMessage(`Error configuring OctoPwn stubs: ${error.message}`);
    }
}

function deactivate() {
    outputChannel.appendLine('OctoPwn extension deactivated');
}

module.exports = {
    activate,
    deactivate
}
