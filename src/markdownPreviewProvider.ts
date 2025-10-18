import * as vscode from 'vscode';
import * as MarkdownIt from 'markdown-it';
import * as path from 'path';

interface MarkdownRenderEnv {
    webview?: vscode.Webview;
    documentUri?: vscode.Uri;
}

type PreviewTheme = 'light' | 'dark';

export class MarkdownPreviewProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'markdownPreview';
    private _view?: vscode.WebviewView;
    private _md: MarkdownIt;
    private _isPinned = false;
    private _pinnedUri?: vscode.Uri;
    private _pinnedFileName?: string;
    private _canPin = false;
    private _currentPreviewUri?: vscode.Uri;
    private _canEdit = false;
    private _theme: PreviewTheme;
    private _zoomLevel: number;
    private readonly _minZoom = 50;
    private readonly _maxZoom = 200;
    private readonly _zoomStep = 10;

    constructor(private readonly _extensionUri: vscode.Uri) {
        this._zoomLevel = this.getDefaultZoomLevel();
        this._md = new MarkdownIt({
            html: true,
            linkify: true,
            typographer: true
        });
        this._theme = this.getInitialTheme();
        this.updateThemeContext();

        const defaultImageRender = this._md.renderer.rules.image ?? ((tokens, idx, options, env, self) => {
            return self.renderToken(tokens, idx, options);
        });

        this._md.renderer.rules.image = (tokens, idx, options, env, self) => {
            const token = tokens[idx];
            const src = token.attrGet('src');

            if (src) {
                const resolvedSrc = this.resolveImageSource(src, env as MarkdownRenderEnv);
                if (resolvedSrc) {
                    token.attrSet('src', resolvedSrc);
                }
            }

            return defaultImageRender(tokens, idx, options, env, self);
        };
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
            localResourceRoots: this.getLocalResourceRoots()
        };

        this.updateCanPinContext();
        this.updateCanEditContext();
        this.updatePinContext();
        void this.updatePreview();
    }

    public refresh() {
        void this.updatePreview();
    }

    public useLightTheme(): void {
        this.setTheme('light');
    }

    public useDarkTheme(): void {
        this.setTheme('dark');
    }

    public zoomIn(): void {
        this.applyZoomChange(this._zoomLevel + this._zoomStep);
    }

    public zoomOut(): void {
        this.applyZoomChange(this._zoomLevel - this._zoomStep);
    }

    public resetZoom(): void {
        this.applyZoomChange(this.getDefaultZoomLevel());
    }

    public onConfigurationChanged(): void {
        this.applyZoomChange(this.getDefaultZoomLevel(), true);
    }

    public async updatePreview(): Promise<void> {
        if (!this._view) {
            console.log('No webview available');
            return;
        }

        let targetDocument: vscode.TextDocument | undefined;

        if (this._isPinned && this._pinnedUri) {
            try {
                targetDocument = await vscode.workspace.openTextDocument(this._pinnedUri);
            } catch (error) {
                console.warn('Failed to open pinned document:', error);
                this.clearPin();
            }
        }

        if (!targetDocument) {
            const activeEditor = vscode.window.activeTextEditor;
            if (!activeEditor) {
                console.log('No active editor');
                this.setCanPin(false);
                this.setCanEdit(false);
                this.renderEmptyState();
                return;
            }
            targetDocument = activeEditor.document;
        }

        if (targetDocument.languageId !== 'markdown') {
            console.log('Document is not markdown:', targetDocument.languageId);
            if (this._isPinned) {
                this.clearPin();
            }
            this.setCanPin(false);
            this.setCanEdit(false);
            this.renderEmptyState();
            return;
        }

        console.log('Updating markdown preview');
        const fileName = path.basename(targetDocument.fileName) || 'Untitled';
        if (this._isPinned) {
            this._pinnedFileName = fileName;
        }
        this.updateViewTitle(fileName);
        this._currentPreviewUri = targetDocument.uri;
        this.updateEditAvailability(targetDocument.uri);

        this._view.webview.options = {
            enableScripts: true,
            localResourceRoots: this.getLocalResourceRoots(targetDocument.uri)
        };

        const markdownContent = targetDocument.getText();
        const env: MarkdownRenderEnv = {
            webview: this._view.webview,
            documentUri: targetDocument.uri
        };
        const htmlContent = this._md.render(markdownContent, env);
        this.setCanPin(true);
        this._view.webview.html = this.getWebviewContent(this._view.webview, htmlContent);
    }

    public async togglePin(): Promise<void> {
        if (this._isPinned) {
            await this.unpin();
            return;
        }

        await this.pin();
    }

    public isPinnedDocument(uri: vscode.Uri): boolean {
        return this._isPinned && !!this._pinnedUri && this._pinnedUri.toString() === uri.toString();
    }

    public async pin(): Promise<void> {
        const activeEditor = vscode.window.activeTextEditor;
        if (!activeEditor || activeEditor.document.languageId !== 'markdown') {
            void vscode.window.showInformationMessage('Pinning is only available for Markdown files.');
            return;
        }

        this._isPinned = true;
        this._pinnedUri = activeEditor.document.uri;
        this._pinnedFileName = path.basename(activeEditor.document.fileName) || 'Untitled';
        this.updatePinContext();
        await this.updatePreview();
    }

    public async unpin(): Promise<void> {
        if (!this._isPinned) {
            return;
        }

        this.clearPin();
        await this.updatePreview();
    }

    private clearPin(): void {
        if (!this._isPinned && !this._pinnedUri) {
            return;
        }
        this._isPinned = false;
        this._pinnedUri = undefined;
        this._pinnedFileName = undefined;
        this._currentPreviewUri = undefined;
        this.setCanEdit(false);
        this.updatePinContext();
    }

    private updatePinContext(): void {
        void vscode.commands.executeCommand('setContext', 'markdownPreview:isPinned', this._isPinned);
    }

    private setCanPin(value: boolean): void {
        if (this._canPin === value) {
            return;
        }
        this._canPin = value;
        this.updateCanPinContext();
    }

    private updateCanPinContext(): void {
        void vscode.commands.executeCommand('setContext', 'markdownPreview:canPin', this._canPin);
    }

    private setCanEdit(value: boolean): void {
        if (this._canEdit === value) {
            return;
        }
        this._canEdit = value;
        this.updateCanEditContext();
    }

    private updateCanEditContext(): void {
        void vscode.commands.executeCommand('setContext', 'markdownPreview:canEdit', this._canEdit);
    }

    private updateEditAvailability(targetDocumentUri?: vscode.Uri): void {
        if (!targetDocumentUri) {
            this.setCanEdit(false);
            return;
        }

        const activeUri = vscode.window.activeTextEditor?.document.uri;
        const isDifferent = !activeUri || activeUri.toString() !== targetDocumentUri.toString();
        this.setCanEdit(isDifferent);
    }

    private renderEmptyState(): void {
        if (!this._view) {
            return;
        }
        this.updateViewTitle();
        this._view.webview.options = {
            enableScripts: true,
            localResourceRoots: this.getLocalResourceRoots()
        };
        this.setCanPin(false);
        this.setCanEdit(false);
        this._currentPreviewUri = undefined;
        this._view.webview.html = this.getEmptyHtml(this._view.webview);
    }

    private applyZoomChange(targetZoom: number, forceUpdate = false): void {
        const clamped = this.clampZoom(targetZoom);
        if (!forceUpdate && this._zoomLevel === clamped) {
            return;
        }
        this._zoomLevel = clamped;
        void this.updatePreview();
    }

    private clampZoom(value: number): number {
        if (Number.isNaN(value)) {
            return this.getDefaultZoomLevel();
        }
        return Math.max(this._minZoom, Math.min(this._maxZoom, value));
    }

    private setTheme(theme: PreviewTheme): void {
        if (this._theme === theme) {
            return;
        }
        this._theme = theme;
        this.updateThemeContext();
        void this.updatePreview();
    }

    private getInitialTheme(): PreviewTheme {
        const kind = vscode.window.activeColorTheme.kind;
        if (kind === vscode.ColorThemeKind.Dark || kind === vscode.ColorThemeKind.HighContrast) {
            return 'dark';
        }
        return 'light';
    }

    private updateThemeContext(): void {
        void vscode.commands.executeCommand('setContext', 'markdownPreview:isDarkTheme', this._theme === 'dark');
    }

    private getThemeClass(): string {
        return this._theme === 'dark' ? 'theme-dark' : 'theme-light';
    }

    private getDefaultZoomLevel(): number {
        const config = vscode.workspace.getConfiguration('markdownPreview');
        const defaultZoom = config.get<number>('defaultZoomLevel', 100);
        return Math.max(this._minZoom, Math.min(this._maxZoom, defaultZoom));
    }

    public async edit(): Promise<void> {
        if (!this._currentPreviewUri) {
            void vscode.window.showInformationMessage('No Markdown preview available to edit.');
            return;
        }

        try {
            const document = await vscode.workspace.openTextDocument(this._currentPreviewUri);
            await vscode.window.showTextDocument(document, { preview: false });
        } catch (error) {
            console.warn('Failed to open document for editing:', error);
            void vscode.window.showErrorMessage('Unable to open the Markdown document for editing.');
        }
    }

    private updateViewTitle(fileName?: string): void {
        if (!this._view) {
            return;
        }

        if (this._isPinned) {
            const label = fileName ?? this._pinnedFileName ?? '';
            this._view.title = label;
            return;
        }

        const label = fileName ?? '';
        this._view.title = label;
    }

    private resolveImageSource(src: string, env: MarkdownRenderEnv): string | undefined {
        const webview = env.webview;
        const documentUri = env.documentUri;

        if (!webview || !documentUri) {
            return undefined;
        }

        if (/^(https?:|data:)/i.test(src)) {
            return src;
        }

        if (/^file:/i.test(src)) {
            try {
                const fileUri = vscode.Uri.parse(src);
                if (fileUri.scheme === 'file') {
                    return webview.asWebviewUri(fileUri).toString();
                }
            } catch (error) {
                console.warn('Failed to parse file URI for image src:', error);
                return src;
            }
        }

        if (documentUri.scheme !== 'file') {
            return src;
        }

        const fragmentSplit = src.split('#');
        const pathWithQuery = fragmentSplit.shift() ?? '';
        const fragment = fragmentSplit.length > 0 ? '#' + fragmentSplit.join('#') : '';

        const querySplit = pathWithQuery.split('?');
        const relativePath = querySplit.shift() ?? '';
        const query = querySplit.length > 0 ? '?' + querySplit.join('?') : '';

        if (!relativePath) {
            return src;
        }

        const docDir = path.dirname(documentUri.fsPath);
        const workspaceFolder = vscode.workspace.getWorkspaceFolder(documentUri);

        const ensureWorkspacePath = (inputPath: string): string | undefined => {
            if (!workspaceFolder) {
                const workspaceFolders = vscode.workspace.workspaceFolders;
                if (!workspaceFolders || workspaceFolders.length === 0) {
                    return undefined;
                }
                return path.join(workspaceFolders[0].uri.fsPath, inputPath);
            }
            return path.join(workspaceFolder.uri.fsPath, inputPath);
        };

        const normalizedRelativePath = relativePath.replace(/^[/\\]+/, '');

        let diskPath: string | undefined;
        if (relativePath.startsWith('/') || relativePath.startsWith('\\')) {
            diskPath = ensureWorkspacePath(normalizedRelativePath);
        }

        if (!diskPath) {
            diskPath = path.isAbsolute(relativePath)
                ? relativePath
                : path.resolve(docDir, relativePath);
        }

        if (!diskPath) {
            return src;
        }

        const fileUri = vscode.Uri.file(diskPath);
        const webviewUri = webview.asWebviewUri(fileUri).toString();

        return `${webviewUri}${query}${fragment}`;
    }

    private getLocalResourceRoots(documentUri?: vscode.Uri): vscode.Uri[] {
        const roots = [this._extensionUri];
        const workspaceFolders = vscode.workspace.workspaceFolders ?? [];
        for (const folder of workspaceFolders) {
            roots.push(folder.uri);
        }
        if (documentUri?.scheme === 'file') {
            roots.push(vscode.Uri.file(path.dirname(documentUri.fsPath)));
        }
        return roots;
    }

    private getWebviewContent(webview: vscode.Webview, htmlContent: string): string {
        const themeClass = this.getThemeClass();
        const colorScheme = this._theme === 'dark' ? 'dark' : 'light';
        const fontSize = Math.max(this._minZoom, Math.min(this._maxZoom, this._zoomLevel)) / 100;
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${webview.cspSource} https: http: data:; style-src ${webview.cspSource} 'unsafe-inline';">
    <title>Markdown Preview</title>
    <style>
        :root {
            color-scheme: ${colorScheme};
        }

        body.theme-light {
            --md-background: #ffffff;
            --md-foreground: #1e1e1e;
            --md-heading-border: #d0d4d9;
            --md-code-background: #f5f7fa;
            --md-code-foreground: #1e1e1e;
            --md-quote-border: #c8ccd0;
            --md-quote-background: #f0f3f6;
            --md-table-border: #d0d4d9;
            --md-table-header-background: #f5f7fa;
            --md-link: #115ea3;
        }

        body.theme-dark {
            --md-background: #1e1e1e;
            --md-foreground: #d4d4d4;
            --md-heading-border: #303030;
            --md-code-background: #252526;
            --md-code-foreground: #dcdcdc;
            --md-quote-border: #3f3f46;
            --md-quote-background: #252526;
            --md-table-border: #3f3f46;
            --md-table-header-background: #2d2d2d;
            --md-link: #3794ff;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: var(--md-foreground);
            background-color: var(--md-background);
            padding: 16px;
            margin: 0;
            font-size: ${fontSize}em;
        }
        
        h1, h2, h3, h4, h5, h6 {
            color: var(--md-foreground);
            margin-top: 24px;
            margin-bottom: 16px;
        }
        
        h1 { border-bottom: 1px solid var(--md-heading-border); }
        h2 { border-bottom: 1px solid var(--md-heading-border); }
        
        code {
            background-color: var(--md-code-background);
            color: var(--md-code-foreground);
            padding: 2px 4px;
            border-radius: 3px;
            font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
        }
        
        pre {
            background-color: var(--md-code-background);
            color: var(--md-code-foreground);
            padding: 16px;
            border-radius: 6px;
            overflow-x: auto;
            font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New', monospace;
        }
        
        blockquote {
            border-left: 4px solid var(--md-quote-border);
            background-color: var(--md-quote-background);
            margin: 16px 0;
            padding: 8px 16px;
        }
        
        table {
            border-collapse: collapse;
            width: 100%;
            margin: 16px 0;
        }
        
        th, td {
            border: 1px solid var(--md-table-border);
            padding: 8px 12px;
            text-align: left;
        }
        
        th {
            background-color: var(--md-table-header-background);
            font-weight: bold;
        }
        
        a {
            color: var(--md-link);
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
<body class="${themeClass}">
    ${htmlContent}
</body>
</html>`;
    }

    private getEmptyHtml(webview: vscode.Webview): string {
        const themeClass = this.getThemeClass();
        const colorScheme = this._theme === 'dark' ? 'dark' : 'light';
        const fontSize = Math.max(this._minZoom, Math.min(this._maxZoom, this._zoomLevel)) / 100;
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${webview.cspSource} https: http: data:; style-src ${webview.cspSource} 'unsafe-inline';">
    <title>Markdown Preview</title>
    <style>
        :root {
            color-scheme: ${colorScheme};
        }

        body.theme-light {
            --md-background: #ffffff;
            --md-foreground: #4a5568;
        }

        body.theme-dark {
            --md-background: #1e1e1e;
            --md-foreground: #a0aec0;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            color: var(--md-foreground);
            background-color: var(--md-background);
            padding: 16px;
            margin: 0;
            text-align: center;
            font-size: ${fontSize}em;
        }
    </style>
</head>
<body class="${themeClass}">
    <p>Open a Markdown file to display the preview.</p>
</body>
</html>`;
    }
}
