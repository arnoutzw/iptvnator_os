import { SpatialDirection } from './spatial-navigation.util';
import { TvNavigationService } from './tv-navigation.service';

/** What the controller needs from the live player view. */
export interface TvNavLiveSidebarHost {
    isSidebarCollapsed: () => boolean;
    openSidebar: () => void;
    closeSidebar: () => void;
    /** The sidebar container that holds the channel list. */
    getSidebarElement: () => HTMLElement | null;
}

const FOCUS_RETRY_DELAY_MS = 100;
const FOCUS_RETRY_ATTEMPTS = 5;

/**
 * TV-remote zapping flow for the live player: pressing ← at a spatial
 * dead-end (typically while watching with the channel sidebar collapsed)
 * opens the sidebar and moves focus to the playing channel, so ↑/↓ browse
 * the list and OK zaps. Back closes the sidebar again while focus is inside
 * it — only then does Back bubble up to router-level navigation.
 *
 * The channel list renders inside a `@defer` block and a CDK virtual scroll
 * viewport, so the focus move retries briefly until an item exists.
 */
export class TvNavLiveSidebarController {
    private unregisterBoundary: (() => void) | null = null;
    private unregisterBack: (() => void) | null = null;
    private focusRetryTimer: number | null = null;

    constructor(
        private readonly tvNavigation: TvNavigationService,
        private readonly host: TvNavLiveSidebarHost
    ) {}

    attach(): void {
        this.unregisterBoundary = this.tvNavigation.registerBoundaryHandler(
            (direction) => this.onBoundary(direction)
        );
        this.unregisterBack = this.tvNavigation.registerBackHandler(() =>
            this.onBack()
        );
    }

    detach(): void {
        this.unregisterBoundary?.();
        this.unregisterBack?.();
        this.unregisterBoundary = null;
        this.unregisterBack = null;
        this.clearFocusRetry();
    }

    private onBoundary(direction: SpatialDirection): boolean {
        if (direction !== 'left' || !this.host.isSidebarCollapsed()) {
            return false;
        }

        this.host.openSidebar();
        this.scheduleChannelFocus(0);
        return true;
    }

    private onBack(): boolean {
        if (this.host.isSidebarCollapsed()) {
            return false;
        }

        const sidebar = this.host.getSidebarElement();
        const active = document.activeElement;
        if (
            !sidebar ||
            !(active instanceof HTMLElement) ||
            !sidebar.contains(active)
        ) {
            return false;
        }

        this.host.closeSidebar();
        active.blur();
        return true;
    }

    private scheduleChannelFocus(attempt: number): void {
        this.clearFocusRetry();
        this.focusRetryTimer = window.setTimeout(
            () => {
                this.focusRetryTimer = null;
                if (
                    !this.focusChannelItem() &&
                    attempt < FOCUS_RETRY_ATTEMPTS
                ) {
                    this.scheduleChannelFocus(attempt + 1);
                }
            },
            attempt === 0 ? 0 : FOCUS_RETRY_DELAY_MS
        );
    }

    private focusChannelItem(): boolean {
        const sidebar = this.host.getSidebarElement();
        if (!sidebar || this.host.isSidebarCollapsed()) {
            return true; // View changed under us — stop retrying.
        }

        const target =
            sidebar.querySelector<HTMLElement>('.channel-list-item.active') ??
            sidebar.querySelector<HTMLElement>(
                '[data-test-id="channel-item"]'
            ) ??
            sidebar.querySelector<HTMLElement>('button, [tabindex="0"]');

        if (!target) {
            return false;
        }

        target.focus({ preventScroll: true });
        target.scrollIntoView({ block: 'nearest', inline: 'nearest' });
        return true;
    }

    private clearFocusRetry(): void {
        if (this.focusRetryTimer !== null) {
            window.clearTimeout(this.focusRetryTimer);
            this.focusRetryTimer = null;
        }
    }
}
