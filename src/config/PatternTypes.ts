'use strict';

export interface ColorPair {
    foreground: string;
    background: string;
}

export interface CustomPatternConfig {
    pattern: string;
    enabled?: boolean;
    patternFlags?: string;
    highlightEntireLine?: boolean;
    foreground?: string;
    background?: string;
    fontWeight?: string;
    fontStyle?: string;
    border?: string;
    borderRadius?: string;
    borderSpacing?: string;
    letterSpacing?: string;
    overviewColor?: string;
    overviewRulerLane?: string;
    textDecoration?: string;
}

export type ColorThemes = { [name: string]: ColorPair[] };

export function hasHighlightStyle(item: CustomPatternConfig): boolean {
    return item.foreground !== undefined
        || item.background !== undefined
        || item.fontWeight !== undefined
        || item.fontStyle !== undefined
        || item.border !== undefined
        || item.borderRadius !== undefined;
}

/**
 * Returns patterns that should be applied as decorations.
 * - When enableCustomPatterns is false, returns an empty list.
 * - Patterns with enabled === false are skipped (missing enabled means enabled).
 * - Patterns without highlight style are skipped (same rule as before).
 */
export function filterActivePatterns(
    patterns: CustomPatternConfig[] | undefined,
    enableCustomPatterns: boolean): CustomPatternConfig[] {

    if (!enableCustomPatterns || !patterns) {
        return [];
    }

    return patterns.filter((item) => {
        return item.pattern !== undefined
            && item.enabled !== false
            && hasHighlightStyle(item);
    });
}
