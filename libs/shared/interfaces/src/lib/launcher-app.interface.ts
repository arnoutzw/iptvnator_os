/**
 * A launchable native application (e.g. an emulator) shown in the workspace
 * app launcher. Used to turn IPTVnator into an "all-in-one" living-room box
 * that can jump from TV to PCSX2/RPCS3 and back.
 *
 * Only available in the Electron desktop build — the PWA cannot spawn native
 * processes.
 */
export interface LauncherApp {
    /** Stable identifier. Built-in seeds use well-known ids (`pcsx2`, `rpcs3`). */
    id: string;
    /** Display name shown on the launcher tile. */
    name: string;
    /**
     * Absolute path to the executable (or a macOS `.app` bundle). Empty when a
     * built-in seed has not been configured yet.
     */
    path: string;
    /** Extra command-line arguments passed on launch. */
    args?: string[];
    /** Material icon name for the tile. */
    icon?: string;
    /**
     * True for the shipped PCSX2/RPCS3 seeds. Built-in apps are always present
     * in the launcher (so the user can set their path) and cannot be deleted,
     * only cleared.
     */
    builtIn?: boolean;
}

export interface LaunchAppResult {
    success: boolean;
    /** Human-readable failure reason when `success` is false. */
    error?: string;
}

/**
 * Built-in emulator seeds. They ship with an empty `path`; the user points
 * each one at their installed binary via the launcher's file picker.
 */
export const DEFAULT_LAUNCHER_APPS: LauncherApp[] = [
    {
        id: 'pcsx2',
        name: 'PCSX2 (PS2)',
        path: '',
        icon: 'sports_esports',
        builtIn: true,
    },
    {
        id: 'rpcs3',
        name: 'RPCS3 (PS3)',
        path: '',
        icon: 'stadia_controller',
        builtIn: true,
    },
];

/**
 * Merge stored launcher apps with the built-in seeds so the two emulators are
 * always present (with the user's configured path/args applied) and any custom
 * apps the user added are appended. Shared between the Electron backend and the
 * renderer so both agree on the canonical launcher list.
 */
export function mergeLauncherApps(
    stored: LauncherApp[] | null | undefined
): LauncherApp[] {
    const storedApps = Array.isArray(stored) ? stored : [];
    const storedById = new Map(storedApps.map((app) => [app.id, app]));

    const builtIns = DEFAULT_LAUNCHER_APPS.map((seed) => {
        const override = storedById.get(seed.id);
        return {
            ...seed,
            path: override?.path ?? seed.path,
            args: override?.args ?? seed.args,
            name: override?.name ?? seed.name,
            icon: override?.icon ?? seed.icon,
        } satisfies LauncherApp;
    });

    const builtInIds = new Set(DEFAULT_LAUNCHER_APPS.map((seed) => seed.id));
    const customApps = storedApps
        .filter((app) => !builtInIds.has(app.id))
        .map((app) => ({ ...app, builtIn: false }));

    return [...builtIns, ...customApps];
}
