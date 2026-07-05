import { spawn } from 'child_process';
import { existsSync } from 'fs';
import { app, dialog, ipcMain } from 'electron';
import {
    LAUNCHER_GET_APPS,
    LAUNCHER_LAUNCH_APP,
    LAUNCHER_PICK_EXECUTABLE,
    LAUNCHER_SET_APPS,
    LaunchAppResult,
    LauncherApp,
    mergeLauncherApps,
} from '@iptvnator/shared/interfaces';
import { LAUNCHER_APPS, store } from '../services/store.service';
import {
    buildLauncherSpawnSpec,
    isLaunchableApp,
} from './app-launcher-spawn';

export default class AppLauncherEvents {
    static bootstrapAppLauncherEvents(): Electron.IpcMain {
        return ipcMain;
    }
}

/**
 * Sanitize renderer-provided launcher apps before persisting. The renderer can
 * only ever store a name/path/args triple — it can never smuggle in an
 * arbitrary command shape, and the launch path always comes back out of the
 * store (never straight from a renderer call), so a compromised renderer
 * cannot turn LAUNCHER:LAUNCH_APP into arbitrary command execution.
 */
export function sanitizeLauncherApps(
    apps: unknown
): LauncherApp[] {
    if (!Array.isArray(apps)) {
        return [];
    }

    return apps
        .filter((app): app is Record<string, unknown> => Boolean(app))
        .map((app) => {
            const id =
                typeof app['id'] === 'string' && app['id'].trim().length > 0
                    ? (app['id'] as string)
                    : '';
            const name =
                typeof app['name'] === 'string' ? (app['name'] as string) : '';
            const path =
                typeof app['path'] === 'string' ? (app['path'] as string) : '';
            const icon =
                typeof app['icon'] === 'string'
                    ? (app['icon'] as string)
                    : undefined;
            const args = Array.isArray(app['args'])
                ? (app['args'] as unknown[]).filter(
                      (arg): arg is string => typeof arg === 'string'
                  )
                : undefined;

            return { id, name, path, icon, args } satisfies LauncherApp;
        })
        .filter((app) => app.id.length > 0);
}

function getStoredLauncherApps(): LauncherApp[] {
    return mergeLauncherApps(store.get(LAUNCHER_APPS, []));
}

ipcMain.handle(LAUNCHER_GET_APPS, () => getStoredLauncherApps());

ipcMain.handle(LAUNCHER_SET_APPS, (_event, apps: unknown) => {
    const sanitized = sanitizeLauncherApps(apps);
    store.set(LAUNCHER_APPS, sanitized);
    return getStoredLauncherApps();
});

ipcMain.handle(
    LAUNCHER_LAUNCH_APP,
    (_event, appId: unknown): LaunchAppResult => {
        if (typeof appId !== 'string') {
            return { success: false, error: 'Invalid app id.' };
        }

        const target = getStoredLauncherApps().find((app) => app.id === appId);

        if (!target) {
            return { success: false, error: 'App not found.' };
        }

        if (!isLaunchableApp(target)) {
            return {
                success: false,
                error: `No executable configured for "${target.name}".`,
            };
        }

        if (!existsSync(target.path)) {
            return {
                success: false,
                error: `Executable not found at ${target.path}.`,
            };
        }

        try {
            const spec = buildLauncherSpawnSpec(target);
            const child = spawn(spec.command, spec.args, {
                detached: true,
                stdio: 'ignore',
                shell: false,
            });
            child.on('error', (error) => {
                console.error(
                    `Failed to launch app "${target.name}":`,
                    error
                );
            });
            child.unref();
            return { success: true };
        } catch (error) {
            const message =
                error instanceof Error ? error.message : String(error);
            console.error(`Failed to launch app "${target.name}":`, error);
            return { success: false, error: message };
        }
    }
);

ipcMain.handle(LAUNCHER_PICK_EXECUTABLE, async () => {
    const result = await dialog.showOpenDialog({
        defaultPath: app.getPath('home'),
        properties: ['openFile'],
        title: 'Select application',
        // macOS treats `.app` bundles as directories; treatPackageAsDirectory
        // stays false so the user picks the bundle itself.
    });

    if (result.canceled || result.filePaths.length === 0) {
        return null;
    }

    return result.filePaths[0];
});
