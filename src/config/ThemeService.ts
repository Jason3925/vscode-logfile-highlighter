'use strict';

import * as vscode from 'vscode';
import { ColorPair, ColorThemes, CustomPatternConfig } from './PatternTypes';
import {
    DEFAULT_THEME_COLORS,
    DEFAULT_THEME_NAME,
    pickUnusedColor
} from './ThemeUtils';

export {
    DEFAULT_THEME_COLORS,
    DEFAULT_THEME_NAME,
    pickUnusedColor,
    parseThemeColorsJson
} from './ThemeUtils';

export class ThemeService {
    private get config(): vscode.WorkspaceConfiguration {
        return vscode.workspace.getConfiguration('logFileHighlighter');
    }

    public getColorThemes(): ColorThemes {
        const themes = this.config.get<ColorThemes>('colorThemes') || {};
        if (Object.keys(themes).length === 0) {
            return { [DEFAULT_THEME_NAME]: DEFAULT_THEME_COLORS };
        }
        return themes;
    }

    public getActiveThemeName(): string {
        const name = this.config.get<string>('activeTheme') || DEFAULT_THEME_NAME;
        const themes = this.getColorThemes();
        if (themes[name]) {
            return name;
        }
        return Object.keys(themes)[0] || DEFAULT_THEME_NAME;
    }

    public getActiveThemeColors(): ColorPair[] {
        const themes = this.getColorThemes();
        const active = this.getActiveThemeName();
        return themes[active] && themes[active].length > 0
            ? themes[active]
            : DEFAULT_THEME_COLORS;
    }

    public pickColorForNewPattern(patterns: CustomPatternConfig[]): ColorPair {
        return pickUnusedColor(patterns, this.getActiveThemeColors());
    }

    public async setActiveTheme(name: string): Promise<void> {
        const themes = this.getColorThemes();
        if (!themes[name]) {
            throw new Error(`Theme "${name}" does not exist.`);
        }
        await this.config.update('activeTheme', name, vscode.ConfigurationTarget.Global);
    }

    public async importTheme(name: string, colors: ColorPair[]): Promise<void> {
        const trimmed = name.trim();
        if (!trimmed) {
            throw new Error('Theme name cannot be empty.');
        }
        if (!colors || colors.length === 0) {
            throw new Error('Theme must contain at least one color pair.');
        }

        const themes = { ...this.getColorThemes() };
        themes[trimmed] = colors;
        await this.config.update('colorThemes', themes, vscode.ConfigurationTarget.Global);
        await this.config.update('activeTheme', trimmed, vscode.ConfigurationTarget.Global);
    }

    public exportActiveThemeJson(): string {
        return JSON.stringify(this.getActiveThemeColors(), null, 2);
    }
}
