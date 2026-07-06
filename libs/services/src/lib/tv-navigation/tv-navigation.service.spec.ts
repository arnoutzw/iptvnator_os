import { Location } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import {
    TV_NAV_BODY_CLASS,
    TvNavigationService,
} from './tv-navigation.service';

interface TestRect {
    left: number;
    top: number;
    width: number;
    height: number;
}

function mockRect(element: HTMLElement, rect: TestRect): void {
    const domRect = {
        x: rect.left,
        y: rect.top,
        left: rect.left,
        top: rect.top,
        right: rect.left + rect.width,
        bottom: rect.top + rect.height,
        width: rect.width,
        height: rect.height,
        toJSON: () => ({}),
    } as DOMRect;
    element.getBoundingClientRect = () => domRect;
    element.getClientRects = () =>
        [domRect] as unknown as DOMRectList;
}

function pressKey(key: string): KeyboardEvent {
    const event = new KeyboardEvent('keydown', {
        key,
        bubbles: true,
        cancelable: true,
    });
    (document.activeElement ?? document.body).dispatchEvent(event);
    return event;
}

describe('TvNavigationService', () => {
    let service: TvNavigationService;
    let location: { back: jest.Mock };
    let routerUrl: string;

    beforeEach(() => {
        document.body.innerHTML = '';
        document.body.classList.remove(TV_NAV_BODY_CLASS);
        routerUrl = '/workspace/playlists/p1/all';
        location = { back: jest.fn() };

        TestBed.configureTestingModule({
            providers: [
                TvNavigationService,
                { provide: Location, useValue: location },
                {
                    provide: Router,
                    useValue: {
                        get url() {
                            return routerUrl;
                        },
                    },
                },
            ],
        });

        service = TestBed.inject(TvNavigationService);
        Element.prototype.scrollIntoView = jest.fn();
    });

    afterEach(() => {
        service.setEnabled(false);
        document.body.innerHTML = '';
    });

    function createButton(id: string, rect: TestRect): HTMLButtonElement {
        const button = document.createElement('button');
        button.id = id;
        button.textContent = id;
        document.body.appendChild(button);
        mockRect(button, rect);
        return button;
    }

    it('tags the body while enabled and untags it when disabled', () => {
        service.setEnabled(true);
        expect(document.body.classList.contains(TV_NAV_BODY_CLASS)).toBe(true);

        service.setEnabled(false);
        expect(document.body.classList.contains(TV_NAV_BODY_CLASS)).toBe(
            false
        );
    });

    it('moves focus to the right neighbor on ArrowRight and consumes the key', () => {
        const left = createButton('left', {
            left: 0,
            top: 0,
            width: 100,
            height: 40,
        });
        const right = createButton('right', {
            left: 120,
            top: 0,
            width: 100,
            height: 40,
        });

        service.setEnabled(true);
        left.focus();
        const event = pressKey('ArrowRight');

        expect(document.activeElement).toBe(right);
        expect(event.defaultPrevented).toBe(true);
    });

    it('leaves the key alone when nothing lies in that direction', () => {
        const only = createButton('only', {
            left: 0,
            top: 0,
            width: 100,
            height: 40,
        });

        service.setEnabled(true);
        only.focus();
        const event = pressKey('ArrowUp');

        expect(document.activeElement).toBe(only);
        expect(event.defaultPrevented).toBe(false);
    });

    it('focuses an entry candidate when nothing is focused yet', () => {
        const first = createButton('first', {
            left: 10,
            top: 10,
            width: 100,
            height: 40,
        });
        createButton('second', {
            left: 400,
            top: 400,
            width: 100,
            height: 40,
        });

        service.setEnabled(true);
        (document.activeElement as HTMLElement | null)?.blur();
        pressKey('ArrowDown');

        expect(document.activeElement).toBe(first);
    });

    it('keeps arrows native inside text inputs', () => {
        const input = document.createElement('input');
        input.type = 'text';
        document.body.appendChild(input);
        mockRect(input, { left: 0, top: 0, width: 100, height: 40 });
        createButton('next', { left: 120, top: 0, width: 100, height: 40 });

        service.setEnabled(true);
        input.focus();
        const event = pressKey('ArrowRight');

        expect(document.activeElement).toBe(input);
        expect(event.defaultPrevented).toBe(false);
    });

    it('does nothing when disabled', () => {
        const left = createButton('left', {
            left: 0,
            top: 0,
            width: 100,
            height: 40,
        });
        createButton('right', { left: 120, top: 0, width: 100, height: 40 });

        left.focus();
        const event = pressKey('ArrowRight');

        expect(document.activeElement).toBe(left);
        expect(event.defaultPrevented).toBe(false);
    });

    it('toggles a focused checkbox with Enter (OK)', () => {
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        document.body.appendChild(checkbox);
        mockRect(checkbox, { left: 0, top: 0, width: 20, height: 20 });

        service.setEnabled(true);
        checkbox.focus();
        pressKey('Enter');

        expect(checkbox.checked).toBe(true);
    });

    it('does not synthesize Enter clicks for buttons (native behavior)', () => {
        const button = createButton('btn', {
            left: 0,
            top: 0,
            width: 100,
            height: 40,
        });
        const clickSpy = jest.fn();
        button.addEventListener('click', clickSpy);

        service.setEnabled(true);
        button.focus();
        pressKey('Enter');

        // The browser fires the native click on Enter; the service must not
        // add a second one. jsdom does not simulate the native click, so any
        // click seen here would be a synthetic double-fire.
        expect(clickSpy).not.toHaveBeenCalled();
    });

    it('blurs a focused text input on Back instead of navigating', () => {
        const input = document.createElement('input');
        input.type = 'text';
        document.body.appendChild(input);
        mockRect(input, { left: 0, top: 0, width: 100, height: 40 });

        service.setEnabled(true);
        input.focus();
        pressKey('Escape');

        expect(document.activeElement).not.toBe(input);
        expect(location.back).not.toHaveBeenCalled();
    });

    it('navigates back on Escape from a nested route', () => {
        service.setEnabled(true);
        pressKey('Escape');

        expect(location.back).toHaveBeenCalledTimes(1);
    });

    it('never navigates back beyond the workspace home', () => {
        routerUrl = '/workspace/dashboard';

        service.setEnabled(true);
        pressKey('Escape');

        expect(location.back).not.toHaveBeenCalled();
    });

    it('lets the detail watch state handle Escape itself', () => {
        const watchHost = document.createElement('div');
        watchHost.className = 'shell-host--watch';
        document.body.appendChild(watchHost);

        service.setEnabled(true);
        pressKey('Escape');

        expect(location.back).not.toHaveBeenCalled();
    });

    it('consults boundary handlers at a spatial dead-end and consumes the key', () => {
        const only = createButton('only', {
            left: 0,
            top: 0,
            width: 100,
            height: 40,
        });
        const boundary = jest.fn().mockReturnValue(true);

        service.setEnabled(true);
        service.registerBoundaryHandler(boundary);
        only.focus();
        const event = pressKey('ArrowLeft');

        expect(boundary).toHaveBeenCalledWith('left');
        expect(event.defaultPrevented).toBe(true);
    });

    it('consults boundary handlers before the entry candidate when nothing is focused', () => {
        createButton('first', { left: 10, top: 10, width: 100, height: 40 });
        const boundary = jest.fn().mockReturnValue(true);

        service.setEnabled(true);
        service.registerBoundaryHandler(boundary);
        (document.activeElement as HTMLElement | null)?.blur();
        pressKey('ArrowLeft');

        expect(boundary).toHaveBeenCalledWith('left');
        expect(document.activeElement).toBe(document.body);
    });

    it('falls through to the entry candidate when boundary handlers decline', () => {
        const first = createButton('first', {
            left: 10,
            top: 10,
            width: 100,
            height: 40,
        });
        const boundary = jest.fn().mockReturnValue(false);

        service.setEnabled(true);
        service.registerBoundaryHandler(boundary);
        (document.activeElement as HTMLElement | null)?.blur();
        pressKey('ArrowDown');

        expect(document.activeElement).toBe(first);
    });

    it('stops consulting an unregistered boundary handler', () => {
        const boundary = jest.fn().mockReturnValue(true);

        service.setEnabled(true);
        const unregister = service.registerBoundaryHandler(boundary);
        unregister();
        pressKey('ArrowLeft');

        expect(boundary).not.toHaveBeenCalled();
    });

    it('consults back handlers before navigating back', () => {
        const back = jest.fn().mockReturnValue(true);

        service.setEnabled(true);
        service.registerBackHandler(back);
        const event = pressKey('Escape');

        expect(back).toHaveBeenCalled();
        expect(location.back).not.toHaveBeenCalled();
        expect(event.defaultPrevented).toBe(true);
    });

    it('falls through to history back when back handlers decline', () => {
        const back = jest.fn().mockReturnValue(false);

        service.setEnabled(true);
        service.registerBackHandler(back);
        pressKey('Escape');

        expect(back).toHaveBeenCalled();
        expect(location.back).toHaveBeenCalledTimes(1);
    });

    it('translates a dedicated back key into Escape for open overlays', () => {
        const container = document.createElement('div');
        container.className = 'cdk-overlay-container';
        const pane = document.createElement('div');
        pane.className = 'cdk-overlay-pane';
        const dialog = document.createElement('div');
        pane.appendChild(dialog);
        container.appendChild(pane);
        document.body.appendChild(container);
        mockRect(pane, { left: 100, top: 100, width: 400, height: 300 });

        const escapeSpy = jest.fn((event: KeyboardEvent) => event.key);
        document.body.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') {
                escapeSpy(event);
            }
        });

        service.setEnabled(true);
        pressKey('BrowserBack');

        expect(escapeSpy).toHaveBeenCalled();
        expect(location.back).not.toHaveBeenCalled();
    });
});
