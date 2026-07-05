import {
    DEFAULT_LAUNCHER_APPS,
    mergeLauncherApps,
} from './launcher-app.interface';

describe('mergeLauncherApps', () => {
    it('returns the built-in seeds when nothing is stored', () => {
        const merged = mergeLauncherApps(null);
        expect(merged.map((app) => app.id)).toEqual(['pcsx2', 'rpcs3']);
        expect(merged.every((app) => app.builtIn)).toBe(true);
        expect(merged.every((app) => app.path === '')).toBe(true);
    });

    it('applies stored overrides to the built-in seeds', () => {
        const merged = mergeLauncherApps([
            { id: 'pcsx2', name: 'PCSX2', path: '/usr/bin/pcsx2' },
        ]);
        const pcsx2 = merged.find((app) => app.id === 'pcsx2');
        expect(pcsx2?.path).toBe('/usr/bin/pcsx2');
        expect(pcsx2?.builtIn).toBe(true);
    });

    it('appends custom apps after the built-ins and marks them non-built-in', () => {
        const merged = mergeLauncherApps([
            { id: 'custom-1', name: 'Dolphin', path: '/usr/bin/dolphin' },
        ]);
        expect(merged).toHaveLength(DEFAULT_LAUNCHER_APPS.length + 1);
        const custom = merged.find((app) => app.id === 'custom-1');
        expect(custom?.builtIn).toBe(false);
    });
});
