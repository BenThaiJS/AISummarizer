import sys
import os
import json
from pathlib import Path
import traceback

def send_status(status_type, **kwargs):
    """Send a JSON status line to stdout, flush immediately."""
    data = {"status": status_type}
    data.update(kwargs)
    print(json.dumps(data))
    sys.stdout.flush()

def transcribe_audio(audio_path, output_path):
    try:
        # Import whisper here so import errors are reported via our JSON messages
        try:
            import whisper
        except Exception as e:
            send_status("ERROR", message=f"Failed to import whisper: {e}", traceback=traceback.format_exc())
            return 2
        audio_path = Path(audio_path).resolve()
        output_path = Path(output_path).resolve()

        if not audio_path.is_file():
            send_status("ERROR", message=f"Audio file not found: {audio_path}")
            return 2

        send_status("transcribe", line=f"Loading Whisper model...")

        # Load model (CPU fallback if no GPU)
        model = whisper.load_model("base")
        send_status("transcribe", line=f"Model loaded. Starting transcription...")

        # Run transcription
        result = model.transcribe(str(audio_path), verbose=False)

        # Emit segments so the server can stream partial results
        for seg in result.get("segments", []):
            send_status("transcribing_segment", start=seg.get("start"), end=seg.get("end"), text=seg.get("text"))

        # Save full transcript
        with open(output_path, "w", encoding="utf-8") as f:
            f.write(result.get("text", ""))

        send_status("transcribe", line=f"Transcription finished successfully.")
        send_status("done", transcript=str(output_path))
        # Signal the parent process that transcription completed successfully
        print("TRANSCRIBE_OK")
        sys.stdout.flush()

        return 0

    except Exception as e:
        send_status("ERROR", message=str(e), traceback=traceback.format_exc())
        return 2

if __name__ == "__main__":
    if len(sys.argv) != 3:
        send_status("ERROR", message="Usage: python transcribe.py <audio.wav> <transcript.txt>")
        sys.exit(2)

    audio_file = sys.argv[1]
    transcript_file = sys.argv[2]
    exit_code = transcribe_audio(audio_file, transcript_file)
    sys.exit(exit_code)
