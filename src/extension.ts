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

    context.subscriptions.push(
        vscode.commands.registerCommand('markdownPreview.edit', () => {
            void provider.edit();
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('markdownPreview.pin', () => {
            void provider.pin();
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('markdownPreview.unpin', () => {
            void provider.unpin();
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('markdownPreview.togglePin', () => {
            void provider.togglePin();
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('markdownPreview.zoomIn', () => {
            provider.zoomIn();
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('markdownPreview.zoomOut', () => {
            provider.zoomOut();
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('markdownPreview.resetZoom', () => {
            provider.resetZoom();
        })
    );

    // Listen for active editor changes
    context.subscriptions.push(
        vscode.window.onDidChangeActiveTextEditor(() => {
            void provider.updatePreview();
        })
    );

    // Listen for document changes
    context.subscriptions.push(
        vscode.workspace.onDidChangeTextDocument((event) => {
            const activeDocument = vscode.window.activeTextEditor?.document;
            if (event.document === activeDocument || provider.isPinnedDocument(event.document.uri)) {
                void provider.updatePreview();
            }
        })
    );
}

export function deactivate() { }
