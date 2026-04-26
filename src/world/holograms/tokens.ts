/**
 * Shared design tokens for every hologram panel.
 *
 * Keeping these in one file (instead of per-component constants) is
 * what makes Experience, Projects, Skills and Contact read as a
 * single consistent UI language — same header size, same body
 * line-height, same colour ramp for hierarchy.
 */

// --- Font sizes (world units, before panel scale is applied) -----

/** Top strip, e.g. "EXPERIENCE · TIMELINE". Dense caps, wide tracking. */
export const HOLO_FONT_HEADER = 0.13;
/** Active item name, e.g. "Formica AI" / "Vocabuddy". */
export const HOLO_FONT_TITLE = 0.11;
/** Subtitle line under title, e.g. role, year range, tagline. */
export const HOLO_FONT_SUBTITLE = 0.074;
/** Horizontal tab strip labels. */
export const HOLO_FONT_TAB = 0.078;
/** Body bullet rows — this is the line visitors actually read. */
export const HOLO_FONT_BODY = 0.076;
/** Tech stack / footer caption. */
export const HOLO_FONT_CAPTION = 0.07;

// --- Letter spacing ----------------------------------------------

export const HOLO_LETTER_HEADER = 0.16;
export const HOLO_LETTER_TAB = 0.1;
export const HOLO_LETTER_CAPTION = 0.08;

// --- Vertical rhythm (panel-local Y offsets) --------------------

/** Header Y offset from the top edge of the panel (positive = down). */
export const HOLO_OFFSET_HEADER = 0.22;
/** Title Y offset from the top edge. */
export const HOLO_OFFSET_TITLE = 0.42;
/** Subtitle Y offset from the top edge. */
export const HOLO_OFFSET_SUBTITLE = 0.58;
/** Tab row Y position: `PANEL_H / 2 - HOLO_OFFSET_TAB_ROW`. */
export const HOLO_OFFSET_TAB_ROW = 0.85;
/** Vertical gap between body bullet rows. */
export const HOLO_BULLET_GAP = 0.2;
/** Distance from tab-row baseline to the first bullet row. */
export const HOLO_BULLETS_START_GAP = 0.34;
/** Footer caption Y offset from the bottom edge. */
export const HOLO_OFFSET_CAPTION = 0.24;

// --- Palette ----------------------------------------------------

/** Active text / body copy — nearly-white with a cool tint. */
export const HOLO_COLOR_BODY = "#EEF4FF";
/** Secondary copy — subtitles, titles when not accent. */
export const HOLO_COLOR_SOFT = "#E6EEFF";
/** Tertiary copy — years, timestamps. Colder tone. */
export const HOLO_COLOR_MUTED = "#B8C4E0";

// --- Fill opacities ---------------------------------------------

export const HOLO_ALPHA_HEADER = 1;
export const HOLO_ALPHA_TITLE = 0.95;
export const HOLO_ALPHA_SUBTITLE = 0.72;
export const HOLO_ALPHA_MUTED = 0.7;
export const HOLO_ALPHA_BODY = 0.94;
export const HOLO_ALPHA_CAPTION = 0.82;
export const HOLO_ALPHA_TAB_INACTIVE = 0.55;
export const HOLO_ALPHA_TAB_ACTIVE = 1;
