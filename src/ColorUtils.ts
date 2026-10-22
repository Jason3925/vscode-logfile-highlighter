'use strict';

// Default alpha value applied to fully-opaque background colors so that the
// editor's built-in selection highlight remains visible through the decoration.
// VSCode renders custom decorations above the selection layer (upstream issue
// microsoft/vscode#287012), so a fully-opaque background completely hides the
// selection indicator. Using a value < 1 lets the selection "bleed through".
export const BACKGROUND_DEFAULT_ALPHA = 0.7;

/**
 * Ensures that a background color string has an alpha value < 1 so that
 * the editor's selection highlight remains visible on top of the decoration.
 *
 * VSCode draws custom decorations above the selection layer, meaning a
 * fully-opaque background color will completely hide the selection indicator
 * (upstream issue: microsoft/vscode#287012). This function detects colors that
 * are fully opaque and adds a default alpha, while leaving already-transparent
 * colors and undefined/null values untouched.
 *
 * Supported input formats:
 *   #RGB  #RRGGBB  #RGBA  #RRGGBBAA
 *   rgb(r, g, b)  rgba(r, g, b, a)
 *
 * @param color - The CSS color string to process (may be undefined).
 * @returns A color string with alpha < 1, or the original value if it already
 *          has transparency or is not a recognised format.
 */
export function ensureTransparentBackground(color: string | undefined): string | undefined {
    if (!color) {
        return color;
    }

    const trimmed = color.trim();

    // ── Hex colours ──────────────────────────────────────────────────────────
    const hexMatch = trimmed.match(/^#([0-9a-fA-F]+)$/);
    if (hexMatch) {
        const hex = hexMatch[1];

        if (hex.length === 3) {
            // #RGB → fully opaque, add alpha
            const [r, g, b] = [hex[0], hex[1], hex[2]].map(c => parseInt(c + c, 16));
            return `rgba(${r}, ${g}, ${b}, ${BACKGROUND_DEFAULT_ALPHA})`;
        }

        if (hex.length === 4) {
            // #RGBA → already has alpha; leave as-is
            return color;
        }

        if (hex.length === 6) {
            // #RRGGBB → fully opaque, add alpha
            const r = parseInt(hex.slice(0, 2), 16);
            const g = parseInt(hex.slice(2, 4), 16);
            const b = parseInt(hex.slice(4, 6), 16);
            return `rgba(${r}, ${g}, ${b}, ${BACKGROUND_DEFAULT_ALPHA})`;
        }

        if (hex.length === 8) {
            // #RRGGBBAA → check if AA is ff (fully opaque)
            const alpha = parseInt(hex.slice(6, 8), 16) / 255;
            if (alpha >= 1) {
                const r = parseInt(hex.slice(0, 2), 16);
                const g = parseInt(hex.slice(2, 4), 16);
                const b = parseInt(hex.slice(4, 6), 16);
                return `rgba(${r}, ${g}, ${b}, ${BACKGROUND_DEFAULT_ALPHA})`;
            }
            // Already transparent
            return color;
        }
    }

    // ── rgb() / rgba() ───────────────────────────────────────────────────────
    const rgbMatch = trimmed.match(/^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)$/i);
    if (rgbMatch) {
        const r = rgbMatch[1];
        const g = rgbMatch[2];
        const b = rgbMatch[3];
        const a = rgbMatch[4] !== undefined ? parseFloat(rgbMatch[4]) : 1;

        if (a >= 1) {
            return `rgba(${r}, ${g}, ${b}, ${BACKGROUND_DEFAULT_ALPHA})`;
        }
        // Already transparent
        return color;
    }

    // Unknown / named colour – return unchanged and let VSCode handle it.
    return color;
}
