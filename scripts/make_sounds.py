#!/usr/bin/env python3
"""Synthesize the game's sound effects (no recordings needed).

Usage (from the project folder):
    python3 scripts/make_sounds.py        (needs: pip install numpy)

Writes assets/sounds/horn.wav: a small-car double honk ("pon-pon").
"""
import pathlib
import wave

import numpy as np

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "assets" / "sounds"
RATE = 22050


def tone(freq, dur):
    """Buzzy horn tone: a few odd harmonics with a little vibrato."""
    t = np.arange(int(RATE * dur)) / RATE
    phase = 2 * np.pi * freq * t + 0.02 * np.sin(2 * np.pi * 6 * t)
    return sum(np.sin(k * phase) / k for k in (1, 2, 3, 5, 7))


def envelope(n, attack=0.012, release=0.05):
    env = np.ones(n)
    a, r = int(RATE * attack), int(RATE * release)
    env[:a] = np.linspace(0, 1, a)
    env[-r:] = np.linspace(1, 0, r)
    return env


def honk(dur):
    # two detuned notes a minor third apart, like a real twin-tone car horn
    s = tone(415, dur) + 0.85 * tone(494, dur)
    s = np.tanh(1.8 * s / np.abs(s).max())  # gentle overdrive = horn rasp
    return s * envelope(len(s))


def save(name, samples):
    OUT.mkdir(parents=True, exist_ok=True)
    data = (samples / np.abs(samples).max() * 0.85 * 32767).astype(np.int16)
    with wave.open(str(OUT / name), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(RATE)
        w.writeframes(data.tobytes())
    print(f"wrote assets/sounds/{name} ({len(samples) / RATE:.2f}s)")


if __name__ == "__main__":
    gap = np.zeros(int(RATE * 0.07))
    save("horn.wav", np.concatenate([honk(0.16), gap, honk(0.3)]))
