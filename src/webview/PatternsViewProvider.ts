'use strict';

import * as vscode from 'vscode';
import { ConfigService } from '../config/ConfigService';
import { ThemeService } from '../config/ThemeService';
import { parseThemeColorsJson } from '../config/ThemeUtils';

export class PatternsViewProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'logFileHighlighter.patternsView';

    private _view?: vscode.WebviewView;
    private readonly _configService: ConfigService;
    private readonly _themeService: ThemeService;
    private readonly _extensionUri: vscode.Uri;

    public constructor(
        extensionUri: vscode.Uri,
        configService?: ConfigService,
        themeService?: ThemeService) {

        this._extensionUri = extensionUri;
        this._themeService = themeService || new ThemeService();
        this._configService = configService || new ConfigService(this._themeService);
    }

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        _context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken): void {

        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [
                vscode.Uri.joinPath(this._extensionUri, 'media', 'patternsView')
            ]
        };

        webviewView.webview.html = this.getHtml(webviewView.webview);

        webviewView.webview.onDidReceiveMessage(async (message) => {
            try {
                await this.handleMessage(message);
            } catch (err) {
                const text = err instanceof Error ? err.message : String(err);
                this.post({ type: 'error', message: text });
                vscode.window.showErrorMessage('Log File Highlighter: ' + text);
            }
        });

        this.postState();
    }

    public onConfigurationChanged(): void {
        this.postState();
    }

    private async handleMessage(message: { type: string; [key: string]: any }): Promise<void> {
        switch (message.type) {
            case 'ready':
                this.postState();
                break;
            case 'addPattern': {
                const colors = message.foreground && message.background
                    ? { foreground: message.foreground, background: message.background }
                    : undefined;
                await this._configService.addPattern(message.pattern, colors);
                break;
            }
            case 'editPattern':
                await this._configService.editPattern(message.index, message.pattern);
                break;
            case 'setPatternColor':
                await this._configService.setPatternColor(message.index, {
                    foreground: message.foreground,
                    background: message.background
                });
                break;
            case 'deletePattern':
                await this._configService.deletePattern(message.index);
                break;
            case 'togglePattern':
                await this._configService.togglePattern(message.index, !!message.enabled);
                break;
            case 'toggleAll':
                await this._configService.setCustomPatternsEnabled(!!message.enabled);
                break;
            case 'setActiveTheme':
                await this._themeService.setActiveTheme(message.name);
                break;
            case 'importTheme': {
                const colors = parseThemeColorsJson(message.json || '');
                await this._themeService.importTheme(message.name || '', colors);
                this.post({ type: 'info', message: `Theme "${(message.name || '').trim()}" imported and activated.` });
                break;
            }
            case 'exportTheme':
                this.post({
                    type: 'exportThemeResult',
                    json: this._themeService.exportActiveThemeJson()
                });
                break;
            default:
                break;
        }
    }

    private postState(): void {
        if (!this._view) {
            return;
        }
        const state = this._configService.getState();
        this.post({ type: 'state', ...state });
    }

    private post(message: { type: string; [key: string]: any }): void {
        if (this._view) {
            this._view.webview.postMessage(message);
        }
    }

    private getHtml(webview: vscode.Webview): string {
        const styleUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this._extensionUri, 'media', 'patternsView', 'styles.css'));
        const scriptUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this._extensionUri, 'media', 'patternsView', 'main.js'));
        const nonce = getNonce();

        return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy"
        content="default-src 'none'; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="stylesheet" href="${styleUri}">
  <title>Custom Patterns</title>
</head>
<body>
  <div class="toolbar">
    <label>
      <input id="globalToggle" type="checkbox" checked>
      Enable all patterns
    </label>
    <button id="addPatternBtn">Add Pattern</button>
  </div>

  <div id="addForm" class="add-form" hidden>
    <div class="row">
      <button id="addColorSwatch" type="button" class="swatch swatch-btn" title="Choose color" aria-label="Choose color"></button>
      <input id="addPatternInput" type="text" placeholder="Pattern / regex">
    </div>
    <div class="actions">
      <button id="addPatternConfirm">Add</button>
      <button id="addPatternCancel" class="secondary">Cancel</button>
    </div>
    <div id="addError" class="error"></div>
  </div>

  <div id="colorPalette" class="color-palette" hidden></div>

  <div id="emptyState" class="empty" style="display:none;">
    No custom patterns yet. Click "Add Pattern" to create one.
  </div>
  <ul id="patternList" class="pattern-list"></ul>

  <details class="section theme-section">
    <summary>Themes</summary>
    <div class="theme-body">
      <p class="hint">New patterns default to the next unused color from the active theme.</p>
      <div class="row">
        <label for="themeSelect">Active</label>
        <select id="themeSelect"></select>
      </div>
      <div class="row">
        <input id="themeName" type="text" placeholder="Theme name">
      </div>
      <textarea id="themeJson" placeholder='[{"foreground":"#e74c3c","background":"#e74c3c40"}]'></textarea>
      <div class="actions" style="margin-top:8px;">
        <button id="importThemeBtn">Import Theme</button>
        <button id="exportThemeBtn" class="secondary">Export Current</button>
      </div>
      <div id="themeError" class="error"></div>
    </div>
  </details>

  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
    }
}

function getNonce(): string {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}
