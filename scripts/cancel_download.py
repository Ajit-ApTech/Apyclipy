#!/usr/bin/env python3
"""
Apyclipy Manual Download & Task Cancellation Tool.
Stops active video downloads (yt-dlp/ffmpeg/subprocesses),
cleans up partial files, updates stuck project records, and frees disk space.
"""

import os
import sys
import glob
import json
import sqlite3
import shutil
import psutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "data"
DB_PATH = DATA_DIR / "autoclip.db"

def log_info(msg: str):
    print(f"\033[34mℹ️  {msg}\033[0m")

def log_success(msg: str):
    print(f"\033[32m✅ {msg}\033[0m")

def log_warn(msg: str):
    print(f"\033[33m⚠️  {msg}\033[0m")

def log_header(msg: str):
    print(f"\n\033[35m🚀 {msg}\033[0m")
    print("\033[35m" + "=" * 50 + "\033[0m")

def get_process_children(proc: psutil.Process) -> list[psutil.Process]:
    try:
        return proc.children(recursive=True)
    except (psutil.NoSuchProcess, psutil.AccessDenied):
        return []

def stop_download_processes() -> int:
    killed_count = 0
    killed_pids = set()

    # 1. Look for backend uvicorn process children or yt-dlp / ffmpeg processes
    for proc in psutil.process_iter(['pid', 'name', 'cmdline', 'cwd']):
        try:
            pid = proc.info['pid']
            if pid == os.getpid() or pid in killed_pids:
                continue
            
            cmdline = " ".join(proc.info['cmdline'] or [])
            cwd = proc.info['cwd'] or ""

            # Check if this process belongs to this autoclip checkout
            is_our_checkout = str(ROOT) in cwd or str(ROOT) in cmdline

            # Check for direct download / extraction commands
            is_downloader = any(tool in cmdline for tool in ['yt-dlp', 'ffmpeg', 'bilibili_downloader'])
            
            # Check for child worker doing download under uvicorn
            is_worker_child = is_our_checkout and ('spawn_main' in cmdline or 'resource_tracker' in cmdline)

            # Check if process has open .part or .ytdl files
            has_part_file = False
            if is_our_checkout:
                try:
                    for f in proc.open_files():
                        if f.path.endswith('.part') or f.path.endswith('.ytdl') or 'temp/youtube-' in f.path:
                            has_part_file = True
                            break
                except (psutil.AccessDenied, psutil.NoSuchProcess):
                    pass

            if (is_downloader and is_our_checkout) or has_part_file:
                log_info(f"Terminating downloader process: PID {pid} ({proc.name()})")
                proc.terminate()
                killed_pids.add(pid)
                killed_count += 1
            elif is_worker_child and has_part_file:
                log_info(f"Terminating active worker process: PID {pid}")
                proc.kill()
                killed_pids.add(pid)
                killed_count += 1

        except (psutil.NoSuchProcess, psutil.AccessDenied):
            continue

    if killed_pids:
        # Give them 2 seconds to terminate, then force kill if alive
        for pid in killed_pids:
            try:
                p = psutil.Process(pid)
                p.kill()
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                pass

    return killed_count

def clean_partial_files() -> tuple[int, int]:
    deleted_files = 0
    freed_bytes = 0

    # Search data directory for .part, .ytdl, and temp youtube directories
    patterns = [
        str(DATA_DIR / "**" / "*.part"),
        str(DATA_DIR / "**" / "*.ytdl"),
    ]

    for pat in patterns:
        for filepath in glob.glob(pat, recursive=True):
            p = Path(filepath)
            try:
                size = p.stat().st_size
                p.unlink()
                deleted_files += 1
                freed_bytes += size
                log_info(f"Removed partial file: {p.name} ({size / (1024 * 1024):.2f} MB)")
            except Exception as e:
                log_warn(f"Could not remove {filepath}: {e}")

    # Remove temporary youtube download directories under data/temp
    temp_dir = DATA_DIR / "temp"
    if temp_dir.exists():
        for item in temp_dir.glob("youtube-*"):
            if item.is_dir():
                try:
                    dir_size = sum(f.stat().st_size for f in item.glob('**/*') if f.is_file())
                    shutil.rmtree(item)
                    deleted_files += 1
                    freed_bytes += dir_size
                    log_info(f"Removed temp folder: {item.name} ({dir_size / (1024 * 1024):.2f} MB)")
                except Exception as e:
                    log_warn(f"Could not remove {item}: {e}")

    return deleted_files, freed_bytes

def update_database_tasks() -> int:
    if not DB_PATH.exists():
        return 0

    updated = 0
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()

        # Find projects stuck in processing or pending with download in config
        cursor.execute("SELECT id, name, status, processing_config FROM projects WHERE status IN ('processing', 'pending');")
        rows = cursor.fetchall()
        for pid, name, status, config_str in rows:
            config = {}
            if config_str:
                try:
                    config = json.loads(config_str)
                except Exception:
                    pass

            # Mark as cancelled if download was in progress
            config['download_status'] = 'cancelled'
            config['error'] = 'Download cancelled manually by user'
            cursor.execute(
                "UPDATE projects SET status = 'failed', processing_config = ? WHERE id = ?;",
                (json.dumps(config), pid)
            )
            updated += 1
            log_info(f"Updated project record '{name}' ({pid[:8]}...) -> Status: FAILED (Cancelled)")

        # Update any pending tasks in tasks table
        cursor.execute("UPDATE tasks SET status = 'failed', error_message = 'Cancelled by user' WHERE status IN ('processing', 'pending');")
        conn.commit()
        conn.close()
    except Exception as e:
        log_warn(f"Database update notice: {e}")

    return updated

def main():
    log_header("AutoClip Manual Download Cancellation")

    # Step 1: Kill active download processes
    log_info("Scanning for active download processes...")
    killed = stop_download_processes()
    if killed > 0:
        log_success(f"Stopped {killed} active download process(es)")
    else:
        log_info("No active downloader processes were streaming")

    # Step 2: Clean partial and temporary files
    log_info("Cleaning up partial download files and temporary folders...")
    deleted_files, freed_bytes = clean_partial_files()
    if deleted_files > 0:
        log_success(f"Cleaned up {deleted_files} file(s) / folder(s), freed {freed_bytes / (1024 * 1024):.2f} MB")
    else:
        log_info("No partial files found to delete")

    # Step 3: Update database records
    log_info("Checking for incomplete project records in database...")
    updated_records = update_database_tasks()
    if updated_records > 0:
        log_success(f"Updated {updated_records} stuck project(s) to cancelled state")
    else:
        log_info("Database is clean (no stuck download projects)")

    log_header("Cancellation Complete")
    log_success("All downloads have been stopped and disk space cleaned up.")

if __name__ == '__main__':
    main()
