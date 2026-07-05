import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import {
    LastPlayedChannelService,
    PlaylistsService,
    SettingsStore,
} from '@iptvnator/services';
import { StartupBehavior } from '@iptvnator/shared/interfaces';
import { WorkspaceStartupPreferencesService } from './workspace-startup-preferences.service';

describe('WorkspaceStartupPreferencesService', () => {
    let service: WorkspaceStartupPreferencesService;
    let playlistsService: { getAllPlaylists: jest.Mock };
    let lastPlayedChannel: {
        getLastPlayed: jest.Mock;
        armResume: jest.Mock;
    };
    let settingsStore: {
        loadSettings: jest.Mock;
        showDashboard: ReturnType<typeof signal<boolean>>;
        startupBehavior: ReturnType<typeof signal<StartupBehavior>>;
    };

    beforeEach(() => {
        localStorage.clear();

        playlistsService = {
            getAllPlaylists: jest.fn().mockReturnValue(
                of([{ _id: 'playlist-1' }])
            ),
        };
        lastPlayedChannel = {
            getLastPlayed: jest.fn().mockReturnValue(null),
            armResume: jest.fn(),
        };
        settingsStore = {
            loadSettings: jest.fn().mockResolvedValue(undefined),
            showDashboard: signal(true),
            startupBehavior: signal(StartupBehavior.FirstView),
        };

        TestBed.configureTestingModule({
            providers: [
                WorkspaceStartupPreferencesService,
                {
                    provide: PlaylistsService,
                    useValue: playlistsService,
                },
                {
                    provide: LastPlayedChannelService,
                    useValue: lastPlayedChannel,
                },
                {
                    provide: SettingsStore,
                    useValue: settingsStore,
                },
            ],
        });

        service = TestBed.inject(WorkspaceStartupPreferencesService);
    });

    it('resolves the first view to dashboard when dashboard is enabled', async () => {
        await expect(service.resolveInitialWorkspacePath()).resolves.toBe(
            '/workspace/dashboard'
        );
    });

    it('resolves the first view to sources when dashboard is hidden', async () => {
        settingsStore.showDashboard.set(false);

        await expect(service.resolveInitialWorkspacePath()).resolves.toBe(
            '/workspace/sources'
        );
    });

    it('restores the last route when restore-last-view is enabled', async () => {
        settingsStore.startupBehavior.set(StartupBehavior.RestoreLastView);
        service.persistLastRestorablePath('/workspace/global-recent?q=matrix');

        await expect(service.resolveInitialWorkspacePath()).resolves.toBe(
            '/workspace/global-recent'
        );
    });

    it('falls back to sources when the stored dashboard route is hidden', async () => {
        settingsStore.showDashboard.set(false);
        settingsStore.startupBehavior.set(StartupBehavior.RestoreLastView);
        service.persistLastRestorablePath('/workspace/dashboard');

        await expect(service.resolveInitialWorkspacePath()).resolves.toBe(
            '/workspace/sources'
        );
    });

    it('canonicalizes detail routes to their section root', () => {
        expect(
            service.getRestorablePath(
                '/workspace/xtreams/playlist-1/vod/123/456?q=matrix'
            )
        ).toBe('/workspace/xtreams/playlist-1/vod');
    });

    it('ignores non-restorable routes', () => {
        expect(service.getRestorablePath('/workspace/settings')).toBeNull();
        expect(service.getRestorablePath('/workspace')).toBeNull();
        expect(service.getRestorablePath('/unknown')).toBeNull();
    });

    it('falls back to the first available view when the stored playlist no longer exists', async () => {
        settingsStore.startupBehavior.set(StartupBehavior.RestoreLastView);
        playlistsService.getAllPlaylists.mockReturnValue(of([]));
        service.persistLastRestorablePath('/workspace/xtreams/missing/live');

        await expect(service.resolveInitialWorkspacePath()).resolves.toBe(
            '/workspace/dashboard'
        );
    });

    it('resumes the last channel and arms the one-shot resume when enabled', async () => {
        settingsStore.startupBehavior.set(StartupBehavior.LastChannel);
        lastPlayedChannel.getLastPlayed.mockReturnValue({
            provider: 'm3u',
            playlistId: 'playlist-1',
            channelUrl: 'http://example.com/stream.m3u8',
        });

        await expect(service.resolveInitialWorkspacePath()).resolves.toBe(
            '/workspace/playlists/playlist-1/all'
        );
        expect(lastPlayedChannel.armResume).toHaveBeenCalledWith(
            'playlist-1',
            'http://example.com/stream.m3u8'
        );
    });

    it('falls back to the first view when there is no last channel', async () => {
        settingsStore.startupBehavior.set(StartupBehavior.LastChannel);
        lastPlayedChannel.getLastPlayed.mockReturnValue(null);

        await expect(service.resolveInitialWorkspacePath()).resolves.toBe(
            '/workspace/dashboard'
        );
        expect(lastPlayedChannel.armResume).not.toHaveBeenCalled();
    });

    it('falls back to the first view when the last channel playlist is gone', async () => {
        settingsStore.startupBehavior.set(StartupBehavior.LastChannel);
        playlistsService.getAllPlaylists.mockReturnValue(of([]));
        lastPlayedChannel.getLastPlayed.mockReturnValue({
            provider: 'm3u',
            playlistId: 'missing',
            channelUrl: 'http://example.com/stream.m3u8',
        });

        await expect(service.resolveInitialWorkspacePath()).resolves.toBe(
            '/workspace/dashboard'
        );
        expect(lastPlayedChannel.armResume).not.toHaveBeenCalled();
    });
});
