# Agent notes for this repo

Personal dotfiles for Windows and Linux. `install.ps1` and `install.sh` symlink every file under `Windows/` or `Linux/` into the home directory.

## Layout

- `Windows/`, `Linux/`: deployed configs. A file's path under the platform folder is its path under the home directory. On Windows, `AppData/Roaming/`, `AppData/Local/` and `AppData/LocalLow/` map to `%APPDATA%`, `%LOCALAPPDATA%` and `%USERPROFILE%\AppData\LocalLow`.
- `Legacy/`: retired configs kept for reference. The install scripts never read it.
- `Manual/`: configs applied by hand. The install scripts never read it. Paths mirror the home directory the same way as under `Windows/` and `Linux/`; a folder name that differs per install becomes an uppercase placeholder such as `claude_INSTALL_ID`. A snapshot here keeps only settings the user chose: replace account IDs with `ACCOUNT_UUID` and leave out machine paths, device names and app state.
- `backup/`: local copies of secret files. Gitignored.
- `Temp/`: scratch space, including third-party configs kept for reference. Gitignored.

## Editing live configs

Every deployed file is a symlink back into this repo, so editing a live config edits the repo file. Check `git diff` after changing an app's settings.

## Secrets and templates

A config that holds a secret is committed as `<name>.template`, with placeholders such as `YOUR_TOKEN` or `YOUR_EXA_API_KEY`. On first run the install script copies it to `<name>` inside the repo (gitignored) and links that copy.

- To update a template, copy the real file and replace every secret value with a placeholder. Search the staged diff for token-like strings before committing.
- Leave out values a tool generates per machine, such as Windows Terminal profile GUIDs and WSL entries.
- Add the real file's path to `.gitignore` in the same change that adds a template.

## Retiring a config

Move it under `Legacy/` at the same relative path (`git mv Windows/x Legacy/Windows/x`). For a template-managed config, also:

1. Turn the live symlink into a standalone file first (read the bytes, delete the link, write the bytes back, as `install.ps1 -Revert` does), so the app keeps its settings.
2. Move the gitignored real file into `backup/<platform>/<same path>`. If it stays in the platform folder, the next install links it as a regular file.

To delete a config outright, remove its live symlink too, or the link dangles.

## .gitignore

Two sections: secret files materialized from templates, then local-only folders. The first holds a `# Linux` block and a `# Windows` block, each sorted a-z by path.

## README

The "Tools covered" lists in `README.md` match what is under `Windows/` and `Linux/`. Update them when a config is added or retired.
