const mockIpcHandlers = new Map<
    string,
    (event: unknown, arg: unknown) => unknown
>();

jest.mock('electron', () => ({
    app: {
        setLoginItemSettings: jest.fn(),
    },
    ipcMain: {
        handle: jest.fn(
            (
                channel: string,
                handler: (event: unknown, arg: unknown) => unknown
            ) => {
                mockIpcHandlers.set(channel, handler);
            }
        ),
    },
}));

jest.mock('../services/store.service', () => ({
    store: {
        get: jest.fn(),
        set: jest.fn(),
    },
    MPV_PLAYER_ARGUMENTS: 'MPV_PLAYER_ARGUMENTS',
    MPV_REUSE_INSTANCE: 'MPV_REUSE_INSTANCE',
    START_FULLSCREEN: 'START_FULLSCREEN',
    VLC_PLAYER_ARGUMENTS: 'VLC_PLAYER_ARGUMENTS',
    VLC_REUSE_INSTANCE: 'VLC_REUSE_INSTANCE',
}));

jest.mock('../server/http-server', () => ({
    httpServer: {
        updateSettings: jest.fn(),
    },
}));

import { app } from 'electron';
import { applyAutoLaunchAtLogin } from './settings.events';
import { store } from '../services/store.service';

const originalPlatform = process.platform;

function setPlatform(platform: NodeJS.Platform): void {
    Object.defineProperty(process, 'platform', { value: platform });
}

function getSettingsUpdateHandler() {
    const handler = mockIpcHandlers.get('SETTINGS_UPDATE');
    if (!handler) {
        throw new Error('SETTINGS_UPDATE handler was not registered');
    }
    return handler;
}

describe('settings events', () => {
    let logSpy: jest.SpyInstance;

    beforeEach(() => {
        jest.clearAllMocks();
        logSpy = jest.spyOn(console, 'log').mockImplementation();
    });

    afterEach(() => {
        logSpy.mockRestore();
        setPlatform(originalPlatform);
    });

    describe('applyAutoLaunchAtLogin', () => {
        it('registers a login item on macOS', () => {
            setPlatform('darwin');

            applyAutoLaunchAtLogin(true);

            expect(app.setLoginItemSettings).toHaveBeenCalledWith({
                openAtLogin: true,
            });
        });

        it('removes the login item when disabled on Windows', () => {
            setPlatform('win32');

            applyAutoLaunchAtLogin(false);

            expect(app.setLoginItemSettings).toHaveBeenCalledWith({
                openAtLogin: false,
            });
        });

        it('is a no-op on Linux where login items are unsupported', () => {
            setPlatform('linux');

            applyAutoLaunchAtLogin(true);

            expect(app.setLoginItemSettings).not.toHaveBeenCalled();
        });
    });

    describe('SETTINGS_UPDATE', () => {
        it('persists the start fullscreen preference', () => {
            getSettingsUpdateHandler()(undefined, { startFullscreen: true });

            expect(store.set).toHaveBeenCalledWith('START_FULLSCREEN', true);
        });

        it('leaves the start fullscreen preference untouched when absent', () => {
            getSettingsUpdateHandler()(undefined, { mpvReuseInstance: true });

            expect(store.set).not.toHaveBeenCalledWith(
                'START_FULLSCREEN',
                expect.anything()
            );
        });

        it('updates the login item when auto launch changes', () => {
            setPlatform('darwin');

            getSettingsUpdateHandler()(undefined, { autoLaunchAtLogin: true });

            expect(app.setLoginItemSettings).toHaveBeenCalledWith({
                openAtLogin: true,
            });
        });
    });
});
