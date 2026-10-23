# dotfiles

Cross-platform config for Linux and Windows, kept in one repo.

## Navigation

- [Windows](#windows)
- [Linux](#linux)
- [Layout](#layout)
- [Secrets](#secrets)

## Windows

### Tools covered

- Claude Code
- Fastfetch
- Windows PowerShell profile
- VS Code
- Windows Terminal

### Installing

From the repo root:

```powershell
.\install.ps1
```

It symlinks everything under `Windows/` into place under `%USERPROFILE%`, `%APPDATA%`, or `%LOCALAPPDATA%` (mapped by path), materializing any `.template` file into a real file first. Creating symlinks needs either an elevated PowerShell or Developer Mode enabled (Settings → Privacy & Security → Developer Mode).

`install.ps1` takes one optional switch:

| Command | What it does |
| --- | --- |
| `.\install.ps1` | Install/update symlinks (default, shown above). |
| `.\install.ps1 -Revert` | Turn every managed symlink back into a standalone file with the same content. The repo is untouched; the files just stop tracking it. |
| `.\install.ps1 -Backup` | Copy the local secret files (materialized from `.template`, listed in `.gitignore`) into `backup\Windows\`, mirroring their path under `Windows\`. Only touches files inside the repo, never `%USERPROFILE%`/`%APPDATA%`. See [Secrets](#secrets). |

`-Revert` and `-Backup` are mutually exclusive; pass only one.

## Linux

### Tools covered

- Shell and core: `.bashrc`, `.bash_profile`, `.bash_logout`, `.npmrc`
- Terminal: Alacritty, Kitty
- Editor: VS Code
- System and UI: Niri, XDG-Desktop-Portal, XFCE, Fastfetch, Fcitx5, Noctalia
- AI: Claude Code

### Installing

From the repo root:

```bash
./install.sh
```

It symlinks everything under `Linux/` into place under `$HOME`, materializing any `.template` file into a real file first.

`install.sh` takes one optional flag:

| Command | What it does |
| --- | --- |
| `./install.sh` | Install/update symlinks (default, shown above). |
| `./install.sh --revert` | Turn every managed symlink back into a standalone file with the same content. The repo is untouched; the files just stop tracking it. |
| `./install.sh --backup` | Copy the local secret files (materialized from `.template`, listed in `.gitignore`) into `backup/Linux/`, mirroring their path under `Linux/`. Only touches files inside the repo, never `$HOME`. See [Secrets](#secrets). |

`--revert` and `--backup` are mutually exclusive; pass only one.

## Layout

- `Linux/`: Linux configs and dotfiles.
- `Windows/`: Windows configs, actively deployed via `install.ps1`.
- `Legacy/`: retired configs (OpenCode, Prettier, Zed) kept for reference only, not installed or symlinked anywhere.

## Secrets

API keys and tokens never get committed. The repo uses a sanitized template pattern:

- The real secret file goes in `.gitignore`.
- A redacted copy with the same name plus `.template` is committed. Placeholders like `YOUR_TOKEN` mark where secrets go.
- On a new machine, copy the template to its real path and fill in your own values.

Since real secret files are never committed, `.\install.ps1 -Backup` (Windows) / `./install.sh --backup` (Linux) copies them into `backup/`, mirroring their path under `Windows/`/`Linux/`. That folder is gitignored too. It's a local safety net, not a way to share secrets through the repo.

Templates also should not hardcode values that a tool auto-generates per machine or per install (e.g. Windows Terminal profile GUIDs for shells it detects, WSL distro entries) — these differ across machines and change as tools are installed/removed. Let the tool regenerate them locally instead of committing a snapshot.
