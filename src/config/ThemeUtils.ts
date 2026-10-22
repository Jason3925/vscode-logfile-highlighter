'use strict';

import { ColorPair } from './PatternTypes';

export const DEFAULT_THEME_NAME = 'Default';

export const DEFAULT_THEME_COLORS: ColorPair[] = [
    { foreground: '#e74c3c', background: '#e74c3c40' },
    { foreground: '#e67e22', background: '#e67e2240' },
    { foreground: '#f1c40f', background: '#f1c40f40' },
    { foreground: '#2ecc71', background: '#2ecc7140' },
    { foreground: '#1abc9c', background: '#1abc9c40' },
    { foreground: '#3498db', background: '#3498db40' },
    { foreground: '#9b59b6', background: '#9b59b640' },
    { foreground: '#e91e63', background: '#e91e6340' },
    { foreground: '#00bcd4', background: '#00bcd440' },
    { foreground: '#ff9800', background: '#ff980040' }
];

function normalizeColor(value: string | undefined): string {
    return (value || '').trim().toLowerCase();
}

function colorKey(foreground: string | undefined, background: string | undefined): string {
    return `${normalizeColor(foreground)}|${normalizeColor(background)}`;
}

/**
 * Picks the first theme color pair that is not already used by an existing pattern.
 * When every theme color is used, cycles by pattern count.
 */
export function pickUnusedColor(
    patterns: Array<{ foreground?: string; background?: string }>,
    themeColors: ColorPair[]): ColorPair {

    if (!themeColors || themeColors.length === 0) {
        return DEFAULT_THEME_COLORS[0];
    }

    const used = new Set(
        patterns.map((p) => colorKey(p.foreground, p.background)));

    for (const color of themeColors) {
        if (!used.has(colorKey(color.foreground, color.background))) {
            return { ...color };
        }
    }

    return { ...themeColors[patterns.length % themeColors.length] };
}

const HEX_COLOR = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

export function parseThemeColorsJson(jsonText: string): ColorPair[] {
    let parsed: unknown;
    try {
        parsed = JSON.parse(jsonText);
    } catch (err) {
        throw new Error('Invalid JSON: ' + err);
    }

    if (!Array.isArray(parsed) || parsed.length === 0) {
        throw new Error('Theme JSON must be a non-empty array of { foreground, background } objects.');
    }

    const colors: ColorPair[] = [];
    for (let i = 0; i < parsed.length; i++) {
        const item = parsed[i] as { foreground?: string; background?: string };
        if (!item || typeof item.foreground !== 'string' || typeof item.background !== 'string') {
            throw new Error(`Theme color at index ${i} must include string foreground and background.`);
        }
        if (!HEX_COLOR.test(item.foreground.trim()) || !HEX_COLOR.test(item.background.trim())) {
            throw new Error(`Theme color at index ${i} must use hex colors (e.g. #rrggbb or #rrggbbaa).`);
        }
        colors.push({
            foreground: item.foreground.trim(),
            background: item.background.trim()
        });
    }
    return colors;
}
