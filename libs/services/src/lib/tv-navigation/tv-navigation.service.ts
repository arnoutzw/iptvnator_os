import { Location } from '@angular/common';
import { inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';
import {
    findBestSpatialCandidate,
    findInitialSpatialCandidate,
    SpatialDirection,
} from './spatial-navigation.util';
import {
    collectTvFocusCandidates,
    getTopmostOverlayPane,
    isEditableTarget,
    isInsideSelfNavigatingContext,
    needsSyntheticEnterClick,
} from './tv-navigation-dom.util';

const ARROW_DIRECTIONS: Record<string, SpatialDirection> = {
    ArrowUp: 'up',
    ArrowDown: 'down',
    ArrowLeft: 'left',
    ArrowRight: 'right',
};

/** Dedicated back keys sent by TV remotes / media keyboards. */
const BACK_KEYS = new Set(['BrowserBack', 'GoBack', 'XF86Back']);

export const TV_NAV_BODY_CLASS = 'tv-nav-active';

/** Workspace roots we never navigate back beyond (the app's "home"). */
const BACK_STOP_PATHS = new Set([
    '/',
    '/workspace',
    '/workspace/dashboard',
    '/workspace/sources',
]);

/**
 * TV-remote navigation: arrow keys move a visible focus spatially, Enter (OK)
 * activates, Escape/Back walks up (blur input → close overlay → exit watch
 * state → router back). Enabled via the `tvRemoteNavigation` setting.
 *
 * Arrows and Enter are intercepted in the capture phase so per-component media
 * shortcuts (volume/seek) cannot double-handle a navigation key; those
 * handlers skip events with `defaultPrevented` set. Contexts with native
 * arrow-key semantics (menus, select panels, sliders, text inputs) are left
 * untouched.
 */
@Injectable({ providedIn: 'root' })
export class TvNavigationService {
    private readonly location = inject(Location);
    private readonly router = inject(Router);

    private enabled = false;

    private readonly onCaptureKeydown = (event: KeyboardEvent): void =>
        this.handleCaptureKeydown(event);
    private readonly onBubbleKeydown = (event: KeyboardEvent): void =>
        this.handleBubbleKeydown(event);

    setEnabled(enabled: boolean): void {
        if (enabled === this.enabled) {
            return;
        }
        this.enabled = enabled;

        if (typeof document === 'undefined') {
            return;
        }

        if (enabled) {
            document.addEventListener('keydown', this.onCaptureKeydown, true);
            document.addEventListener('keydown', this.onBubbleKeydown);
            document.body.classList.add(TV_NAV_BODY_CLASS);
        } else {
            document.removeEventListener(
                'keydown',
                this.onCaptureKeydown,
                true
            );
            document.removeEventListener('keydown', this.onBubbleKeydown);
            document.body.classList.remove(TV_NAV_BODY_CLASS);
        }
    }

    isEnabled(): boolean {
        return this.enabled;
    }

    /** Arrows + OK run in capture phase, before media shortcut handlers. */
    private handleCaptureKeydown(event: KeyboardEvent): void {
        if (
            event.defaultPrevented ||
            event.metaKey ||
            event.ctrlKey ||
            event.altKey
        ) {
            return;
        }

        const direction = ARROW_DIRECTIONS[event.key];
        if (direction) {
            this.handleArrow(event, direction);
            return;
        }

        if (event.key === 'Enter') {
            this.handleEnter(event);
        }
    }

    /** Back runs in bubble phase so dialogs/watch-state handlers go first. */
    private handleBubbleKeydown(event: KeyboardEvent): void {
        if (event.key !== 'Escape' && !BACK_KEYS.has(event.key)) {
            return;
        }
        if (event.defaultPrevented || event.metaKey || event.ctrlKey) {
            return;
        }
        this.handleBack(event);
    }

    private handleArrow(
        event: KeyboardEvent,
        direction: SpatialDirection
    ): void {
        const active = this.getActiveElement();

        if (isEditableTarget(active) || isInsideSelfNavigatingContext(active)) {
            return;
        }

        const root = getTopmostOverlayPane(document) ?? document.body;
        if (active && !root.contains(active)) {
            // Focus is behind a modal — pull it into the overlay.
            this.focusInitialCandidate(root, event);
            return;
        }

        const candidates = collectTvFocusCandidates(root)
            .filter((element) => element !== active)
            .map((element) => ({
                item: element,
                rect: element.getBoundingClientRect(),
            }));

        if (!active || active === document.body) {
            this.focusInitialCandidate(root, event);
            return;
        }

        const target = findBestSpatialCandidate(
            active.getBoundingClientRect(),
            candidates,
            direction
        );

        if (target) {
            event.preventDefault();
            this.moveFocus(target);
        }
    }

    private handleEnter(event: KeyboardEvent): void {
        const active = this.getActiveElement();
        if (
            !(active instanceof HTMLElement) ||
            active === document.body ||
            isInsideSelfNavigatingContext(active) ||
            !needsSyntheticEnterClick(active)
        ) {
            return;
        }

        event.preventDefault();
        active.click();
    }

    private handleBack(event: KeyboardEvent): void {
        const active = this.getActiveElement();

        // 1. An editable field is focused → just leave it.
        if (isEditableTarget(active) && active instanceof HTMLElement) {
            event.preventDefault();
            active.blur();
            return;
        }

        // 2. Native fullscreen → Escape already exits it.
        if (document.fullscreenElement) {
            return;
        }

        // 3. Open overlay (dialog/menu/select): Escape is CDK's job. Dedicated
        //    back keys don't reach CDK, so translate them into an Escape.
        if (getTopmostOverlayPane(document)) {
            if (BACK_KEYS.has(event.key)) {
                event.preventDefault();
                document.body.dispatchEvent(
                    new KeyboardEvent('keydown', {
                        key: 'Escape',
                        bubbles: true,
                    })
                );
            }
            return;
        }

        // 4. Inline watch state (detail pages) handles Escape itself.
        if (
            event.key === 'Escape' &&
            document.querySelector('.shell-host--watch')
        ) {
            return;
        }

        // 5. Otherwise: history back, but never beyond the workspace home.
        const currentPath = this.router.url.split('?')[0];
        if (BACK_STOP_PATHS.has(currentPath)) {
            return;
        }

        event.preventDefault();
        this.location.back();
    }

    private focusInitialCandidate(
        root: HTMLElement,
        event: KeyboardEvent
    ): void {
        const candidates = collectTvFocusCandidates(root).map((element) => ({
            item: element,
            rect: element.getBoundingClientRect(),
        }));
        const target = findInitialSpatialCandidate(candidates);
        if (target) {
            event.preventDefault();
            this.moveFocus(target);
        }
    }

    private moveFocus(target: HTMLElement): void {
        target.focus({ preventScroll: true });
        target.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }

    private getActiveElement(): Element | null {
        return typeof document === 'undefined' ? null : document.activeElement;
    }
}
