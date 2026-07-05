import { Injectable, signal } from '@angular/core';
import { LauncherApp } from '@iptvnator/shared/interfaces';

/**
 * Thin renderer-side wrapper over the Electron app-launcher bridge. All methods
 * are no-ops (returning safe defaults) when `window.electron` is absent so the
 * component can be instantiated in the PWA/tests without guards everywhere.
 */
@Injectable({ providedIn: 'root' })
export class AppLauncherService {
    readonly apps = signal<LauncherApp[]>([]);

    private get bridge() {
        return typeof window !== 'undefined' ? window.electron : undefined;
    }

    get isSupported(): boolean {
        return Boolean(this.bridge?.getLauncherApps);
    }

    async loadApps(): Promise<LauncherApp[]> {
        if (!this.bridge?.getLauncherApps) {
            this.apps.set([]);
            return [];
        }

        const apps = await this.bridge.getLauncherApps();
        this.apps.set(apps);
        return apps;
    }

    async saveApps(apps: LauncherApp[]): Promise<LauncherApp[]> {
        if (!this.bridge?.setLauncherApps) {
            return this.apps();
        }

        const persisted = await this.bridge.setLauncherApps(apps);
        this.apps.set(persisted);
        return persisted;
    }

    async launch(appId: string): Promise<{ success: boolean; error?: string }> {
        if (!this.bridge?.launchApp) {
            return { success: false, error: 'Launcher is desktop-only.' };
        }

        return this.bridge.launchApp(appId);
    }

    async pickExecutable(): Promise<string | null> {
        if (!this.bridge?.pickAppExecutable) {
            return null;
        }

        return this.bridge.pickAppExecutable();
    }
}

/**
 * Derive a friendly default name from an executable path (strips directory and
 * a trailing `.app`/`.exe` extension). Kept pure for reuse and testing.
 */
export function deriveAppNameFromPath(path: string): string {
    const base = path.split(/[\\/]/).pop() ?? path;
    return base.replace(/\.(app|exe)$/i, '') || base;
}
