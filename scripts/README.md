# Apyclipy Scripts & Utilities

Build, packaging, and maintenance scripts for **Apyclipy**.

## Script Overview

| Script | Purpose |
| :--- | :--- |
| `build_macos_arm.sh` | Desktop packaging (macOS Apple Silicon). Produces `.app`, `.dmg`, and updater bundles. |
| `build_windows_x64.sh` | Desktop packaging (Windows x64). Generates NSIS installer `*-setup.exe`. |
| `verify_desktop.sh` | Backend smoke tests: runs `cargo check` + launches backend to verify `/health`. |
| `runtime/start.sh` | Core web runtime launcher supporting foreground and background detached modes. |
| `runtime/docker.sh` | Shared Docker launcher for Compose v2. |

## Desktop Packaging

### macOS Apple Silicon
```bash
./scripts/build_macos_arm.sh
```

### Windows x64 (Git Bash)
```bash
bash scripts/build_windows_x64.sh
```
