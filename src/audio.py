"""Synthesizes a light, playful background loop + sound effects for the reel.
Writes out/audio.wav (stereo, 48 kHz). Cue times are read from src/timeline.js."""
import json, re, wave, pathlib
import numpy as np

ROOT = pathlib.Path(__file__).resolve().parent.parent
SR = 48000
DUR = 45.0
N = int(SR * DUR)
rng = np.random.default_rng(3)
t_all = np.arange(N) / SR

def env(n, a=0.005, d=0.2):
    t = np.arange(n) / SR
    return np.minimum(1, t / a) * np.exp(-t / d)

def add(buf, start, sig, gain=1.0):
    i = int(start * SR)
    j = min(len(buf), i + len(sig))
    if i < len(buf):
        buf[i:j] += sig[: j - i] * gain

def note(f, dur, d=0.35, kind='pluck'):
    n = int(dur * SR); t = np.arange(n) / SR
    if kind == 'pluck':
        s = np.sin(2*np.pi*f*t) + 0.35*np.sin(2*np.pi*2*f*t) + 0.12*np.sin(2*np.pi*3*f*t)
        return s * env(n, 0.004, d)
    if kind == 'pad':
        s = sum(np.sin(2*np.pi*f*k*t + k) / k for k in (1, 2, 3)) * (1 + 0.003*np.sin(2*np.pi*5*t))
        return s * np.minimum(1, t/0.4) * np.minimum(1, (dur - t)/0.5)

# ---------- music: 100 BPM ukulele-ish plucks over soft pad ----------
music = np.zeros(N)
bpm = 100; beat = 60 / bpm
mid = lambda m: 440 * 2 ** ((m - 69) / 12)
chords = [[60, 64, 67, 72], [57, 60, 64, 69], [53, 57, 60, 65], [55, 59, 62, 67]]  # C Am F G
pattern = [0, 2, 1, 3, 2, 1, 3, 2]  # arpeggio indices per 8th note
bar = 0; tt = 0.0
while tt < DUR:
    ch = chords[bar % 4]
    add(music, tt, note(mid(ch[0] - 12), 4*beat, kind='pad'), 0.05)
    for k in range(8):
        add(music, tt + k*beat/2, note(mid(ch[pattern[k]]), 0.6, d=0.25), 0.07)
    for k in range(4):  # soft kick + shaker
        n = int(0.25*SR); tk = np.arange(n)/SR
        if k % 2 == 0:
            add(music, tt + k*beat, np.sin(2*np.pi*(50 + 90*np.exp(-tk*30))*tk) * env(n, 0.002, 0.08), 0.22)
        sh = rng.standard_normal(int(0.06*SR)) * env(int(0.06*SR), 0.002, 0.02)
        add(music, tt + k*beat + beat/2, sh, 0.035)
    tt += 4*beat; bar += 1
# duck music in the hook (panic) and fade out at the end
music *= np.clip((DUR - t_all) / 1.5, 0, 1)

# ---------- sfx ----------
def sfx(kind):
    if kind == 'paper':
        n = int(0.12*SR); s = rng.standard_normal(n)
        s = np.convolve(s, np.ones(6)/6, 'same') * env(n, 0.003, 0.04); return s * 0.5
    if kind == 'whoosh':
        n = int(0.45*SR); t = np.arange(n)/SR; s = rng.standard_normal(n)
        k = int(SR/ (300 + 2000*np.sin(np.pi*t[-1]/0.45)))
        s = np.convolve(s, np.ones(12)/12, 'same') * np.sin(np.pi*t/0.45)**2; return s * 0.6
    if kind == 'boing':
        n = int(0.5*SR); t = np.arange(n)/SR
        f = 180 + 220*np.exp(-t*6)*np.cos(2*np.pi*9*t)
        return np.sin(2*np.pi*np.cumsum(f)/SR) * env(n, 0.003, 0.18) * 0.7
    if kind == 'pop':
        n = int(0.12*SR); t = np.arange(n)/SR
        f = 500 + 900*np.exp(-t*40)
        return np.sin(2*np.pi*np.cumsum(f)/SR) * env(n, 0.001, 0.035) * 0.6
    if kind == 'ding':
        n = int(0.7*SR); t = np.arange(n)/SR
        return (np.sin(2*np.pi*1318*t) + 0.5*np.sin(2*np.pi*1975*t)) * env(n, 0.002, 0.2) * 0.35
    if kind == 'error':
        n = int(0.35*SR); t = np.arange(n)/SR
        return np.sign(np.sin(2*np.pi*190*t)) * env(n, 0.003, 0.12) * 0.15
    raise ValueError(kind)

src = (ROOT / 'src/timeline.js').read_text()
cues = re.findall(r"\{ t: ([\d.]+), type: '(\w+)' \}", src)
paper = re.search(r"length: (\d+) \}, \(_, i\) => \(\{ t: ([\d.]+) \+ i \* ([\d.]+), type: 'paper'", src)
fx = np.zeros(N)
for t, k in cues:
    add(fx, float(t), sfx(k))
if paper:
    n, a, b = int(paper[1]), float(paper[2]), float(paper[3])
    for i in range(n):
        add(fx, a + i*b + 0.5, sfx('paper'), 0.8)

mix = music + fx * 0.9
mix /= max(1e-9, np.abs(mix).max()) / 0.85
stereo = np.stack([mix, np.roll(mix, 240) * 0.97], 1)
out = ROOT / 'out/audio.wav'
with wave.open(str(out), 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((stereo * 32767).astype('<i2').tobytes())
print('wrote', out)
