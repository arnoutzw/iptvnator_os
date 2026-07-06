/**
 * DOM helpers for TV-remote navigation: which elements can receive the TV
 * focus, where navigation is scoped (topmost dialog vs. page), and which
 * contexts must keep native arrow-key behavior (menus, selects, sliders,
 * text inputs).
 */
export const TV_FOCUSABLE_SELECTOR = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]',
].join(', ');

/**
 * Contexts that implement their own arrow-key handling (Material menus,
 * select/autocomplete panels, sliders, radio groups, tab lists). While focus
 * is inside one of these, the spatial engine stays hands-off.
 */
const SELF_NAVIGATING_CONTEXT_SELECTOR = [
    '[role="menu"]',
    '[role="menubar"]',
    '[role="listbox"]',
    '[role="slider"]',
    '[role="radiogroup"]',
    '[role="tablist"]',
    '.mat-mdc-menu-panel',
    '.mat-mdc-select-panel',
    '.mat-mdc-autocomplete-panel',
    'mat-slider',
].join(', ');

export function isEditableTarget(element: Element | null): boolean {
    if (!(element instanceof HTMLElement)) {
        return false;
    }
    if (
        element instanceof HTMLTextAreaElement ||
        element instanceof HTMLSelectElement
    ) {
        return true;
    }
    if (element instanceof HTMLInputElement) {
        return !['checkbox', 'radio', 'button', 'submit', 'range'].includes(
            element.type
        );
    }
    return element.isContentEditable;
}

export function isInsideSelfNavigatingContext(
    element: Element | null
): boolean {
    return Boolean(element?.closest(SELF_NAVIGATING_CONTEXT_SELECTOR));
}

/**
 * When a CDK overlay (dialog, menu, …) is open, spatial navigation is scoped
 * to the topmost pane so focus cannot escape behind a modal. Returns null when
 * no overlay pane is open.
 */
export function getTopmostOverlayPane(doc: Document): HTMLElement | null {
    const panes = doc.querySelectorAll<HTMLElement>(
        '.cdk-overlay-container .cdk-overlay-pane'
    );
    for (let i = panes.length - 1; i >= 0; i--) {
        const pane = panes[i];
        if (pane.childElementCount > 0 && isElementVisible(pane)) {
            return pane;
        }
    }
    return null;
}

export function isElementVisible(element: HTMLElement): boolean {
    if (element.closest('[aria-hidden="true"], [inert]')) {
        return false;
    }
    const rects = element.getClientRects();
    if (rects.length === 0) {
        return false;
    }
    const rect = rects[0];
    return rect.width > 0 && rect.height > 0;
}

/**
 * Collect the elements the TV focus can land on inside `root`. `tabindex=-1`
 * elements are programmatic focus targets, not remote stops, so they are
 * excluded.
 */
export function collectTvFocusCandidates(root: HTMLElement): HTMLElement[] {
    const elements = Array.from(
        root.querySelectorAll<HTMLElement>(TV_FOCUSABLE_SELECTOR)
    );

    return elements.filter((element) => {
        if (element.getAttribute('tabindex') === '-1') {
            return false;
        }
        if (element.getAttribute('aria-disabled') === 'true') {
            return false;
        }
        return isElementVisible(element);
    });
}

/**
 * Native interactive elements fire click on Enter themselves, and the app's
 * custom tiles (channel list items, content cards, EPG rows) bind their own
 * `keydown.enter` — synthesizing a click for any of them would
 * double-activate. The only elements that genuinely need help are
 * checkbox/radio inputs, which natively only toggle on Space — a key TV
 * remotes don't have.
 */
export function needsSyntheticEnterClick(element: HTMLElement): boolean {
    return (
        element instanceof HTMLInputElement &&
        (element.type === 'checkbox' || element.type === 'radio')
    );
}
