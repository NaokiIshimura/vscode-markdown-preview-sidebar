# Markdown Sidebar Panel Previewer

VSCodeでマークダウンファイルのプレビューを拡張機能パネル内に表示する拡張機能です。

## 機能

- エクスプローラーパネル内にマークダウンプレビューを表示
- アクティブなマークダウンファイルの内容をリアルタイムで更新
- VSCodeのテーマに対応したスタイリング
- 手動更新ボタン

## 使用方法

1. マークダウンファイル（.md）を開く
2. エクスプローラーパネルの「Markdown Preview」セクションでプレビューを確認
3. ファイルを編集すると自動的にプレビューが更新されます

## 開発

```bash
# 依存関係のインストール
npm install

# コンパイル
npm run compile

# 監視モード
npm run watch
```

## インストール

1. VSCodeの拡張機能ビュー（`Ctrl+Shift+X`）で「Markdown Sidebar Panel Previewer」を検索してインストール
2. インストール完了後にVSCodeを再読み込み
3. 任意のマークダウンファイルを開くと、エクスプローラーパネルにプレビューが表示されます

### コマンドラインからインストールする場合

```bash
# VSCodeのCLIを使ってVSIXをインストール
code --install-extension releases/markdown-preview-panel-0.0.1.vsix
```

VSCodeのCLIが未設定の場合は、VSCodeのコマンドパレットで「Shell Command: Install 'code' command in PATH」を実行してください。

GitHubリリースで自動ビルドされたVSIXを利用する場合は、先に[最新リリース](https://github.com/NaokiIshimura/vscode-markdown-sidebar-panel-previewer/releases/latest)からVSIXをダウンロードし、上記コマンドのパスに指定してください。

### VSIXファイルからインストールする場合

1. [最新リリース](https://github.com/NaokiIshimura/vscode-markdown-sidebar-panel-previewer/releases/latest)に公開される「Release VSIX」ワークフローの自動ビルド成果物（`markdown-sidebar-panel-previewer-x.y.z.vsix`）をダウンロード
2. コマンドパレット（`Ctrl+Shift+P`）で「Extensions: Install from VSIX...」を実行
3. ダウンロードしたVSIXファイルを選択してインストール
4. VSCodeを再読み込みすると拡張機能が有効になります

### 開発者モードで試す場合

1. このフォルダをVSCodeの拡張機能開発環境で開く
2. F5キーを押して新しいVSCodeウィンドウを開く
3. マークダウンファイルを開いて動作を確認

## リリース運用

1. `npm version <patch|minor|major>` でバージョンを更新しコミット・タグを作成
2. 変更をリモートとタグへプッシュ（例: `git push origin main --tags`）
3. GitHubで新しいリリースを公開すると、`Release VSIX`ワークフローが自動でVSIXを生成しリリースアセットへ添付
4. 必要に応じて`Actions`タブから`Release VSIX`ワークフローを手動実行（workflow_dispatch）して再配布できます
5. `main`ブランチに変更がマージされた際や手動実行した場合も同ワークフローが動作し、`v<version>`タグのリリースにVSIXを添付（併せてActionsアーティファクトにも保存）します

リリースページに添付されたVSIXはREADMEのリンクやドキュメントからダウンロード可能です。
