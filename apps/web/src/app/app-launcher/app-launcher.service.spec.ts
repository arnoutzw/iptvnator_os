import { deriveAppNameFromPath } from './app-launcher.service';

describe('deriveAppNameFromPath', () => {
    it('strips directories and a macOS .app extension', () => {
        expect(deriveAppNameFromPath('/Applications/PCSX2.app')).toBe('PCSX2');
    });

    it('strips a Windows .exe extension and backslash directories', () => {
        expect(deriveAppNameFromPath('C:\\Games\\rpcs3.exe')).toBe('rpcs3');
    });

    it('returns the basename for a plain executable', () => {
        expect(deriveAppNameFromPath('/usr/bin/dolphin-emu')).toBe(
            'dolphin-emu'
        );
    });
});
