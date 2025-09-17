#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Image OCR Processor (for MongoDB 'inputs' schema)
Trích xuất văn bản + OCR data từ ảnh, mapping vào các field phù hợp.
Tự động phát hiện ngôn ngữ.
"""

import os
import sys
import io
import cv2
import pytesseract
from PIL import Image
import argparse
import json
from dotenv import load_dotenv
from langdetect import detect, DetectorFactory

# Unicode stdout
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# Load env
load_dotenv()
TESSERACT_PATHS = os.getenv("TESSERACT_CMDS", r"F:\Tesseract-OCR\tesseract.exe,/usr/bin/tesseract").split(",")

# Setup Tesseract
for cmd in TESSERACT_PATHS:
    if os.path.exists(cmd.strip()):
        pytesseract.pytesseract.tesseract_cmd = cmd.strip()
        break

# Langdetect ổn định
DetectorFactory.seed = 0


class ImageOCR:
    def __init__(self, min_conf=20):
        self.min_conf = min_conf

    def preprocess(self, img):
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        return cv2.adaptiveThreshold(
            gray, 255,
            cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
            cv2.THRESH_BINARY, 31, 12
        )

    def extract_text(self, image_path):
        if not os.path.exists(image_path):
            raise FileNotFoundError(f"Không tồn tại ảnh: {image_path}")

        img = cv2.imread(image_path)
        if img is None:
            raise ValueError(f"Không thể đọc ảnh: {image_path}")

        # Resize nếu ảnh nhỏ
        if img.shape[0] < 800 or img.shape[1] < 800:
            img = cv2.resize(img, None, fx=2, fy=2, interpolation=cv2.INTER_CUBIC)

        pre = self.preprocess(img)

        data = pytesseract.image_to_data(
            Image.fromarray(pre),
            lang="vie+eng",
            config="--psm 6 --oem 1",
            output_type=pytesseract.Output.DICT
        )

        segments, weighted_sum, total_weight = [], 0, 0
        for i in range(len(data['text'])):
            word = data['text'][i].strip()
            conf = float(data['conf'][i]) if data['conf'][i] != "-1" else 0
            if not word or conf < self.min_conf:
                continue

            weight = len(word)
            weighted_sum += conf * weight
            total_weight += weight

            bbox = {
                "x": int(data['left'][i]),
                "y": int(data['top'][i]),
                "w": int(data['width'][i]),
                "h": int(data['height'][i]),
            }

            segments.append({
                "text": word,
                "confidence": round(conf, 2),
                "bbox": bbox
            })

        avg_conf = weighted_sum / total_weight if total_weight > 0 else 0
        text_full = " ".join([seg["text"] for seg in segments])

        # Detect language từ text_full
        detected_lang = None
        try:
            if text_full.strip():
                detected_lang = detect(text_full)  # "vi", "en", "fr"...
        except Exception:
            detected_lang = None

        return text_full.strip(), round(avg_conf, 2), segments, detected_lang


def build_document(path, text, conf, segs, detected_lang=None, error=None):
    """Mapping dữ liệu OCR -> schema 'inputs'"""
    stat = os.stat(path)

    # Map langdetect -> chuẩn code kiểu vi-VN
    lang_map = {
        "vi": "vi-VN",
        "en": "en-US",
        "fr": "fr-FR",
        "de": "de-DE",
    }
    language_code = lang_map.get(detected_lang, detected_lang or "und")

    return {
        "type": "image",
        "original_filename": os.path.basename(path),
        "mime_type": "image/" + os.path.splitext(path)[1][1:],

        "raw_text": text,
        "paragraphs": [],
        "tables": [],

        "ocr_data": {
            "segments": segs,
            "error": error
        },

        "metadata": {
            "file_path": path,
            "pages": 1,
            "file_size": stat.st_size,
            "is_scanned": True,
            "paragraphs_count": 0,
            "tables_count": 0,
        },

        "confidence_score": conf,
        "processing_status": "completed" if not error else "failed",

        "cleaned_text": text,
        "language": language_code,
        "quality_score": conf,
        "pipeline_steps": {"ocr": True}
    }


def handle_cli():
    parser = argparse.ArgumentParser()
    parser.add_argument('images', nargs='+')
    args = parser.parse_args()

    ocr = ImageOCR()
    results = []

    for path in args.images:
        try:
            text, conf, segs, detected_lang = ocr.extract_text(path)
            doc = build_document(path, text, conf, segs, detected_lang, error=None)
        except Exception as e:
            doc = build_document(path, "", 0, [], None, error=str(e))
        results.append(doc)

    print(json.dumps(results, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    handle_cli()
