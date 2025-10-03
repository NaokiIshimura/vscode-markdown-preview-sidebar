import * as vscode from 'vscode';
import { MarkdownPreviewProvider } from './markdownPreviewProvider';

export function activate(context: vscode.ExtensionContext) {
    const provider = new MarkdownPreviewProvider(context.extensionUri);

    // Register the webview provider
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider('markdownPreview', provider, {
            webviewOptions: {
                retainContextWhenHidden: true
            }
        })
    );

    // Register refresh command
    context.subscriptions.push(
        vscode.commands.registerCommand('markdownPreview.refresh', () => {
            provider.refresh();
        })
    );

    // Listen for active editor changes
    context.subscriptions.push(
        vscode.window.onDidChangeActiveTextEditor(() => {
            provider.updatePreview();
        })
    );

    // Listen for document changes
    context.subscriptions.push(
        vscode.workspace.onDidChangeTextDocument((event) => {
            if (event.document === vscode.window.activeTextEditor?.document) {
                provider.updatePreview();
            }
        })
    );
}

export function deactivate() { }