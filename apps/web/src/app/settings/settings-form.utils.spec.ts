import { FormBuilder } from '@angular/forms';
import { Settings } from '@iptvnator/shared/interfaces';
import {
    createSettingsForm,
    createSettingsFromFormValue,
} from './settings-form.utils';

describe('settings form utils', () => {
    const formBuilder = new FormBuilder();

    it('defaults the TV mode startup toggles to disabled', () => {
        const form = createSettingsForm(formBuilder, false);

        const settings = createSettingsFromFormValue(form, {} as Settings);

        expect(settings.startFullscreen).toBe(false);
        expect(settings.autoLaunchAtLogin).toBe(false);
    });

    it('defaults TV remote navigation to enabled and maps its toggle', () => {
        const form = createSettingsForm(formBuilder, false);

        expect(
            createSettingsFromFormValue(form, {} as Settings)
                .tvRemoteNavigation
        ).toBe(true);

        form.patchValue({ tvRemoteNavigation: false });

        expect(
            createSettingsFromFormValue(form, {} as Settings)
                .tvRemoteNavigation
        ).toBe(false);
    });

    it('maps the TV mode startup toggles from the form value', () => {
        const form = createSettingsForm(formBuilder, false);
        form.patchValue({ startFullscreen: true, autoLaunchAtLogin: true });

        const settings = createSettingsFromFormValue(form, {} as Settings);

        expect(settings.startFullscreen).toBe(true);
        expect(settings.autoLaunchAtLogin).toBe(true);
    });
});
