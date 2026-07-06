import { SpatialDirection } from './spatial-navigation.util';
import {
    TvNavLiveSidebarController,
    TvNavLiveSidebarHost,
} from './tv-nav-live-sidebar.controller';
import {
    TvNavBackHandler,
    TvNavBoundaryHandler,
    TvNavigationService,
} from './tv-navigation.service';

describe('TvNavLiveSidebarController', () => {
    let boundaryHandlers: TvNavBoundaryHandler[];
    let backHandlers: TvNavBackHandler[];
    let tvNavigation: TvNavigationService;

    let collapsed: boolean;
    let host: TvNavLiveSidebarHost;
    let sidebar: HTMLElement;
    let controller: TvNavLiveSidebarController;

    const boundary = (direction: SpatialDirection): boolean =>
        boundaryHandlers.some((handler) => handler(direction));
    const back = (): boolean => backHandlers.some((handler) => handler());

    beforeEach(() => {
        jest.useFakeTimers();
        document.body.innerHTML = '';
        boundaryHandlers = [];
        backHandlers = [];
        tvNavigation = {
            registerBoundaryHandler: (handler: TvNavBoundaryHandler) => {
                boundaryHandlers.push(handler);
                return () => {
                    boundaryHandlers = boundaryHandlers.filter(
                        (h) => h !== handler
                    );
                };
            },
            registerBackHandler: (handler: TvNavBackHandler) => {
                backHandlers.push(handler);
                return () => {
                    backHandlers = backHandlers.filter((h) => h !== handler);
                };
            },
        } as unknown as TvNavigationService;

        sidebar = document.createElement('div');
        sidebar.className = 'sidebar';
        document.body.appendChild(sidebar);
        Element.prototype.scrollIntoView = jest.fn();

        collapsed = true;
        host = {
            isSidebarCollapsed: () => collapsed,
            openSidebar: jest.fn(() => {
                collapsed = false;
            }),
            closeSidebar: jest.fn(() => {
                collapsed = true;
            }),
            getSidebarElement: () => sidebar,
        };

        controller = new TvNavLiveSidebarController(tvNavigation, host);
        controller.attach();
    });

    afterEach(() => {
        controller.detach();
        jest.useRealTimers();
        document.body.innerHTML = '';
    });

    function addChannelItem(active: boolean): HTMLElement {
        const item = document.createElement('div');
        item.className = active
            ? 'channel-list-item active'
            : 'channel-list-item';
        item.setAttribute('data-test-id', 'channel-item');
        item.setAttribute('tabindex', '0');
        sidebar.appendChild(item);
        return item;
    }

    it('opens the collapsed sidebar on a left-edge press and focuses the playing channel', () => {
        addChannelItem(false);
        const activeItem = addChannelItem(true);

        expect(boundary('left')).toBe(true);
        expect(host.openSidebar).toHaveBeenCalled();

        jest.runAllTimers();
        expect(document.activeElement).toBe(activeItem);
    });

    it('falls back to the first channel item when none is playing', () => {
        const first = addChannelItem(false);
        addChannelItem(false);

        boundary('left');
        jest.runAllTimers();

        expect(document.activeElement).toBe(first);
    });

    it('retries the focus move until the deferred list renders', () => {
        boundary('left');
        jest.advanceTimersByTime(0);

        // List renders late (deferred block / virtual scroll warm-up).
        const item = addChannelItem(true);
        jest.runAllTimers();

        expect(document.activeElement).toBe(item);
    });

    it('ignores non-left directions and an already-open sidebar', () => {
        expect(boundary('right')).toBe(false);
        expect(boundary('up')).toBe(false);
        expect(boundary('down')).toBe(false);

        collapsed = false;
        expect(boundary('left')).toBe(false);
        expect(host.openSidebar).not.toHaveBeenCalled();
    });

    it('closes the sidebar on Back while focus is inside it', () => {
        collapsed = false;
        const item = addChannelItem(true);
        item.focus();

        expect(back()).toBe(true);
        expect(host.closeSidebar).toHaveBeenCalled();
        expect(document.activeElement).not.toBe(item);
    });

    it('declines Back when focus is outside the sidebar or it is collapsed', () => {
        collapsed = false;
        const outside = document.createElement('button');
        document.body.appendChild(outside);
        outside.focus();
        expect(back()).toBe(false);

        collapsed = true;
        expect(back()).toBe(false);
        expect(host.closeSidebar).not.toHaveBeenCalled();
    });

    it('unregisters both handlers on detach', () => {
        controller.detach();

        expect(boundaryHandlers).toHaveLength(0);
        expect(backHandlers).toHaveLength(0);
    });
});
