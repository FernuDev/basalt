# Release Setup — One-time steps before first release

## Step 1 — Generate signing keys

Run once on your local machine:
```bash
npx tauri signer generate -w ~/.tauri/basalt.key
```

Two outputs:
- `~/.tauri/basalt.key` — private key, NEVER commit this file
- Public key — printed to terminal, copy it now

## Step 2 — Add secrets to GitHub

Go to: Settings → Secrets and variables → Actions

Create two repository secrets:

| Secret name | Value |
|-------------|-------|
| `TAURI_SIGNING_PRIVATE_KEY` | Full contents of `~/.tauri/basalt.key` |
| `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` | Password you entered during generation |

## Step 3 — Add public key to tauri.conf.json

In `src-tauri/tauri.conf.json`, inside `plugins.updater`, set:
```json
"pubkey": ""
```

## Step 4 — Publish a release
```bash
git add .
git commit -m "chore: prepare v0.1.0"
git tag v0.1.0
git push origin main --tags
```

GitHub Actions will:
1. Spin up macOS (x2), Ubuntu, and Windows runners in parallel
2. Compile and sign the app on each platform
3. Upload all binaries + latest.json to a draft Release

Go to github.com/FernuDev/basalt/releases, review the draft, and click Publish.

## Step 5 — Download URLs after first release

Once published, direct download links follow this pattern:

- macOS Apple Silicon: `.../download/v0.1.0/Basalt_0.1.0_aarch64.dmg`
- macOS Intel:         `.../download/v0.1.0/Basalt_0.1.0_x64.dmg`
- Windows:             `.../download/v0.1.0/Basalt_0.1.0_x64-setup.exe`
- Linux:               `.../download/v0.1.0/Basalt_0.1.0_amd64.AppImage`

Always-latest shortcut (use this in the landing page):
`https://github.com/FernuDev/basalt/releases/latest`
