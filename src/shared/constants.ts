// Centralized app constants (UI labels and magic numbers)

// General UI labels
export const LABEL_NEW_BUTTON = 'New';
export const LABEL_NEW_MENU_ITEM = '+ New';
export const LABEL_SEARCH_PLACEHOLDER = 'Search...';
export const LABEL_NO_ITEMS_TITLE = 'No items';
export const LABEL_NO_ITEMS_DESC = 'No drafts found for this container.';
export const LABEL_LOADING_TITLE = 'Loading...';
export const LABEL_LOADING_DRAFTS_DESC = 'Loading drafts...';
export const LABEL_LOADING_OPTIONS_DESC = 'Loading descriptor options...';

// Timings (ms)
export const SAVE_DEBOUNCE_MS = 700;
export const TOAST_TIMEOUT_MS = 3000;
export const MENU_REFRESH_RESET_MS = 2000;

// Grid defaults
export const GRID_PAGINATION_PAGE_SIZE = 25;
export const GRID_PAGINATION_PAGE_SIZE_OPTIONS = [10, 25, 50, 100];
export const GRID_HEIGHT_PX = 600;

// Table inline-edit limits
// Allow shallow normalized objects inline; deeper structures go to drawer/form.
export const MAX_INLINE_OBJECT_FIELDS = 3;
