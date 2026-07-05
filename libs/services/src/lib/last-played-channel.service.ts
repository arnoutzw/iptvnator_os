import { Injectable } from '@angular/core';

/**
 * A live TV channel the user last watched, persisted so the app can resume it
 * on the next launch (TV-box "power on → last channel" behavior). Currently
 * scoped to M3U live TV — the canonical "TV channel" — but the shape is
 * provider-tagged so other live sources can be added later.
 */
export interface LastPlayedChannel {
    provider: 'm3u';
    playlistId: string;
    channelUrl: string;
    title?: string;
}

interface PendingResume {
    playlistId: string;
    channelUrl: string;
}

const LAST_PLAYED_CHANNEL_KEY = 'iptvnator:last-played-channel-v1';
const RESUME_PENDING_KEY = 'iptvnator:resume-channel-pending-v1';

/**
 * Persists the last-played live channel (localStorage) and coordinates a
 * one-shot "resume this channel" hand-off from the startup router to the M3U
 * player via sessionStorage.
 *
 * Split into two stores on purpose:
 * - localStorage keeps the last channel across launches (the record).
 * - sessionStorage arms a single resume for the current launch (the intent),
 *   so a manual navigation away from the channel does not keep re-triggering
 *   autoplay for the rest of the session.
 */
@Injectable({ providedIn: 'root' })
export class LastPlayedChannelService {
    record(channel: LastPlayedChannel): void {
        if (!channel.playlistId || !channel.channelUrl) {
            return;
        }

        this.write(LAST_PLAYED_CHANNEL_KEY, JSON.stringify(channel));
    }

    getLastPlayed(): LastPlayedChannel | null {
        const raw = this.read(LAST_PLAYED_CHANNEL_KEY);
        if (!raw) {
            return null;
        }

        try {
            const parsed = JSON.parse(raw) as LastPlayedChannel;
            if (
                parsed?.provider === 'm3u' &&
                typeof parsed.playlistId === 'string' &&
                typeof parsed.channelUrl === 'string'
            ) {
                return parsed;
            }
        } catch {
            // Ignore malformed persisted data.
        }

        return null;
    }

    clear(): void {
        this.remove(LAST_PLAYED_CHANNEL_KEY);
    }

    /** Arm a one-shot resume for the current launch (consumed by the player). */
    armResume(playlistId: string, channelUrl: string): void {
        if (!playlistId || !channelUrl) {
            return;
        }

        this.writeSession(
            RESUME_PENDING_KEY,
            JSON.stringify({ playlistId, channelUrl } satisfies PendingResume)
        );
    }

    /** Read the armed resume without clearing it. */
    peekResume(): PendingResume | null {
        const raw = this.readSession(RESUME_PENDING_KEY);
        if (!raw) {
            return null;
        }

        try {
            const parsed = JSON.parse(raw) as PendingResume;
            if (
                typeof parsed?.playlistId === 'string' &&
                typeof parsed?.channelUrl === 'string'
            ) {
                return parsed;
            }
        } catch {
            // Ignore malformed session data.
        }

        return null;
    }

    clearResume(): void {
        this.removeSession(RESUME_PENDING_KEY);
    }

    private read(key: string): string | null {
        try {
            return localStorage.getItem(key);
        } catch {
            return null;
        }
    }

    private write(key: string, value: string): void {
        try {
            localStorage.setItem(key, value);
        } catch {
            // Ignore storage write failures (private mode / quota).
        }
    }

    private remove(key: string): void {
        try {
            localStorage.removeItem(key);
        } catch {
            // Ignore.
        }
    }

    private readSession(key: string): string | null {
        try {
            return sessionStorage.getItem(key);
        } catch {
            return null;
        }
    }

    private writeSession(key: string, value: string): void {
        try {
            sessionStorage.setItem(key, value);
        } catch {
            // Ignore.
        }
    }

    private removeSession(key: string): void {
        try {
            sessionStorage.removeItem(key);
        } catch {
            // Ignore.
        }
    }
}
