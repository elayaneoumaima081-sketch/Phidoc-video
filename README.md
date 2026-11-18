# PhiDoc × Baahith — Reel #1: "300 مقال… والاجتماع غدا!"

A 45-second vertical (1080×1920, 30 fps) 3D animated Instagram Reel in Moroccan Darija.
A PhD student (glasses, black shirt, smooth black hair) panics under a pile of papers,
and Baahith hops onto his desk to show him how PhiDoc helps.

**Final video:** `out/phidoc_reel_baahith.mp4` (captions, music and sound effects included; no voice yet).

## Script & voice-over timing sheet

Record each line to fit its time window. Captions are burned into the video
word by word with the same timing, so the voice should follow the caption pace.

| # | Time (s) | Who | Darija line | Feature on screen |
|---|---|---|---|---|
| 1 | 1.0 – 5.0 | الطالب (panicked) | عندي 300 مقال خاصني نقراهم قبل الاجتماع ديال غدا! | Papers rain onto the desk; hook title |
| 2 | 7.0 – 11.4 | Baahith (cheerful) | ماتخافش! فـ PhiDoc تقدر تقلب على ملايين المقالات فكل المجالات. | 🔎 Find papers: search panel |
| 3 | 11.6 – 13.4 | الطالب (curious) | بصح؟ حتى فالمجال ديالي؟ | |
| 4 | 13.6 – 18.0 | Baahith | زيد اللي عجبوك للمكتبة ديالك، ورتبهم فـ collections. | 📚 Library, 🗂️ Collections: papers fly into "الفصل 1/2/3" folders |
| 5 | 18.2 – 23.0 | Baahith | علّم على الجمل المهمة، وغادي نربطهم ليك مع الأسئلة ديال البحث ديالك. | ✨ Highlights → Evidence linked to a research question |
| 6 | 23.2 – 25.4 | الطالب (worried) | وإلا نسيت شي مرجع؟ | |
| 7 | 25.6 – 30.0 | Baahith | وفالأخير، نتأكد بلي حتى مرجع ما ناقص فالأطروحة ديالك. | ✅ Citation audit: missing reference flagged, then fixed |
| 8 | 30.2 – 32.4 | الطالب | وإلا كان عندي سؤال على الموضوع ديالي؟ | |
| 9 | 32.6 – 36.4 | Baahith | سولني أنا! ونجاوبك على حساب المجال ديالك. | 💬 Ask Baahith: chat panel |
| 10 | 36.8 – 38.6 | الطالب (relaxed, leaning back) | صافي… دابا نقدر نرتاح | |
| 11 | 38.8 – 41.0 | Baahith (laughing) | ترتاح؟! باقي خاصك تكتب الأطروحة 😂 | Punchline: glasses slip, sweat drop, zoom |
| — | 41.0 – 45.0 | — | Outro: PhiDoc — رفيقك فرحلة الدكتوراه · جرّب Baahith دابا — الرابط فالبيو | |

Voice direction: the student has a young, fast, slightly dramatic voice. Baahith is warm, playful
and a little higher-pitched, like a friendly robot.

### Adding the voice-over
Record the lines (or generate them with a Darija TTS voice), place them on the timeline at the
times above in any editor (CapCut, Premiere, InShot…), and lower the music to about 30% under speech.
Or export one `voice.wav` aligned to the 45 s timeline and run:

```bash
ffmpeg -i out/phidoc_reel_baahith.mp4 -i voice.wav -filter_complex \
  "[0:a]volume=0.35[m];[m][1:a]amix=inputs=2:duration=first[a]" \
  -map 0:v -map "[a]" -c:v copy -c:a aac -b:a 192k out/phidoc_reel_with_voice.mp4
```

## How it's made / re-rendering

Everything is code. Edit the text and timings in `src/timeline.js`, the 3D scene in `src/scene.js`,
and the on-screen UI cards and captions in `src/scene.html`.

```bash
npm install
node src/render.js stills 3 9.5 20   # quick preview frames -> out/stills/
node src/render.js video 0 45 frames.mp4   # silent video, ~8 min
python3 src/audio.py                 # music + sfx -> out/audio.wav
ffmpeg -y -i out/frames.mp4 -i out/audio.wav -c:v copy -c:a aac -b:a 192k -shortest out/phidoc_reel_baahith.mp4
```

Rendering uses Three.js in headless Chromium (Playwright), with each frame captured and encoded by ffmpeg.
`baahith-reference.jpg` is the character reference used for Baahith.
