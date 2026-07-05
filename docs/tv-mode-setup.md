# TV Mode Setup Guide

Turn IPTVnator into a "set-top box" that boots straight into a fullscreen
IPTV player when the machine powers on. Written for the common case of an
older Mac (e.g. a 2015 27" iMac with a Radeon R9 M380) repurposed as a TV,
but the steps apply to any macOS or Windows desktop.

## What "TV Mode" gives you

Two toggles under **Settings → General** (desktop app only):

| Setting               | Effect                                                                 |
| --------------------- | --------------------------------------------------------------------- |
| **Start in fullscreen** | The app window opens fullscreen every time IPTVnator launches.        |
| **Launch at login**     | The OS starts IPTVnator automatically after you log in (macOS/Windows).|

Plus a **Startup behavior → Resume last channel** option that reopens and
plays the last live TV channel you watched (see
[Resume last channel](#resume-the-last-watched-channel)).

Combine them with the OS-level **automatic login** setting (below) and the
machine goes: power on → desktop → IPTVnator fullscreen, already playing your
last channel — no interaction.

> These two settings only exist in the Electron desktop build. They are
> hidden in the browser/PWA version because a web page cannot register a
> login item or force the OS window into fullscreen at boot.

---

## Prerequisites

- macOS (this feature's "Launch at login" uses a native macOS/Windows login
  item; on Linux Electron cannot register one — see
  [Linux note](#linux-note)).
- The IPTVnator build that contains TV Mode. If you are reading this in the
  repo, that is the current branch — you will build it yourself in Step 1.
- At least one playlist ready to import (M3U/M3U8 URL or file, Xtream Codes
  credentials, or a Stalker portal).

---

## Step 1 — Build and install the app

TV Mode ships in this repository. Build the packaged macOS app on the Mac
itself (native modules like `better-sqlite3` are compiled for the machine
they run on):

```bash
# From the repository root
pnpm install --frozen-lockfile

# Build the frontend + Electron backend and produce a distributable
pnpm run make:app
# (equivalent to: pnpm nx run electron-backend:make)
```

The finished app lands under `dist/` (an `.app`, and depending on your
config a `.dmg`). Drag `IPTVnator.app` into `/Applications`.

> Prefer not to build? If a released version that includes TV Mode is
> available on the [Releases page](https://github.com/4gray/iptvnator/releases),
> install that instead and skip to Step 2. The two toggles appear once the
> build includes this change.

### First run on macOS

Because the app is not notarized under your own developer account, macOS
Gatekeeper may block the first launch ("App is damaged / can't be opened").
Clear the quarantine flag once:

```bash
xattr -cr /Applications/IPTVnator.app
```

Then open it (right-click → Open the first time if prompted).

---

## Step 2 — Add a playlist

Launch IPTVnator normally and add your source so there is something to play:

1. Go to **Sources** (or the dashboard "Add" action).
2. Add your M3U URL/file, Xtream Codes login, or Stalker portal.
3. Confirm a channel plays.

Do this before enabling fullscreen-at-boot so you are not stuck configuring
inside a fullscreen window with no obvious chrome.

---

## Step 3 — Enable TV Mode

1. Open **Settings** (gear icon) → **General**.
2. Scroll to the startup options and enable:
    - ✅ **Start in fullscreen**
    - ✅ **Launch at login**
3. Click **Save**.

"Launch at login" takes effect immediately — the app is registered as a
macOS login item right away. "Start in fullscreen" applies on the **next**
launch, so quit and reopen once to confirm it boots fullscreen.

Verify the login item was created:

- **macOS**: System Settings → General → **Login Items & Extensions** →
  IPTVnator should be listed under "Open at Login".
- **Windows**: Task Manager → **Startup apps** → IPTVnator = Enabled.

---

## Resume the last watched channel

To have IPTVnator reopen your last live channel on launch:

1. Open **Settings → General → Startup behavior**.
2. Choose **Resume last channel**.

On the next launch the app navigates to that channel's playlist and starts
playing it automatically. If the channel (or its playlist) no longer exists,
it falls back to the normal first view. This currently covers **M3U live TV**
channels — the canonical "TV channel" — and the app remembers the channel
across restarts.

Pair this with **Start in fullscreen** + **Launch at login** + macOS
auto-login for a true appliance: power on and your channel is already playing
full-screen.

## The app launcher (emulators & other apps)

The desktop build doubles as an all-in-one TV + emulator front-end. Open the
**Apps & games** entry in the left rail (`/workspace/apps`) to launch native
apps without leaving IPTVnator.

1. PCSX2 (PS2) and RPCS3 (PS3) tiles ship built-in but start **unconfigured**.
2. Click a tile (or its folder icon) and pick the emulator's executable:
    - **macOS**: the `.app` bundle, e.g. `/Applications/PCSX2.app` or
      `/Applications/RPCS3.app` (launched via `open -a`).
    - **Linux/Windows**: the binary or `.exe` (e.g. an AppImage, `/usr/bin/pcsx2`).
3. Once a path is set, the tile turns into a one-click launcher.
4. **Add app** lets you register any other executable (Dolphin, Steam Big
   Picture, RetroArch, a browser…); the name is taken from the filename.
5. The launcher spawns each app as an independent process — it keeps running
   if you quit IPTVnator, and IPTVnator keeps playing if you close the app.

Tip for a controller-only couch setup: launch the emulator, use it, and quit
it to return to IPTVnator (still in fullscreen). Configure your emulators for
fullscreen output so the whole flow stays TV-friendly.

> The launcher only ever runs paths you configured yourself — it stores an
> allow-list of executables and launches by id, so nothing can ask it to run
> an arbitrary command.

## Step 4 — Auto-login at boot (macOS)

"Launch at login" starts the app *after a user logs in*. For a true
turn-it-on-and-it-plays TV, also enable macOS automatic login so no password
prompt sits between power-on and the desktop:

1. System Settings → **Users & Groups**.
2. Set **Automatically log in as** → your user, and enter the password.

> macOS disables automatic login when FileVault is on. If you rely on
> auto-login for the TV, keep FileVault **off** on this dedicated machine, or
> accept typing the password once at boot.

Now the full chain works: **power on → auto-login → IPTVnator opens
fullscreen**.

---

## Step 5 — Keep the screen awake

A TV that dims after 10 minutes is useless. IPTVnator already holds a
display-sleep blocker **while a stream is actively playing** through the
embedded/native players (`powerSaveBlocker` with `prevent-display-sleep`),
but nothing prevents sleep while you are just sitting on a menu.

For a dedicated TV box, disable display sleep at the OS level too:

1. System Settings → **Displays** → **Advanced…** (or **Battery/Energy**),
   and set the display to never turn off while on power.
2. Optionally, from a login script or Terminal, run `caffeinate -d` to keep
   the display awake for the session.

---

## Step 6 — Player choice and performance (older AMD GPUs)

The R9 M380 handles 1080p HLS comfortably. Tips for smooth playback on aging
hardware:

- **Built-in player** (default, HLS.js / Video.js / ArtPlayer) is the
  simplest and needs no extra software.
- **MPV** (external or embedded) is the most robust for heavy 4K or awkward
  codecs. Install it and point IPTVnator at it under **Settings → Playback**:

    ```bash
    brew install mpv
    ```

  The app auto-detects `mpv` on your `PATH` (and common `mpv.app` bundle
  paths). Embedded MPV renders inside the IPTVnator window; external MPV
  opens its own window — for a TV, embedded keeps everything in one
  fullscreen surface.
- If you see tearing or heavy GPU load with the built-in player, try MPV,
  which offloads decoding to a dedicated pipeline.

---

## Everyday use

- **Exit fullscreen**: standard macOS `⌃⌘F` (Control-Command-F), or `Esc`
  from most player views.
- **Quit**: `⌘Q`.
- **Turn TV Mode off**: reopen **Settings → General** and clear the two
  toggles, then Save. Clearing "Launch at login" removes the OS login item.
- **Remote control**: if you enable the mobile remote control
  (**Settings → Remote control**), you can drive the TV from your phone on
  the same network — handy when the iMac has no keyboard nearby.

---

## Troubleshooting

**The two toggles aren't in Settings → General.**
You are running the PWA/browser version, or a build that predates this
feature. Use the desktop app built in Step 1.

**"Launch at login" is on but the app doesn't start after boot.**
Check the OS login-items list (Step 3). Note that login items only fire for
the packaged, installed app — running from `nx serve` / `pnpm run serve:backend`
during development will not auto-start. Also confirm you actually logged in
(enable auto-login in Step 4 for a hands-free boot).

**It launches but not fullscreen.**
"Start in fullscreen" applies from the next launch after you saved it. Quit
fully (`⌘Q`) and reopen. If a previous non-fullscreen window position is
"stuck," resize/close the window once and relaunch.

**Screen dims mid-menu.**
The in-app blocker only runs during active playback. Disable display sleep
at the OS level (Step 5).

**Gatekeeper blocks the app after each update.**
Re-run `xattr -cr /Applications/IPTVnator.app` after replacing the bundle.

### Linux note

Electron cannot register a login item on Linux, so **"Launch at login" is a
no-op there** (the setting is applied only on macOS and Windows).
"Start in fullscreen" still works. To auto-start on Linux, create a
`~/.config/autostart/iptvnator.desktop` entry pointing at the installed
binary yourself.

---

## How it works (for maintainers)

- **Start in fullscreen** — persisted by the `SETTINGS_UPDATE` IPC handler
  into the electron-conf store under the `START_FULLSCREEN` key
  (`apps/electron-backend/src/app/services/store.service.ts`). On startup,
  `App.initMainWindow()` reads it and constructs the `BrowserWindow` with
  `fullscreen: true` (`apps/electron-backend/src/app/app.ts`).
- **Launch at login** — `applyAutoLaunchAtLogin()` in
  `apps/electron-backend/src/app/events/settings.events.ts` calls Electron's
  `app.setLoginItemSettings({ openAtLogin })`. It runs only on `darwin` and
  `win32`; the OS owns the login-item state, so it is applied on save rather
  than stored in electron-conf.
- **Settings surface** — the toggles live in the General settings section
  (`apps/web/src/app/settings/settings-general-section.component.html`), gated
  behind `isDesktop`, with the `startFullscreen` / `autoLaunchAtLogin` fields
  defined on the shared `Settings` interface
  (`libs/shared/interfaces/src/lib/settings.interface.ts`).

See the "TV Mode Startup" entry in `CLAUDE.md` for the concise architecture
summary.
