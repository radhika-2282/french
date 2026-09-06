import hashlib
import re
import sys
from pathlib import Path
from gtts import gTTS

# Configuration
src_folder = Path("./dist/")
voices_folder = Path("./assets/voices")

# Create audio output directory if it doesn't exist
voices_folder.mkdir(parents=True, exist_ok=True)

# Regex to handle extra parameters gracefully
pattern = r"speak\((['\"])(.*?)(?<!\\)\1[^)]*\)"


def get_text_hash(text: str) -> str:
    """Creates a unique hash for the text string."""
    return hashlib.md5(text.encode("utf-8")).hexdigest()


# Track all hashes that are actually found in the HTML files
active_hashes = set()

# --- STEP 1: Scan HTML files and generate missing audio ---
for file_path in src_folder.glob("*.html"):
    print(f"Scanning: {file_path.name}")

    try:
        content = file_path.read_text(encoding="utf-8")
        matches = re.finditer(pattern, content)

        for match in matches:
            text = match.group(2)

            # Clean up escape slashes so gTTS reads it naturally
            text_to_speak = (
                text.replace(r"\'", "'").replace(r'\"', '"').strip()
            )
            if not text_to_speak:
                continue

            text_hash = get_text_hash(text_to_speak)
            active_hashes.add(text_hash)

            audio_filename = f"{text_hash}.mp3"
            audio_path = voices_folder / audio_filename

            # Generate if missing
            if not audio_path.exists():
                print(
                    f"  -> [New] Generating French audio for: '{text_to_speak[:30]}'"
                )
                try:
                    tts = gTTS(text=text_to_speak, lang="fr")
                    tts.save(str(audio_path))
                except Exception as e:
                    print(f"     [Error] TTS failed for '{text_to_speak}': {e}")
            else:
                print(f"  -> [Cache Hit] Audio exists: {text_hash}")

    except Exception as e:
        print(f"  [Error] Could not read {file_path.name}: {e}")

print("\n--- Scan Complete ---")

# --- STEP 2: Identify and handle orphaned files ---
# Find all .mp3 files currently sitting in the folder
existing_mp3_files = list(voices_folder.glob("*.mp3"))

# Determine which files are on disk but NOT in our active_hashes set
orphaned_files = [
    f for f in existing_mp3_files if f.stem not in active_hashes
]

if orphaned_files:
    print(f"\nFound {len(orphaned_files)} unused audio files:")
    for file in orphaned_files:
        print(f" - {file.name}")

    # Auto-delete if --yes flag is passed (for CI/CD)
    
    auto_delete = False
    if "--yes" in sys.argv and "--no" not in sys.argv:
        print("\nAuto-delete enabled (--yes flag detected).")
        auto_delete = True
    else:
        if "--no" in sys.argv:
            print("\nAuto-delete disabled (--no flag detected).")
            auto_delete = False
        else:
            choice = (
                input(
                    "\nWould you like to delete these unused files? (y/N): "
                )
                .strip()
                .lower()
            )
            auto_delete = choice in ("y", "yes")

    if auto_delete:
        print("\nDeleting files...")
        for file in orphaned_files:
            try:
                file.unlink()
                print(f" x Deleted: {file.name}")
            except Exception as e:
                print(f" [Error] Could not delete {file.name}: {e}")
        print("Cleanup complete.")
    else:
        print("\nDeletion skipped.")
else:
    print("\nNo unused audio files found.")