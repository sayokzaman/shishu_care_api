#!/usr/bin/env python3
"""
Shishu Care ML Services — Startup Script
=========================================
Installs dependencies and starts both microservices:
  - NutriMind (Nutrition):  http://localhost:8001
  - DeepInfant (Cry Analyzer): http://localhost:8002

Usage:
  python start_ml_services.py

Each service runs in its own virtual environment.
"""
import subprocess
import sys
import os
from pathlib import Path

BASE = Path(__file__).parent

SERVICES = [
    {
        "name": "NutriMind (Nutrition)",
        "dir": BASE / "nutrimind_service",
        "port": 8001,
        "app": "main:app",
    },
    {
        "name": "DeepInfant (Cry Analyzer)",
        "dir": BASE / "deepinfant_service",
        "port": 8002,
        "app": "main:app",
    },
]


def install_deps(service_dir: Path, service_name: str):
    req = service_dir / "requirements.txt"
    if not req.exists():
        print(f"  [SKIP] No requirements.txt found for {service_name}")
        return
    print(f"  Installing dependencies for {service_name}...")
    subprocess.run(
        [sys.executable, "-m", "pip", "install", "-r", str(req), "-q"],
        check=True
    )
    print(f"  Dependencies installed for {service_name}")


def start_service(service: dict) -> subprocess.Popen:
    print(f"\nStarting {service['name']} on port {service['port']}...")
    proc = subprocess.Popen(
        [
            sys.executable, "-m", "uvicorn", service["app"],
            "--host", "0.0.0.0",
            "--port", str(service["port"]),
            "--reload",
        ],
        cwd=str(service["dir"]),
    )
    print(f"  PID: {proc.pid}")
    return proc


if __name__ == "__main__":
    print("=" * 60)
    print("  Shishu Care ML Services")
    print("=" * 60)

    # Install dependencies for each service
    print("\nInstalling dependencies...\n")
    for svc in SERVICES:
        install_deps(svc["dir"], svc["name"])

    # Start all services
    print("\nStarting services...\n")
    procs = [start_service(svc) for svc in SERVICES]

    print("\n" + "=" * 60)
    print("  All services running:")
    for svc in SERVICES:
        print(f"  {svc['name']}: http://localhost:{svc['port']}")
        print(f"    Docs: http://localhost:{svc['port']}/docs")
    print("\n  Press Ctrl+C to stop all services.")
    print("=" * 60 + "\n")

    try:
        for p in procs:
            p.wait()
    except KeyboardInterrupt:
        print("\nStopping all services...")
        for p in procs:
            p.terminate()
        print("All services stopped.")
