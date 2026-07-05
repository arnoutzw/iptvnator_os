import { LauncherApp } from '@iptvnator/shared/interfaces';

export interface LauncherSpawnSpec {
    command: string;
    args: string[];
}

/**
 * Build the process spawn spec for a launcher app. macOS `.app` bundles cannot
 * be spawned directly, so they are opened through `open -a`; every other path
 * (a plain executable on any OS) is spawned as-is. Keeping this pure makes the
 * platform branching unit-testable without Electron.
 */
export function buildLauncherSpawnSpec(
    app: Pick<LauncherApp, 'path' | 'args'>,
    platform: NodeJS.Platform = process.platform
): LauncherSpawnSpec {
    const extraArgs = (app.args ?? []).filter(
        (arg): arg is string => typeof arg === 'string' && arg.length > 0
    );

    if (platform === 'darwin' && app.path.toLowerCase().endsWith('.app')) {
        return {
            command: 'open',
            args: [
                '-a',
                app.path,
                ...(extraArgs.length > 0 ? ['--args', ...extraArgs] : []),
            ],
        };
    }

    return { command: app.path, args: extraArgs };
}

/**
 * Guard against launching an app whose path was never configured. Built-in
 * emulator seeds ship with an empty path until the user points them at their
 * installed binary.
 */
export function isLaunchableApp(app: Pick<LauncherApp, 'path'>): boolean {
    return typeof app.path === 'string' && app.path.trim().length > 0;
}
