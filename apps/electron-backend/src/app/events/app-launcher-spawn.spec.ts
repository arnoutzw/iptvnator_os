import {
    buildLauncherSpawnSpec,
    isLaunchableApp,
} from './app-launcher-spawn';

describe('app-launcher-spawn', () => {
    describe('buildLauncherSpawnSpec', () => {
        it('opens macOS .app bundles through `open -a`', () => {
            expect(
                buildLauncherSpawnSpec(
                    { path: '/Applications/PCSX2.app' },
                    'darwin'
                )
            ).toEqual({
                command: 'open',
                args: ['-a', '/Applications/PCSX2.app'],
            });
        });

        it('passes extra args to a macOS bundle via --args', () => {
            expect(
                buildLauncherSpawnSpec(
                    { path: '/Applications/RPCS3.app', args: ['--fullscreen'] },
                    'darwin'
                )
            ).toEqual({
                command: 'open',
                args: [
                    '-a',
                    '/Applications/RPCS3.app',
                    '--args',
                    '--fullscreen',
                ],
            });
        });

        it('spawns a plain executable directly with its args', () => {
            expect(
                buildLauncherSpawnSpec(
                    { path: '/usr/bin/pcsx2', args: ['--nogui', ''] },
                    'linux'
                )
            ).toEqual({
                command: '/usr/bin/pcsx2',
                args: ['--nogui'],
            });
        });

        it('spawns a non-.app macOS path directly', () => {
            expect(
                buildLauncherSpawnSpec(
                    { path: '/usr/local/bin/rpcs3' },
                    'darwin'
                )
            ).toEqual({
                command: '/usr/local/bin/rpcs3',
                args: [],
            });
        });
    });

    describe('isLaunchableApp', () => {
        it('is false for empty or whitespace paths', () => {
            expect(isLaunchableApp({ path: '' })).toBe(false);
            expect(isLaunchableApp({ path: '   ' })).toBe(false);
        });

        it('is true for a configured path', () => {
            expect(isLaunchableApp({ path: '/usr/bin/pcsx2' })).toBe(true);
        });
    });
});
