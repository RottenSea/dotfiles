# dotfiles

Cross-platform config for Linux and Windows, kept in one repo.

## Navigation

- [Installing](#installing)
- [Windows](#windows)
- [Linux](#linux)
- [Layout](#layout)
- [Secrets](#secrets)
- [Manual](#manual)

## Installing

Install [Node.js](https://nodejs.org/) 22 or later first. Then, from the repo root:

```bash
node install.mjs
```

The script picks `Windows/` or `Linux/` by the system it runs on and symlinks every file in it into the home directory: `$HOME` on Linux, `%USERPROFILE%` on Windows, where `AppData/Roaming/`, `AppData/Local/` and `AppData/LocalLow/` go to `%APPDATA%`, `%LOCALAPPDATA%` and `%USERPROFILE%\AppData\LocalLow`. A `.template` file is first copied to the same name without `.template`, inside the repo, and that copy is linked. See [Secrets](#secrets).

A link that already points at the repo is left alone, so running the script again is safe. Anything else at a target is moved into `~/dotfiles_backup_<time>/` first. Some apps save over their link with a plain file; the script says when such a file differs from the repo, so you can compare the backup and copy the changes back.

On Windows, creating symlinks needs Developer Mode (Settings → System → For developers) or an elevated terminal.

| Command | What it does |
| --- | --- |
| `node install.mjs` | Link everything (default). |
| `node install.mjs --revert` | Turn every managed symlink back into a standalone file with the same content. The repo is untouched; the files just stop tracking it. |
| `node install.mjs --backup` | Copy the local secret files (made from `.template`, listed in `.gitignore`) into `backup/<platform>/`, at their path under the platform folder. Only touches files inside the repo. See [Secrets](#secrets). |
| `node install.mjs --dry-run` | Print what the command would do without changing anything. Add it to any command above. |

`--revert` and `--backup` can't be used together. `npm test` runs the script's tests in temporary folders.

## Windows

### Tools covered

- Claude Code
- Claude Desktop (applied by hand, see [Manual](#manual))
- Fastfetch
- Windows PowerShell profile
- VS Code
- Windows Terminal

## Linux

### Tools covered

- Shell and core: `.bashrc`, `.bash_profile`, `.bash_logout`, `.npmrc`
- Terminal: Alacritty, Kitty
- Editor: VS Code
- System and UI: Niri, XDG-Desktop-Portal, XFCE, Fastfetch, Fcitx5, Noctalia
- AI: Claude Code

## Layout

- `install.mjs`: the install script. Its tests are in `test/`.
- `Linux/`: Linux configs and dotfiles.
- `Windows/`: Windows configs.
- `Legacy/`: retired configs (OpenCode, Prettier, Zed) kept for reference only, not installed or symlinked anywhere.
- `Manual/`: configs the install scripts never touch. Apply them by hand on a new machine.

## Secrets

API keys and tokens never get committed. The repo uses a sanitized template pattern:

- The real secret file goes in `.gitignore`.
- A redacted copy with the same name plus `.template` is committed. Placeholders like `YOUR_TOKEN` mark where secrets go.
- On a new machine, copy the template to its real path and fill in your own values.

Since real secret files are never committed, `node install.mjs --backup` copies them into `backup/`, mirroring their path under `Windows/` or `Linux/`. That folder is gitignored too. It's a local safety net, not a way to share secrets through the repo.

Templates also should not hardcode values that a tool auto-generates per machine or per install (e.g. Windows Terminal profile GUIDs for shells it detects, WSL distro entries) — these differ across machines and change as tools are installed/removed. Let the tool regenerate them locally instead of committing a snapshot.

## Manual

### Claude Desktop

`Manual/Windows/AppData/Local/Claude-Data/claude_INSTALL_ID/claude_desktop_config.json` holds the Claude Desktop preferences worth carrying to a new machine. Its path mirrors the live file under `%LOCALAPPDATA%`, with `claude_INSTALL_ID` standing in for the folder name that differs per install. The app rewrites the live file often, so it can't be symlinked.

To apply it, quit Claude Desktop, merge these keys into the live `claude_desktop_config.json`, and start the app again. Replace `ACCOUNT_UUID` with the account ID already used as a key in the live file. Setting the same options in the app's Settings works too.
