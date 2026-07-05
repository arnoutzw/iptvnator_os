import { app, ipcMain } from 'electron';
import { normalizeExternalPlayerArguments } from '@iptvnator/shared/interfaces';
import {
    MPV_PLAYER_ARGUMENTS,
    MPV_REUSE_INSTANCE,
    START_FULLSCREEN,
    store,
    VLC_PLAYER_ARGUMENTS,
    VLC_REUSE_INSTANCE,
} from '../services/store.service';
import { httpServer } from '../server/http-server';

export default class SettingsEvents {
    static bootstrapSettingsEvents(): Electron.IpcMain {
        return ipcMain;
    }
}

/**
 * Login items are only supported by Electron on macOS and Windows;
 * on Linux autostart requires a user-managed .desktop file instead.
 */
export function applyAutoLaunchAtLogin(openAtLogin: boolean): void {
    if (process.platform !== 'darwin' && process.platform !== 'win32') {
        return;
    }

    try {
        app.setLoginItemSettings({ openAtLogin });
    } catch (error) {
        console.error('Failed to update login item settings:', error);
    }
}

ipcMain.handle('SETTINGS_UPDATE', (_event, arg) => {
    console.log('Received SETTINGS_UPDATE with data:', arg);

    if (arg.mpvPlayerArguments !== undefined) {
        store.set(
            MPV_PLAYER_ARGUMENTS,
            normalizeExternalPlayerArguments(arg.mpvPlayerArguments)
        );
    }

    if (arg.vlcPlayerArguments !== undefined) {
        store.set(
            VLC_PLAYER_ARGUMENTS,
            normalizeExternalPlayerArguments(arg.vlcPlayerArguments)
        );
    }

    // Only set values that are defined
    if (arg.mpvReuseInstance !== undefined) {
        store.set(MPV_REUSE_INSTANCE, arg.mpvReuseInstance);
    }

    if (arg.vlcReuseInstance !== undefined) {
        store.set(VLC_REUSE_INSTANCE, arg.vlcReuseInstance);
    }

    if (arg.startFullscreen !== undefined) {
        store.set(START_FULLSCREEN, Boolean(arg.startFullscreen));
    }

    if (arg.autoLaunchAtLogin !== undefined) {
        applyAutoLaunchAtLogin(Boolean(arg.autoLaunchAtLogin));
    }

    // Handle remote control settings
    if (
        arg.remoteControl !== undefined ||
        arg.remoteControlPort !== undefined
    ) {
        const enabled = arg.remoteControl ?? store.get('remoteControl', false);
        const port =
            arg.remoteControlPort ?? store.get('remoteControlPort', 8765);

        // Save to store
        if (arg.remoteControl !== undefined) {
            store.set('remoteControl', enabled);
        }
        if (arg.remoteControlPort !== undefined) {
            store.set('remoteControlPort', port);
        }

        // Update HTTP server
        httpServer.updateSettings(enabled, port);
    }
});
