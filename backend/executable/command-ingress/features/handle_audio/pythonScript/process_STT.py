import sys
import os
import io
import json
import torch
import whisper
import librosa
import soundfile as sf
import noisereduce as nr
from dotenv import load_dotenv

# === Thiết lập mã hóa UTF-8 cho đầu ra console (Windows)
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# === Thư mục gốc dự án ===
BASE_DIR = os.path.abspath(os.path.dirname(__file__))

# === Load biến môi trường từ .env ===
load_dotenv()
CUSTOM_FFMPEG_PATH = os.getenv("FFMPEG_PATH")
CUSTOM_MODEL_PATH = os.getenv("WHISPER_MODEL_PATH")
TOTAL_MEMORY_LARGE = float(os.getenv("TOTAL_MEMORY_LARGE", "12"))
TOTAL_MEMORY_MEDIUM = float(os.getenv("TOTAL_MEMORY_MEDIUM", "8"))
TOTAL_MEMORY_SMALL = float(os.getenv("TOTAL_MEMORY_SMALL", "4"))

# === Cấu hình đường dẫn FFMPEG ===
if CUSTOM_FFMPEG_PATH:
    os.environ["PATH"] += os.pathsep + CUSTOM_FFMPEG_PATH
else:
    default_ffmpeg = os.path.join(BASE_DIR, '..', 'libraries', 'ffmpeg', 'ffmpeg-7.1.1-full_build', 'bin')
    os.environ["PATH"] += os.pathsep + default_ffmpeg

# === Chọn thiết bị xử lý ===
device = "cuda" if torch.cuda.is_available() else "cpu"
print(f"[DEVICE] whisper_device={device}", file=sys.stderr)

# === Tự động chọn mô hình Whisper phù hợp theo GPU ===
def choose_model_name():
    if device == "cuda":
        total_mem = torch.cuda.get_device_properties(0).total_memory / (1024 ** 3)
        if total_mem >= TOTAL_MEMORY_LARGE:
            return "large"
        elif total_mem >= TOTAL_MEMORY_MEDIUM:
            return "medium"
        elif total_mem >= TOTAL_MEMORY_SMALL:
            return "small"
        else:
            return "tiny"
    return "small"

MODEL_NAME = choose_model_name()
DOWNLOAD_ROOT = CUSTOM_MODEL_PATH or os.path.join(BASE_DIR, '..', 'libraries', 'models_whisper')
SUPPORTED_FORMATS = ['.mp3', '.m4a', '.webm', '.wav', '.flac', '.aac', '.ogg']

print(f"Đang tải mô hình Whisper: {MODEL_NAME}", file=sys.stderr)
model = whisper.load_model(MODEL_NAME, device=device, download_root=DOWNLOAD_ROOT)

# === Mapping ngôn ngữ về dạng chuẩn locale ===
LANGUAGE_MAP = {
    "vi": "vi-VN",
    "en": "en-US",
    "fr": "fr-FR",
    "de": "de-DE",
    "es": "es-ES",
    "ja": "ja-JP",
    "ko": "ko-KR",
    "zh": "zh-CN"
}

# === Hàm tiền xử lý âm thanh (chuẩn hóa) ===
def preprocess_audio(input_path):
    y, sr = librosa.load(input_path, sr=16000, mono=True)

    # Giảm noise
    y = nr.reduce_noise(y=y, sr=sr)

    # Chuẩn hóa volume
    y = librosa.util.normalize(y)

    # Voice Activity Detection (cắt im lặng)
    intervals = librosa.effects.split(y, top_db=30)
    processed_audio = []
    for start, end in intervals:
        processed_audio.extend(y[start:end])
    y = torch.tensor(processed_audio, dtype=torch.float32).numpy()

    # Xuất file tạm sau khi xử lý
    output_path = os.path.splitext(input_path)[0] + "_clean.wav"
    sf.write(output_path, y, 16000)
    return output_path

# === Hàm chuyển âm thanh thành văn bản và tách segment
def transcribe(audio_path):
    if not os.path.isfile(audio_path):
        raise FileNotFoundError(f"Không tìm thấy file: {audio_path}")

    ext = os.path.splitext(audio_path)[1].lower()
    if ext not in SUPPORTED_FORMATS:
        raise ValueError(f"Định dạng không hỗ trợ: {ext}")

    # Bước (1) Chuẩn hóa trước khi đưa vào Whisper
    clean_path = preprocess_audio(audio_path)

    result = model.transcribe(clean_path, fp16=(device == "cuda"))

    # Chuẩn hóa ngôn ngữ
    lang = result.get("language", "unknown")
    normalized_lang = LANGUAGE_MAP.get(lang, lang)

    # Tách segments kèm confidence
    segments = []
    for seg in result.get("segments", []):
        confidence = round((1 + seg.get("avg_logprob", -1)) / 2, 3)  # scale [-1,0] -> [0,1]
        segments.append({
            "start": round(seg["start"], 2),
            "end": round(seg["end"], 2),
            "text": seg["text"].strip(),
            "confidence": confidence
        })

    # Confidence toàn transcript = trung bình confidence segments
    overall_conf = None
    if segments:
        overall_conf = round(sum(s["confidence"] for s in segments) / len(segments), 3)

    return {
        "text": result["text"].strip(),
        "language": normalized_lang,
        "confidence": overall_conf,
        "segments": segments
    }

# === Chạy như CLI
if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Cách dùng: python process_STT.py <file1> <file2>", file=sys.stderr)
        sys.exit(1)

    results = []

    for path in sys.argv[1:]:
        entry = {"file": os.path.basename(path)}
        try:
            output = transcribe(path)
            entry.update(output)
        except Exception as e:
            entry["error"] = str(e)

        results.append(entry)

    print(json.dumps(results, ensure_ascii=False, indent=2))
