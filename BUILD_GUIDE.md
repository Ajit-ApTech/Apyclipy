# 🚀 Apyclipy Desktop Build Guide

The desktop client utilizes **python-build-standalone (PBS)** combined with **Tauri 2.x**. It bundles a portable Python runtime, backend source, and static FFmpeg/FFprobe binaries inside the native application wrapper. End-users do not need Python or FFmpeg pre-installed on their machines.

## Local Build (macOS Apple Silicon)

```bash
./scripts/build_macos_arm.sh
```

Build outputs:
```
src-tauri/target/release/bundle/macos/
├── Apyclipy Desktop.app                    # Native App bundle
└── Apyclipy Desktop_1.0.0_aarch64.dmg      # DMG Installer package
```

### Build Dependencies

| Tool | Version | Description |
| :--- | :--- | :--- |
| **Node.js** | 18+ | Frontend bundle compilation |
| **Rust** | stable | Toolchain with `aarch64-apple-darwin` target |
| **cargo-tauri** | 2.x | `cargo install tauri-cli` |

System Python or FFmpeg are **not** required globally — the build script downloads and caches portable runtimes under `build/`.

## Local Build (Windows x64)

Run within **Git Bash** (with MSVC toolchain, VS Build Tools C++ components, Node.js, and cargo-tauri installed):

```bash
bash scripts/build_windows_x64.sh
```

Output:
```
src-tauri/target/release/bundle/nsis/
└── Apyclipy Desktop_<version>_x64-setup.exe
```

## Troubleshooting & Verification

You can verify the backend directly by executing the compiled binary:
```bash
'/Applications/Apyclipy Desktop.app/Contents/MacOS/autoclip-desktop'
```
You should observe `Backend started on port: XXXXX` and `Application startup complete`.
