import sys
import fitz  # PyMuPDF
import io
import os
import json
from PIL import Image, ImageEnhance, ImageFilter
import pytesseract
import easyocr
import numpy as np
from dotenv import load_dotenv
from langdetect import detect, DetectorFactory
from datetime import datetime

# =========================
# Setup Tesseract (Windows)
# =========================
def setup_tesseract():
    if os.name == 'nt':  # Windows
        manual_path = os.getenv("TESSERACT_CMD")
        if manual_path and os.path.exists(manual_path):
            pytesseract.pytesseract.tesseract_cmd = manual_path
            print(f"[DEBUG] Using Tesseract from TESSERACT_CMD: {manual_path}", file=sys.stderr)
            return True

        username = os.getenv("USERNAME")
        common_paths = [
            r"F:\Tesseract-OCR\tesseract.exe",
            fr"C:\Users\{username}\AppData\Local\Tesseract-OCR\tesseract.exe",
            r"C:\Program Files\Tesseract-OCR\tesseract.exe",
            r"C:\Program Files (x86)\Tesseract-OCR\tesseract.exe",
        ]

        for path in common_paths:
            if os.path.exists(path):
                pytesseract.pytesseract.tesseract_cmd = path
                print(f"[DEBUG] Using Tesseract at: {path}", file=sys.stderr)
                return True

        print("[WARNING] Tesseract not found, OCR may not work properly", file=sys.stderr)
        return False
    return True

setup_tesseract()

# =========================
# Unicode stdout/stderr
# =========================
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8")

# =========================
# Env + langdetect
# =========================
load_dotenv()
DetectorFactory.seed = 0

# Mapping ISO-639-1 -> locale phổ biến
LANG_MAP = {
    "vi": "vi-VN",
    "en": "en-US",
    "fr": "fr-FR",
    "de": "de-DE",
    "es": "es-ES",
    "it": "it-IT",
    "pt": "pt-PT",
    "ru": "ru-RU",
    "ja": "ja-JP",
    "ko": "ko-KR",
    "zh-cn": "zh-CN",
    "zh-tw": "zh-TW",
}

def normalize_lang(lang_code: str) -> str:
    return LANG_MAP.get(lang_code.lower(), lang_code)

# =========================
# Init EasyOCR reader
# =========================
easyocr_reader = easyocr.Reader(["vi", "en"], gpu=False)

# =========================
# Parse PDF datetime
# =========================
def parse_pdf_date(pdf_date: str):
    if not pdf_date or not pdf_date.startswith("D:"):
        return None
    try:
        pdf_date = pdf_date[2:]
        if "+" in pdf_date:
            dt_str, _ = pdf_date.split("+", 1)
        elif "-" in pdf_date:
            dt_str, _ = pdf_date.split("-", 1)
        else:
            dt_str = pdf_date
        dt = datetime.strptime(dt_str[:14], "%Y%m%d%H%M%S")
        return dt.isoformat()
    except Exception:
        return None

# =========================
# Preprocess image
# =========================
def preprocess_image(image: Image.Image) -> Image.Image:
    image = image.convert("L")
    image = image.resize((image.width * 2, image.height * 2), Image.LANCZOS)
    image = ImageEnhance.Contrast(image).enhance(3.0)
    image = ImageEnhance.Sharpness(image).enhance(2.0)
    image = image.filter(ImageFilter.MedianFilter(size=3))
    try:
        image = image.point(lambda x: 0 if x < 180 else 255, mode="1")
    except Exception:
        pass
    return image

# =========================
# OCR with EasyOCR
# =========================
def ocr_with_easyocr(image: Image.Image) -> str:
    try:
        np_img = np.array(image)
        result = easyocr_reader.readtext(np_img)
        return "\n".join([line[1] for line in result])
    except Exception as e:
        print(f"[EasyOCR] Error: {e}", file=sys.stderr)
        return ""

# =========================
# OCR with Tesseract
# =========================
def ocr_with_tesseract(image: Image.Image) -> str:
    try:
        config = "--oem 3 --psm 6"
        return pytesseract.image_to_string(image, lang="vie+eng", config=config)
    except Exception as e:
        print(f"[Tesseract] Error: {e}", file=sys.stderr)
        return ""

# =========================
# Check if PDF has text
# =========================
def has_real_text(text: str) -> bool:
    extracted = "".join(ch for ch in text if ch.isalnum())
    return len(extracted) > 50

# =========================
# Main extract function
# =========================
def extract_text_from_pdf(pdf_path: str) -> dict:
    try:
        doc = fitz.open(pdf_path)
    except Exception as e:
        return {
            "text": None,
            "confidence": 0,
            "error": f"Cannot open PDF: {str(e)}",
            "metadata": {}
        }

    raw_text = ""
    is_scanned = False

    for page in doc:
        raw_text += page.get_text("text")

    if not has_real_text(raw_text):
        is_scanned = True
        raw_text = ""
        print(f"[DEBUG] PDF is scanned, OCR {doc.page_count} pages", file=sys.stderr)

        for i, page in enumerate(doc):
            try:
                print(f"[DEBUG] Processing page {i+1}/{doc.page_count}", file=sys.stderr)
                pix = page.get_pixmap(dpi=400)
                img_data = pix.tobytes("png")
                image = Image.open(io.BytesIO(img_data))
                image = preprocess_image(image)

                text_easyocr = ocr_with_easyocr(image)
                text_tesseract = ocr_with_tesseract(image)

                if text_easyocr.strip() and not text_tesseract.strip():
                    chosen_text = text_easyocr
                elif text_tesseract.strip() and not text_easyocr.strip():
                    chosen_text = text_tesseract
                else:
                    texts = [t.strip() for t in [text_easyocr, text_tesseract] if t.strip()]
                    chosen_text = "\n".join(set(texts))

                print(f"[DEBUG] Page {i+1}: {len(chosen_text)} chars", file=sys.stderr)
                raw_text += chosen_text + "\n"

            except Exception as e:
                print(f"[DEBUG] OCR error on page {i+1}: {str(e)}", file=sys.stderr)
                return {
                    "text": None,
                    "confidence": 0,
                    "error": f"OCR error on page {i+1}: {str(e)}",
                    "metadata": {}
                }

    try:
        info = doc.metadata if doc else {}
    except Exception:
        info = {}

    metadata = {
        "author": info.get("author"),
        "created": parse_pdf_date(info.get("creationDate")),
        "modified": parse_pdf_date(info.get("modDate")),
        "file_size": os.path.getsize(pdf_path),
        "pages": doc.page_count,
        "language": None,
        "is_scanned": is_scanned,
    }

    doc.close()

    # Detect language & normalize
    try:
        lang_code = detect(raw_text[:5000]) if raw_text else None
        language = normalize_lang(lang_code) if lang_code else None
    except Exception:
        language = None
    metadata["language"] = language

    return {
        "text": raw_text.strip(),
        "confidence": 1.0 if raw_text else 0.0,
        "error": None,
        "metadata": metadata,
    }

# =========================
# CLI
# =========================
if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python process_pdf.py <file1.pdf> <file2.pdf> ...", file=sys.stderr)
        sys.exit(1)

    all_results = []
    for file_path in sys.argv[1:]:
        result = extract_text_from_pdf(file_path)
        all_results.append({
            "file": os.path.basename(file_path),
            "result": result
        })

    print(json.dumps(all_results, ensure_ascii=False, indent=4))
