import sys
import json
import os
import whisper

def stream_transcription(audio_path, transcript_path):
    model = whisper.load_model("base")  # choose "tiny", "base", "small", "medium", "large"
    result = model.transcribe(audio_path, verbose=False)
    
    segments = result.get("segments", [])
    
    with open(transcript_path, "w", encoding="utf-8") as f:
        for i, seg in enumerate(segments, start=1):
            text = seg.get("text", "").strip()
            # Write to transcript file
            f.write(text + " ")
            f.flush()
            
            # Send JSON line to stdout for SSE updates
            print(json.dumps({
                "status": "transcribing_segment",
                "segment": i,
                "start": seg.get("start"),
                "end": seg.get("end"),
                "text": text
            }), flush=True)
    
    # Also write final transcript with line breaks
    with open(transcript_path, "w", encoding="utf-8") as f:
        f.write(result.get("text", "").strip())

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print(json.dumps({"error": "Missing arguments"}))
        sys.exit(1)

    audio_path = sys.argv[1]
    transcript_path = sys.argv[2]

    if not os.path.exists(audio_path):
        print(json.dumps({"error": "Audio file not found"}))
        sys.exit(1)

    try:
        stream_transcription(audio_path, transcript_path)
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)
