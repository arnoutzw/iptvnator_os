import { LastPlayedChannelService } from './last-played-channel.service';

describe('LastPlayedChannelService', () => {
    let service: LastPlayedChannelService;

    beforeEach(() => {
        localStorage.clear();
        sessionStorage.clear();
        service = new LastPlayedChannelService();
    });

    it('records and reads back the last played channel', () => {
        service.record({
            provider: 'm3u',
            playlistId: 'p1',
            channelUrl: 'http://example.com/s.m3u8',
            title: 'News',
        });

        expect(service.getLastPlayed()).toEqual({
            provider: 'm3u',
            playlistId: 'p1',
            channelUrl: 'http://example.com/s.m3u8',
            title: 'News',
        });
    });

    it('ignores records missing playlist or url', () => {
        service.record({
            provider: 'm3u',
            playlistId: '',
            channelUrl: 'http://example.com/s.m3u8',
        });
        expect(service.getLastPlayed()).toBeNull();
    });

    it('returns null for malformed persisted data', () => {
        localStorage.setItem('iptvnator:last-played-channel-v1', '{not json');
        expect(service.getLastPlayed()).toBeNull();
    });

    it('clears the stored channel', () => {
        service.record({
            provider: 'm3u',
            playlistId: 'p1',
            channelUrl: 'http://example.com/s.m3u8',
        });
        service.clear();
        expect(service.getLastPlayed()).toBeNull();
    });

    it('arms, peeks and clears a one-shot resume', () => {
        service.armResume('p1', 'http://example.com/s.m3u8');
        expect(service.peekResume()).toEqual({
            playlistId: 'p1',
            channelUrl: 'http://example.com/s.m3u8',
        });

        service.clearResume();
        expect(service.peekResume()).toBeNull();
    });
});
