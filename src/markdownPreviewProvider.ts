import * as vscode from 'vscode';
import * as MarkdownIt from 'markdown-it';

export class MarkdownPreviewProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'markdownPreview';
    private _view?: vscode.WebviewView;
    private _md: MarkdownIt;

    constructor(private readonly _extensionUri: vscode.Uri) {
        this._md = new MarkdownIt({
            html: true,
            linkify: true,
            typographer: true
        });
    }

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ) {
        console.log('Resolving webview view');
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
        };

        this.updatePreview();
    }

    public refresh() {
        this.updatePreview();
    }

    public updatePreview() {
        if (!this._view) {
            console.log('No webview available');
            return;
        }

        const activeEditor = vscode.window.activeTextEditor;
        if (!activeEditor) {
            console.log('No active editor');
            this._view.title = '';
            this._view.webview.html = this.getEmptyHtml();
            return;
        }

        if (activeEditor.document.languageId !== 'markdown') {
            console.log('Active editor is not markdown:', activeEditor.document.languageId);
            this._view.title = '';
            this._view.webview.html = this.getEmptyHtml();
            return;
        }

        console.log('Updating markdown preview');
        const fileName = activeEditor.document.fileName.split('/').pop() || 'Untitled';
        this._view.title = fileName;
        
        const markdownContent = activeEditor.document.getText();
        const htmlContent = this._md.render(markdownContent);
        this._view.webview.html = this.getWebviewContent(htmlContent);
    }

    private getWebviewContent(htmlContent: string): string {
        return `<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Markdown Preview</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            padding: 16px;
            margin: 0;
        }
        
        h1, h2, h3, h4, h5, h6 {
            color: var(--vscode-foreground);
            margin-top: 24px;
            margin-bottom: 16px;
        }
        
        h1 { border-bottom: 1px solid var(--vscode-textSeparator-foreground); }
        h2 { border-bottom: 1px solid var(--vscode-textSeparator-foreground); }
        
        code {
            background-color: var(--vscode-textCodeBlock-background);
            color: var(--vscode-textPreformat-foreground);
            padding: 2px 4px;
            border-radius: 3px;
            font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
        }
        
        pre {
            background-color: var(--vscode-textCodeBlock-background);
            color: var(--vscode-textPreformat-foreground);
            padding: 16px;
            border-radius: 6px;
            overflow-x: auto;
            font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
        }
        
        blockquote {
            border-left: 4px solid var(--vscode-textBlockQuote-border);
            background-color: var(--vscode-textBlockQuote-background);
            margin: 16px 0;
            padding: 8px 16px;
        }
        
        table {
            border-collapse: collapse;
            width: 100%;
            margin: 16px 0;
        }
        
        th, td {
            border: 1px solid var(--vscode-textSeparator-foreground);
            padding: 8px 12px;
            text-align: left;
        }
        
        th {
            background-color: var(--vscode-textCodeBlock-background);
            font-weight: bold;
        }
        
        a {
            color: var(--vscode-textLink-foreground);
            text-decoration: none;
        }
        
        a:hover {
            text-decoration: underline;
        }
        
        img {
            max-width: 100%;
            height: auto;
        }
        
        ul, ol {
            padding-left: 24px;
        }
        
        li {
            margin: 4px 0;
        }
    </style>
</head>
<body>
    ${htmlContent}
</body>
</html>`;
    }

    private getEmptyHtml(): string {
        return `<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Markdown Preview</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            color: var(--vscode-descriptionForeground);
            background-color: var(--vscode-editor-background);
            padding: 16px;
            margin: 0;
            text-align: center;
        }
    </style>
</head>
<body>
    <p>マークダウンファイルを開いてプレビューを表示してください</p>
</body>
</html>`;
    }
}