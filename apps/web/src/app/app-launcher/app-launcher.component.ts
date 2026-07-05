import { CommonModule } from '@angular/common';
import {
    Component,
    inject,
    OnInit,
    signal,
    ViewEncapsulation,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { LauncherApp } from '@iptvnator/shared/interfaces';
import {
    AppLauncherService,
    deriveAppNameFromPath,
} from './app-launcher.service';

/**
 * Workspace app launcher: a tile grid for launching native apps/emulators
 * (PCSX2, RPCS3, plus user-added apps) so the desktop build doubles as an
 * all-in-one TV + emulator front-end. Electron only — a guard keeps the PWA
 * away from this route.
 */
@Component({
    selector: 'app-app-launcher',
    imports: [
        CommonModule,
        MatButtonModule,
        MatIconModule,
        MatTooltipModule,
        TranslateModule,
    ],
    templateUrl: './app-launcher.component.html',
    styleUrls: ['./app-launcher.component.scss'],
    encapsulation: ViewEncapsulation.None,
})
export class AppLauncherComponent implements OnInit {
    private readonly launcher = inject(AppLauncherService);
    private readonly snackBar = inject(MatSnackBar);
    private readonly translate = inject(TranslateService);

    readonly apps = this.launcher.apps;
    readonly busyAppId = signal<string | null>(null);

    async ngOnInit(): Promise<void> {
        await this.launcher.loadApps();
    }

    isConfigured(app: LauncherApp): boolean {
        return app.path.trim().length > 0;
    }

    async launch(app: LauncherApp): Promise<void> {
        if (!this.isConfigured(app)) {
            await this.setPath(app);
            return;
        }

        this.busyAppId.set(app.id);
        try {
            const result = await this.launcher.launch(app.id);
            if (result.success) {
                this.notify(
                    this.translate.instant('APP_LAUNCHER.LAUNCHED', {
                        name: app.name,
                    })
                );
            } else {
                this.notify(
                    result.error ??
                        this.translate.instant('APP_LAUNCHER.LAUNCH_FAILED')
                );
            }
        } finally {
            this.busyAppId.set(null);
        }
    }

    async setPath(app: LauncherApp): Promise<void> {
        const path = await this.launcher.pickExecutable();
        if (!path) {
            return;
        }

        const next = this.apps().map((entry) =>
            entry.id === app.id ? { ...entry, path } : entry
        );
        await this.launcher.saveApps(next);
    }

    async addApp(): Promise<void> {
        const path = await this.launcher.pickExecutable();
        if (!path) {
            return;
        }

        const custom: LauncherApp = {
            id: `custom-${this.nextCustomSuffix()}`,
            name: deriveAppNameFromPath(path),
            path,
            icon: 'videogame_asset',
            builtIn: false,
        };
        await this.launcher.saveApps([...this.apps(), custom]);
    }

    async clearPath(app: LauncherApp): Promise<void> {
        const next = this.apps().map((entry) =>
            entry.id === app.id ? { ...entry, path: '' } : entry
        );
        await this.launcher.saveApps(next);
    }

    async removeApp(app: LauncherApp): Promise<void> {
        const next = this.apps().filter((entry) => entry.id !== app.id);
        await this.launcher.saveApps(next);
    }

    private nextCustomSuffix(): number {
        const suffixes = this.apps()
            .map((app) => /^custom-(\d+)$/.exec(app.id)?.[1])
            .filter((value): value is string => Boolean(value))
            .map((value) => Number(value));
        return (suffixes.length ? Math.max(...suffixes) : 0) + 1;
    }

    private notify(message: string): void {
        this.snackBar.open(message, undefined, { duration: 3000 });
    }
}
