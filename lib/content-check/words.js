// Word count and the fixed choices of SC-03 (M2 FR-005, D12) with no Node built-in, so client components can use them.
export const MIN_WORDS = 20;
export const MAX_WORDS = 200;
export const FLAG_KEYS = Object.freeze(['real_person', 'military', 'heritage_site']);
export const FLAG_VALUES = Object.freeze(['yes', 'no', 'unsure']);

export const normalise = (text) => String(text ?? '').trim().replace(/\s+/g, ' ');
export const countWords = (text) => (normalise(text) ? normalise(text).split(' ').length : 0);
