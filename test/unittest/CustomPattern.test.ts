'use strict';

import { ensureTransparentBackground } from '../../src/ColorUtils';

describe('ensureTransparentBackground', () => {

    // ── undefined / empty ────────────────────────────────────────────────────

    it('returns undefined for undefined input', () => {
        expect(ensureTransparentBackground(undefined)).toBeUndefined();
    });

    it('returns empty string for empty string input', () => {
        expect(ensureTransparentBackground('')).toBe('');
    });

    // ── #RGB (3-digit hex, fully opaque) ────────────────────────────────────

    it('converts #RGB to rgba with default alpha', () => {
        expect(ensureTransparentBackground('#f00')).toBe('rgba(255, 0, 0, 0.7)');
    });

    it('converts #RGB (uppercase) to rgba with default alpha', () => {
        expect(ensureTransparentBackground('#F00')).toBe('rgba(255, 0, 0, 0.7)');
    });

    // ── #RGBA (4-digit hex, already has alpha) ──────────────────────────────

    it('leaves #RGBA unchanged', () => {
        expect(ensureTransparentBackground('#f008')).toBe('#f008');
    });

    // ── #RRGGBB (6-digit hex, fully opaque) ─────────────────────────────────

    it('converts #RRGGBB to rgba with default alpha', () => {
        expect(ensureTransparentBackground('#ff0000')).toBe('rgba(255, 0, 0, 0.7)');
    });

    it('converts #RRGGBB (uppercase) to rgba with default alpha', () => {
        expect(ensureTransparentBackground('#FF0000')).toBe('rgba(255, 0, 0, 0.7)');
    });

    it('converts a mid-range #RRGGBB colour correctly', () => {
        expect(ensureTransparentBackground('#1a2b3c')).toBe('rgba(26, 43, 60, 0.7)');
    });

    // ── #RRGGBBAA (8-digit hex) ──────────────────────────────────────────────

    it('converts fully-opaque #RRGGBBAA (ff) to rgba with default alpha', () => {
        expect(ensureTransparentBackground('#ff0000ff')).toBe('rgba(255, 0, 0, 0.7)');
    });

    it('leaves #RRGGBBAA unchanged when alpha is already < 1', () => {
        expect(ensureTransparentBackground('#ff000080')).toBe('#ff000080');
    });

    it('leaves #RRGGBBAA unchanged when alpha is 0 (fully transparent)', () => {
        expect(ensureTransparentBackground('#ff000000')).toBe('#ff000000');
    });

    // ── rgb() ────────────────────────────────────────────────────────────────

    it('converts rgb() to rgba with default alpha', () => {
        expect(ensureTransparentBackground('rgb(255, 0, 0)')).toBe('rgba(255, 0, 0, 0.7)');
    });

    it('converts rgb() with extra whitespace to rgba with default alpha', () => {
        expect(ensureTransparentBackground('rgb( 255 , 0 , 0 )')).toBe('rgba(255, 0, 0, 0.7)');
    });

    // ── rgba() ───────────────────────────────────────────────────────────────

    it('converts rgba() with alpha=1 to rgba with default alpha', () => {
        expect(ensureTransparentBackground('rgba(255, 0, 0, 1)')).toBe('rgba(255, 0, 0, 0.7)');
    });

    it('converts rgba() with alpha=1.0 to rgba with default alpha', () => {
        expect(ensureTransparentBackground('rgba(255, 0, 0, 1.0)')).toBe('rgba(255, 0, 0, 0.7)');
    });

    it('leaves rgba() unchanged when alpha is already < 1', () => {
        expect(ensureTransparentBackground('rgba(255, 0, 0, 0.5)')).toBe('rgba(255, 0, 0, 0.5)');
    });

    it('leaves rgba() unchanged when alpha is 0', () => {
        expect(ensureTransparentBackground('rgba(255, 0, 0, 0)')).toBe('rgba(255, 0, 0, 0)');
    });

    // ── Unknown / named colours ──────────────────────────────────────────────

    it('returns unknown colour strings unchanged', () => {
        expect(ensureTransparentBackground('red')).toBe('red');
    });

    it('returns hsl() strings unchanged (unsupported format)', () => {
        expect(ensureTransparentBackground('hsl(0, 100%, 50%)')).toBe('hsl(0, 100%, 50%)');
    });
});
