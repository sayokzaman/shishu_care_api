"""
DeepInfant FastAPI Service — Shishu Care
=========================================
Wraps the DeepInfant V2 CNN-LSTM PyTorch model as a REST API.
Accepts baby cry audio uploads and returns a classification + actionable tip.

Model: CNN (mel-spectrogram) + Bi-LSTM (temporal modeling)
Classes: belly_pain, burping, cold_hot, discomfort, hungry, lonely, scared, tired, unknown
Accuracy: 89% (DeepInfant V2)

IMPORTANT: Requires a trained 'deepinfant.pth' model file.
Run train.py first if the .pth file does not exist.
"""
import os
import sys
import tempfile
from pathlib import Path
from typing import Dict

import librosa
import numpy as np
import torch
import torch.nn as nn
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# ---------------------------------------------------------------------------
# Model Architecture (must match train.py exactly)
# ---------------------------------------------------------------------------

class DeepInfantModel(nn.Module):
    def __init__(self, num_classes=9):
        super().__init__()
        self.conv_layers = nn.Sequential(
            nn.Conv2d(1, 64, kernel_size=3, padding=1),
            nn.BatchNorm2d(64),
            nn.ReLU(),
            nn.MaxPool2d(2),

            nn.Conv2d(64, 128, kernel_size=3, padding=1),
            nn.BatchNorm2d(128),
            nn.ReLU(),
            nn.MaxPool2d(2),

            nn.Conv2d(128, 256, kernel_size=3, padding=1),
            nn.BatchNorm2d(256),
            nn.ReLU(),
            nn.MaxPool2d(2),

            nn.AdaptiveAvgPool2d(1),
            nn.Conv2d(256, 16, 1),
            nn.ReLU(),
            nn.Conv2d(16, 256, 1),
            nn.Sigmoid(),
        )
        self.lstm = nn.LSTM(
            input_size=256 * 10,
            hidden_size=512,
            num_layers=2,
            batch_first=True,
            bidirectional=True,
            dropout=0.3,
        )
        self.classifier = nn.Sequential(
            nn.Linear(1024, 512),
            nn.ReLU(),
            nn.Dropout(0.3),
            nn.Linear(512, num_classes),
        )

    def forward(self, x):
        batch_size = x.size(0)
        x = self.conv_layers(x)
        x = x.permute(0, 2, 1, 3)
        x = x.reshape(batch_size, -1, 256 * 10)
        x, _ = self.lstm(x)
        x = x[:, -1, :]
        return self.classifier(x)


# ---------------------------------------------------------------------------
# Class labels & Bangla tips
# ---------------------------------------------------------------------------

LABEL_MAP = {
    0: "belly_pain",
    1: "burping",
    2: "cold_hot",
    3: "discomfort",
    4: "hungry",
    5: "lonely",
    6: "scared",
    7: "tired",
    8: "unknown",
}

# Tips in English + Bangla for each cry class
TIPS = {
    "belly_pain": {
        "en": "Baby may have belly pain or colic. Try gentle tummy massage, bicycle legs, or burping.",
        "bn": "শিশুর পেটে ব্যথা হতে পারে। আলতোভাবে পেট মালিশ করুন বা ঢেঁকুর তোলান।",
        "icon": "🤕",
    },
    "burping": {
        "en": "Baby needs to burp. Hold upright and gently pat the back.",
        "bn": "শিশুর ঢেঁকুর দরকার। সোজা করে ধরুন এবং পিঠে আলতো চাপড় দিন।",
        "icon": "💨",
    },
    "cold_hot": {
        "en": "Baby may be too cold or too hot. Check clothing and room temperature.",
        "bn": "শিশু ঠান্ডা বা গরম অনুভব করছে। কাপড় ও ঘরের তাপমাত্রা পরীক্ষা করুন।",
        "icon": "🌡️",
    },
    "discomfort": {
        "en": "Baby is uncomfortable. Check the diaper, clothing, or position.",
        "bn": "শিশু অস্বস্তি অনুভব করছে। ডায়াপার, কাপড় বা শোওয়ার অবস্থান পরীক্ষা করুন।",
        "icon": "😣",
    },
    "hungry": {
        "en": "Baby seems hungry. Try breastfeeding or feeding now.",
        "bn": "শিশু ক্ষুধার্ত মনে হচ্ছে। এখনই বুকের দুধ বা খাবার দিন।",
        "icon": "🍼",
    },
    "lonely": {
        "en": "Baby wants attention or comfort. Hold, cuddle, or talk to your baby.",
        "bn": "শিশু মনোযোগ চাইছে। কোলে নিন, জড়িয়ে ধরুন বা কথা বলুন।",
        "icon": "🤗",
    },
    "scared": {
        "en": "Baby may be startled or scared. Hold close and speak in a calm, soft voice.",
        "bn": "শিশু ভয় পেয়েছে। কাছে ধরুন এবং শান্ত কণ্ঠে কথা বলুন।",
        "icon": "😨",
    },
    "tired": {
        "en": "Baby is tired and needs sleep. Dim the lights and create a calm environment.",
        "bn": "শিশু ক্লান্ত এবং ঘুমাতে চাইছে। আলো কমিয়ে শান্ত পরিবেশ তৈরি করুন।",
        "icon": "😴",
    },
    "unknown": {
        "en": "Cry pattern not clearly identified. If persistent, consult your doctor.",
        "bn": "কান্নার কারণ স্পষ্টভাবে বোঝা যাচ্ছে না। যদি চলতে থাকে, ডাক্তারের সাথে পরামর্শ করুন।",
        "icon": "❓",
    },
}

DISCLAIMER_EN = "⚠️ This is an AI estimate. Always consult a healthcare provider if you are concerned."
DISCLAIMER_BN = "⚠️ এটি একটি AI অনুমান। উদ্বিগ্ন হলে সবসময় স্বাস্থ্যসেবা প্রদানকারীর সাথে পরামর্শ করুন।"

# ---------------------------------------------------------------------------
# Model loading
# ---------------------------------------------------------------------------

_MODEL_PATH = os.path.join(
    os.path.dirname(os.path.abspath(__file__)),
    "..", "..", "..", "ml models", "DeepInfant", "deepinfant.pth"
)

_device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
_model = None


def load_model():
    global _model
    if not Path(_MODEL_PATH).exists():
        raise FileNotFoundError(
            f"DeepInfant model not found at: {_MODEL_PATH}\n"
            "Please train the model first: cd 'ml models/DeepInfant' && python train.py"
        )
    _model = DeepInfantModel()
    _model.load_state_dict(torch.load(_MODEL_PATH, map_location=_device))
    _model.to(_device)
    _model.eval()
    print(f"DeepInfant model loaded on {_device}")


def process_audio(audio_path: str) -> torch.Tensor:
    """Load audio file → mel spectrogram tensor."""
    waveform, sample_rate = librosa.load(audio_path, sr=16000)

    # Pad or trim to exactly 7 seconds
    target_length = 7 * 16000
    if len(waveform) > target_length:
        waveform = waveform[:target_length]
    else:
        waveform = np.pad(waveform, (0, target_length - len(waveform)))

    mel_spec = librosa.feature.melspectrogram(
        y=waveform, sr=16000,
        n_fft=1024, hop_length=256,
        n_mels=80, fmin=20, fmax=8000,
    )
    mel_spec = librosa.power_to_db(mel_spec, ref=np.max)
    return torch.FloatTensor(mel_spec)


# ---------------------------------------------------------------------------
# FastAPI app
# ---------------------------------------------------------------------------

app = FastAPI(
    title="DeepInfant — Shishu Care",
    description="Baby cry classification service (CNN-LSTM, 89% accuracy, 9 classes)",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Proxied through Node.js — restrict at proxy layer
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)


@app.on_event("startup")
def startup():
    try:
        load_model()
    except FileNotFoundError as e:
        print(f"WARNING: {e}")
        print("Server starting without model. /analyze-cry will return 503 until model is trained.")


# ---------------------------------------------------------------------------
# Response models
# ---------------------------------------------------------------------------

class CryAnalysisResult(BaseModel):
    predicted_class: str
    icon: str
    confidence: float
    probabilities: Dict[str, float]
    tip_english: str
    tip_bangla: str
    disclaimer_english: str
    disclaimer_bangla: str


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.get("/health")
def health():
    return {
        "status": "ok",
        "model_loaded": _model is not None,
        "device": str(_device),
        "model_path": _MODEL_PATH,
        "model_exists": Path(_MODEL_PATH).exists(),
    }


@app.post("/analyze-cry", response_model=CryAnalysisResult)
async def analyze_cry(audio: UploadFile = File(..., description="Baby cry audio file (WAV, MP3, M4A — max 10MB)")):
    if _model is None:
        raise HTTPException(
            status_code=503,
            detail="Model not loaded. Please train DeepInfant first: cd 'ml models/DeepInfant' && python train.py"
        )

    # Validate file type
    allowed = {".wav", ".mp3", ".m4a", ".ogg", ".flac"}
    suffix = Path(audio.filename or "audio.wav").suffix.lower()
    if suffix not in allowed:
        raise HTTPException(status_code=400, detail=f"Unsupported file type: {suffix}. Use WAV, MP3, or M4A.")

    # Save to temp file and process
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        content = await audio.read()
        if len(content) > 10 * 1024 * 1024:  # 10MB limit
            raise HTTPException(status_code=413, detail="File too large. Maximum 10MB.")
        tmp.write(content)
        tmp_path = tmp.name

    try:
        mel_spec = process_audio(tmp_path)
        mel_spec = mel_spec.unsqueeze(0).unsqueeze(0).to(_device)  # (1, 1, freq, time)

        with torch.no_grad():
            outputs = _model(mel_spec)
            probs = torch.nn.functional.softmax(outputs, dim=1)[0]
            pred_class_idx = torch.argmax(probs).item()
            confidence = probs[pred_class_idx].item()

        predicted_class = LABEL_MAP[pred_class_idx]
        tip = TIPS[predicted_class]

        probabilities = {LABEL_MAP[i]: round(probs[i].item(), 4) for i in range(len(LABEL_MAP))}

        return CryAnalysisResult(
            predicted_class=predicted_class,
            icon=tip["icon"],
            confidence=round(confidence, 4),
            probabilities=probabilities,
            tip_english=tip["en"],
            tip_bangla=tip["bn"],
            disclaimer_english=DISCLAIMER_EN,
            disclaimer_bangla=DISCLAIMER_BN,
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Audio processing failed: {str(e)}")
    finally:
        os.unlink(tmp_path)
