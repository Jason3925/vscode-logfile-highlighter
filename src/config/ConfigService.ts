'use strict';

import * as vscode from 'vscode';
import { ColorPair, CustomPatternConfig } from './PatternTypes';
import { ThemeService } from './ThemeService';

export class ConfigService {
    private readonly _themeService: ThemeService;

    public constructor(themeService?: ThemeService) {
        this._themeService = themeService || new ThemeService();
    }

    private get config(): vscode.WorkspaceConfiguration {
        return vscode.workspace.getConfiguration('logFileHighlighter');
    }

    public getPatterns(): CustomPatternConfig[] {
        return (this.config.get<CustomPatternConfig[]>('customPatterns') || []).slice();
    }

    public isCustomPatternsEnabled(): boolean {
        return this.config.get<boolean>('enableCustomPatterns', true);
    }

    public getState() {
        return {
            patterns: this.getPatterns(),
            enableCustomPatterns: this.isCustomPatternsEnabled(),
            colorThemes: this._themeService.getColorThemes(),
            activeTheme: this._themeService.getActiveThemeName(),
            activeThemeColors: this._themeService.getActiveThemeColors()
        };
    }

    public async setCustomPatternsEnabled(enabled: boolean): Promise<void> {
        await this.config.update('enableCustomPatterns', enabled, vscode.ConfigurationTarget.Global);
    }

    public async setPatterns(patterns: CustomPatternConfig[]): Promise<void> {
        await this.config.update('customPatterns', patterns, vscode.ConfigurationTarget.Global);
    }

    public async addPattern(pattern: string, colors?: ColorPair): Promise<void> {
        const trimmed = pattern.trim();
        if (!trimmed) {
            throw new Error('Pattern cannot be empty.');
        }

        const patterns = this.getPatterns();
        const picked = colors || this._themeService.pickColorForNewPattern(patterns);
        patterns.push({
            pattern: trimmed,
            enabled: true,
            foreground: picked.foreground,
            background: picked.background
        });
        await this.setPatterns(patterns);
    }

    public async editPattern(index: number, pattern: string): Promise<void> {
        const trimmed = pattern.trim();
        if (!trimmed) {
            throw new Error('Pattern cannot be empty.');
        }

        const patterns = this.getPatterns();
        this.assertIndex(index, patterns);
        patterns[index] = { ...patterns[index], pattern: trimmed };
        await this.setPatterns(patterns);
    }

    public async setPatternColor(index: number, colors: ColorPair): Promise<void> {
        if (!colors || !colors.foreground || !colors.background) {
            throw new Error('Both foreground and background are required.');
        }

        const patterns = this.getPatterns();
        this.assertIndex(index, patterns);
        patterns[index] = {
            ...patterns[index],
            foreground: colors.foreground,
            background: colors.background
        };
        await this.setPatterns(patterns);
    }

    public async deletePattern(index: number): Promise<void> {
        const patterns = this.getPatterns();
        this.assertIndex(index, patterns);
        patterns.splice(index, 1);
        await this.setPatterns(patterns);
    }

    public async togglePattern(index: number, enabled: boolean): Promise<void> {
        const patterns = this.getPatterns();
        this.assertIndex(index, patterns);
        patterns[index] = { ...patterns[index], enabled };
        await this.setPatterns(patterns);
    }

    private assertIndex(index: number, patterns: CustomPatternConfig[]): void {
        if (index < 0 || index >= patterns.length) {
            throw new Error(`Pattern index out of range: ${index}`);
        }
    }
}
