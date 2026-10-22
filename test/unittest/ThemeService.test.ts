'use strict';

import { pickUnusedColor, parseThemeColorsJson, DEFAULT_THEME_COLORS } from '../../src/config/ThemeUtils';
import { filterActivePatterns, hasHighlightStyle } from '../../src/config/PatternTypes';

describe('pickUnusedColor', () => {

    it('returns the first theme color when no patterns exist', () => {
        const color = pickUnusedColor([], DEFAULT_THEME_COLORS);
        expect(color).toEqual(DEFAULT_THEME_COLORS[0]);
    });

    it('skips colors already used by patterns', () => {
        const patterns = [
            {
                foreground: DEFAULT_THEME_COLORS[0].foreground,
                background: DEFAULT_THEME_COLORS[0].background
            }
        ];
        const color = pickUnusedColor(patterns, DEFAULT_THEME_COLORS);
        expect(color).toEqual(DEFAULT_THEME_COLORS[1]);
    });

    it('matches used colors case-insensitively', () => {
        const patterns = [
            {
                foreground: DEFAULT_THEME_COLORS[0].foreground.toUpperCase(),
                background: DEFAULT_THEME_COLORS[0].background.toUpperCase()
            }
        ];
        const color = pickUnusedColor(patterns, DEFAULT_THEME_COLORS);
        expect(color).toEqual(DEFAULT_THEME_COLORS[1]);
    });

    it('cycles when all theme colors are used', () => {
        const patterns = DEFAULT_THEME_COLORS.map((c) => ({
            foreground: c.foreground,
            background: c.background
        }));
        const color = pickUnusedColor(patterns, DEFAULT_THEME_COLORS);
        expect(color).toEqual(DEFAULT_THEME_COLORS[patterns.length % DEFAULT_THEME_COLORS.length]);
    });

    it('falls back to default theme when theme list is empty', () => {
        const color = pickUnusedColor([], []);
        expect(color).toEqual(DEFAULT_THEME_COLORS[0]);
    });
});

describe('parseThemeColorsJson', () => {

    it('parses a valid theme color array', () => {
        const json = JSON.stringify([
            { foreground: '#ff0000', background: '#ff000040' },
            { foreground: '#00ff00', background: '#00ff0040' }
        ]);
        const colors = parseThemeColorsJson(json);
        expect(colors.length).toBe(2);
        expect(colors[0].foreground).toBe('#ff0000');
    });

    it('rejects invalid JSON', () => {
        expect(() => parseThemeColorsJson('{')).toThrowError(/Invalid JSON/);
    });

    it('rejects empty arrays', () => {
        expect(() => parseThemeColorsJson('[]')).toThrowError(/non-empty array/);
    });

    it('rejects non-hex colors', () => {
        expect(() => parseThemeColorsJson(JSON.stringify([
            { foreground: 'red', background: '#00ff00' }
        ]))).toThrowError(/hex colors/);
    });
});

describe('filterActivePatterns', () => {

    const sample = [
        { pattern: 'ERROR', foreground: '#ff0000', enabled: true },
        { pattern: 'WARN', foreground: '#ffff00', enabled: false },
        { pattern: 'INFO', foreground: '#00ff00' },
        { pattern: 'PLAIN' }
    ];

    it('returns empty list when custom patterns are globally disabled', () => {
        expect(filterActivePatterns(sample, false)).toEqual([]);
    });

    it('skips disabled patterns and items without style', () => {
        const active = filterActivePatterns(sample, true);
        expect(active.map((p) => p.pattern)).toEqual(['ERROR', 'INFO']);
    });

    it('treats missing enabled as enabled', () => {
        expect(hasHighlightStyle({ pattern: 'x', foreground: '#fff' })).toBe(true);
        const active = filterActivePatterns([{ pattern: 'x', foreground: '#fff' }], true);
        expect(active.length).toBe(1);
    });

    it('handles undefined pattern lists', () => {
        expect(filterActivePatterns(undefined, true)).toEqual([]);
    });
});
