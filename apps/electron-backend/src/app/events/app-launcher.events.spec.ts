const mockIpcHandlers = new Map<
    string,
    (event: unknown, arg: unknown) => unknown
>();
const mockChild = { on: jest.fn(), unref: jest.fn() };
const mockSpawn = jest.fn(
    (_command?: unknown, _args?: unknown, _options?: unknown) => mockChild
);
const mockExistsSync = jest.fn((_path?: unknown) => true);
const mockShowOpenDialog = jest.fn<
    Promise<{ canceled: boolean; filePaths: string[] }>,
    []
>();

jest.mock('child_process', () => ({
    spawn: (command: unknown, args: unknown, options: unknown) =>
        mockSpawn(command, args, options),
}));

jest.mock('fs', () => ({
    existsSync: (path: unknown) => mockExistsSync(path),
}));

jest.mock('electron', () => ({
    app: { getPath: jest.fn(() => '/home/user') },
    dialog: { showOpenDialog: () => mockShowOpenDialog() },
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

const mockStore = new Map<string, unknown>();
jest.mock('../services/store.service', () => ({
    store: {
        get: jest.fn((key: string, fallback: unknown) =>
            mockStore.has(key) ? mockStore.get(key) : fallback
        ),
        set: jest.fn((key: string, value: unknown) => mockStore.set(key, value)),
    },
    LAUNCHER_APPS: 'LAUNCHER_APPS',
}));

import { sanitizeLauncherApps } from './app-launcher.events';
import { store } from '../services/store.service';

function handler(channel: string) {
    const fn = mockIpcHandlers.get(channel);
    if (!fn) {
        throw new Error(`${channel} handler not registered`);
    }
    return fn;
}

describe('app-launcher events', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockStore.clear();
        mockExistsSync.mockReturnValue(true);
    });

    describe('sanitizeLauncherApps', () => {
        it('keeps only id/name/path/icon/args and drops entries without an id', () => {
            expect(
                sanitizeLauncherApps([
                    {
                        id: 'pcsx2',
                        name: 'PCSX2',
                        path: '/usr/bin/pcsx2',
                        icon: 'sports_esports',
                        args: ['--nogui', 5],
                        evil: 'rm -rf',
                    },
                    { name: 'no id' },
                    'garbage',
                ])
            ).toEqual([
                {
                    id: 'pcsx2',
                    name: 'PCSX2',
                    path: '/usr/bin/pcsx2',
                    icon: 'sports_esports',
                    args: ['--nogui'],
                },
            ]);
        });

        it('returns an empty list for non-array input', () => {
            expect(sanitizeLauncherApps(null)).toEqual([]);
        });
    });

    describe('LAUNCHER:GET_APPS', () => {
        it('always includes the built-in emulator seeds', () => {
            const apps = handler('LAUNCHER:GET_APPS')(undefined, undefined) as {
                id: string;
            }[];
            expect(apps.map((a) => a.id)).toEqual(
                expect.arrayContaining(['pcsx2', 'rpcs3'])
            );
        });
    });

    describe('LAUNCHER:SET_APPS', () => {
        it('persists a sanitized list and returns the merged apps', () => {
            const result = handler('LAUNCHER:SET_APPS')(undefined, [
                { id: 'pcsx2', name: 'PCSX2', path: '/usr/bin/pcsx2' },
            ]) as { id: string; path: string }[];

            expect(store.set).toHaveBeenCalledWith('LAUNCHER_APPS', [
                {
                    id: 'pcsx2',
                    name: 'PCSX2',
                    path: '/usr/bin/pcsx2',
                    icon: undefined,
                    args: undefined,
                },
            ]);
            expect(result.find((a) => a.id === 'pcsx2')?.path).toBe(
                '/usr/bin/pcsx2'
            );
        });
    });

    describe('LAUNCHER:LAUNCH_APP', () => {
        it('spawns a configured app detached', () => {
            mockStore.set('LAUNCHER_APPS', [
                { id: 'pcsx2', name: 'PCSX2', path: '/usr/bin/pcsx2' },
            ]);

            const result = handler('LAUNCHER:LAUNCH_APP')(undefined, 'pcsx2');

            expect(result).toEqual({ success: true });
            expect(mockSpawn).toHaveBeenCalledWith(
                '/usr/bin/pcsx2',
                [],
                expect.objectContaining({ detached: true, shell: false })
            );
            expect(mockChild.unref).toHaveBeenCalled();
        });

        it('refuses to launch a built-in with no configured path', () => {
            const result = handler('LAUNCHER:LAUNCH_APP')(
                undefined,
                'pcsx2'
            ) as { success: boolean; error?: string };

            expect(result.success).toBe(false);
            expect(mockSpawn).not.toHaveBeenCalled();
        });

        it('fails when the executable is missing on disk', () => {
            mockStore.set('LAUNCHER_APPS', [
                { id: 'pcsx2', name: 'PCSX2', path: '/usr/bin/pcsx2' },
            ]);
            mockExistsSync.mockReturnValue(false);

            const result = handler('LAUNCHER:LAUNCH_APP')(
                undefined,
                'pcsx2'
            ) as { success: boolean };

            expect(result.success).toBe(false);
            expect(mockSpawn).not.toHaveBeenCalled();
        });

        it('fails for an unknown app id', () => {
            const result = handler('LAUNCHER:LAUNCH_APP')(
                undefined,
                'nope'
            ) as { success: boolean };
            expect(result.success).toBe(false);
        });
    });

    describe('LAUNCHER:PICK_EXECUTABLE', () => {
        it('returns the selected path', async () => {
            mockShowOpenDialog.mockResolvedValue({
                canceled: false,
                filePaths: ['/Applications/RPCS3.app'],
            });

            await expect(
                handler('LAUNCHER:PICK_EXECUTABLE')(undefined, undefined)
            ).resolves.toBe('/Applications/RPCS3.app');
        });

        it('returns null when the dialog is canceled', async () => {
            mockShowOpenDialog.mockResolvedValue({
                canceled: true,
                filePaths: [],
            });

            await expect(
                handler('LAUNCHER:PICK_EXECUTABLE')(undefined, undefined)
            ).resolves.toBeNull();
        });
    });
});
