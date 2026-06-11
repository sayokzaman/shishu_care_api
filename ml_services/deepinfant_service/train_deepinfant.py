#!/usr/bin/env python3
"""
DeepInfant Model Trainer — Shishu Care
=======================================
Trains the DeepInfant V2 CNN-LSTM model on the labeled WAV data
and saves the result as 'deepinfant.pth' in the DeepInfant folder.

Usage:
  python train_deepinfant.py

Training data location (auto-detected):
  ml models/DeepInfant/Data/v2/  (preferred — 9 classes)
  ml models/DeepInfant/Data/     (fallback — 5 classes)

Output:
  ml models/DeepInfant/deepinfant.pth

Time estimate:
  CPU: 30-60 minutes
  GPU (NVIDIA): 5-10 minutes

This script installs required packages before training.
"""
import subprocess
import sys
import os
from pathlib import Path

# ---------------------------------------------------------------------------
# Install deps
# ---------------------------------------------------------------------------
DEPS = ["torch", "torchvision", "torchaudio", "librosa", "numpy", "scikit-learn", "tqdm", "pandas"]


print("Installing training dependencies...")
subprocess.run(
    [sys.executable, "-m", "pip", "install"] + DEPS + ["-q"],
    check=True
)
print("Dependencies installed.\n")

# ---------------------------------------------------------------------------
# Point train.py to the right data directory and run training
# ---------------------------------------------------------------------------
DEEPINFANT_DIR = Path(__file__).parent.parent.parent.parent / "ml models" / "DeepInfant"
TRAIN_SCRIPT = DEEPINFANT_DIR / "train.py"
DATA_V2 = DEEPINFANT_DIR / "Data" / "v2"
DATA_FALLBACK = DEEPINFANT_DIR / "Data"

if not TRAIN_SCRIPT.exists():
    print(f"Error: train.py not found at: {TRAIN_SCRIPT}")
    sys.exit(1)

data_dir = str(DATA_V2) if DATA_V2.exists() and any(DATA_V2.iterdir()) else str(DATA_FALLBACK)
print(f"Training data: {data_dir}")
print(f"Using device: {'CUDA (GPU)' if __import__('torch').cuda.is_available() else 'CPU'}")
print(f"Output: {DEEPINFANT_DIR / 'deepinfant.pth'}")
print("\nStarting training... This may take 30-60 minutes on CPU.\n")
print("=" * 60)

# Run training in the DeepInfant directory
result = subprocess.run(
    [sys.executable, str(TRAIN_SCRIPT)],
    cwd=str(DEEPINFANT_DIR),
)

if result.returncode == 0:
    pth_path = DEEPINFANT_DIR / "deepinfant.pth"
    if pth_path.exists():
        print(f"\nTraining complete! Model saved: {pth_path}")
        print("You can now start the DeepInfant service.")
    else:
        print("\nWarning: Training finished but deepinfant.pth not found. Check train.py output above.")
else:
    print(f"\nError: Training failed with exit code: {result.returncode}")
    sys.exit(result.returncode)

