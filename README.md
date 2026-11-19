# PhiDoc × Baahith, Reel #1: "بزاف ديال المقالات"

A 45-second vertical (1080×1920, 30 fps) 3D animated Instagram Reel in Moroccan Darija.
A PhD student (glasses, black shirt, smooth black hair) panics under a pile of papers,
and Baahith hops onto his desk to show him how PhiDoc helps.

**Final video:** `out/phidoc_reel_baahith.mp4` (captions, music and sound effects included; no voice yet).

## Visual style

Handmade felt and clay miniature at night, modelled on the reference reel: needle-felted wool (Baahith, hair, props)
with fiber fuzz, a knitted black shirt, clay skin, a deep blue wall with a night window and warm fairy lights,
a warm desk lamp as the key light, tilt-shift depth of field, a soft vignette and film grain. Captions appear in
short chunks on cream paper labels with one keyword in brand teal. Everything is procedural (Three.js + postprocessing).

## Design system

The captions and the outro follow the PhiDoc design system (organization default):
- Colours: `primary` teal hsl(180 53% 23%) for the one primary element, light `card` surfaces with `border` hairlines and 22px radius,
  dark-theme tokens (warm near-black hsl(42 8% 9%)) for the video ground and the feature pills, meaning pairs
  (`green-soft`/`green` OK, `red-soft`/`destructive` missing reference, `amber-soft`/`amber` highlight, `purple-soft`/`purple` Baahith).
- Type: Inter for Latin, IBM Plex Sans Arabic for Arabic, Amiri as the Arabic serif voice for headings.
- Icons: Lucide (2px stroke) in soft-tinted tiles, no emoji. No em dashes in copy.
- Motion: soft fade-up on the brand ease cubic-bezier(.32,.72,0,1); UI never bounces.
- Outro: full-bleed teal panel with the two 5% circles and the official `logo-light.svg` (`assets/`).
- No cards, panels or feature labels during the story: it is just the conversation, with captions. Captions carry no speaker names; the current word is amber when the student speaks and teal when Baahith speaks.

## Script & voice-over timing sheet

Record each line to fit its time window. Captions are burned into the video
word by word with the same timing, so the voice should follow the caption pace.

| # | Time (s) | Who | Darija line | Feature on screen |
|---|---|---|---|---|
| 1 | 1.0 – 5.0 | Student (panicked) | عندي بزاف ديال المقالات خاصني نقراهوم | Papers rain onto the desk |
| 2 | 7.0 – 11.4 | Baahith (cheerful) | ماتخافش! فـ PhiDoc تقدر تقلب على ملايين المقالات فكل المجالات. | |
| 3 | 11.6 – 13.4 | Student (curious) | بصح؟ حتى فالمجال ديالي؟ | |
| 4 | 13.6 – 18.0 | Baahith | اه، زيد اللي عجبوك للمكتبة ديالك، و رتبهم ف collections | Papers fly into "الفصل 1/2/3" folders |
| 5 | 18.2 – 23.0 | Baahith | علّم على الجمل المهمة، وغادي نربطهم ليك مع الأسئلة ديال البحث ديالك. | |
| 6 | 23.2 – 25.4 | Student (worried) | وإلا نسيت شي مرجع؟ | |
| 7 | 25.6 – 30.0 | Baahith | غادي نتأكد بلي حتى مرجع ما ناقص فالأطروحة ديالك. | |
| 8 | 30.2 – 32.4 | Student | وإلا كان عندي سؤال على الموضوع ديالي؟ | |
| 9 | 32.6 – 36.4 | Baahith | سولني أنا! ونجاوبك على حساب المجال ديالك. | |
| 10 | 36.8 – 38.6 | Student (relaxed, leaning back) | صافي، دابا نقدر نرتاح | |
| 11 | 38.8 – 41.0 | Baahith (laughing) | ترتاح؟! باقي خاصك تكتب الأطروحة | Punchline: glasses slip, sweat drop, zoom |
| | 41.0 – 45.0 | | Outro: PhiDoc logo, رحلة الدكتوراه كاملة في منصّة واحدة., button جرّب Baahith دابا, الرابط فالبيو | |

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
