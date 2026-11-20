// Shared timeline for the PhiDoc x Baahith reel (Topic 1: "Too many papers").
// All times are in seconds. Dialogue is Moroccan Darija.

export const DURATION = 45;
export const FPS = 30;

// who: 'boy' | 'bot'
export const LINES = [
  { s: 1.0,  e: 5.0,  who: 'boy', text: 'عندي بزاف ديال المقالات خاصني نقراهوم' },
  { s: 7.0,  e: 11.4, who: 'bot', text: 'ماتخافش! فـ PhiDoc تقدر تقلب على ملايين المقالات فكل المجالات.' },
  { s: 11.6, e: 13.4, who: 'boy', text: 'بصح؟ حتى فالمجال ديالي؟' },
  { s: 13.6, e: 18.0, who: 'bot', text: 'اه، زيد اللي عجبوك للمكتبة ديالك، و رتبهم ف collections' },
  { s: 18.2, e: 23.0, who: 'bot', text: 'علّم على الجمل المهمة، وغادي نربطهم ليك مع الأسئلة ديال البحث ديالك.' },
  { s: 23.2, e: 25.4, who: 'boy', text: 'وإلا نسيت شي مرجع؟' },
  { s: 25.6, e: 30.0, who: 'bot', text: 'غادي نتأكد بلي حتى مرجع ما ناقص فالأطروحة ديالك.' },
  { s: 30.2, e: 32.4, who: 'boy', text: 'وإلا كان عندي سؤال على الموضوع ديالي؟' },
  { s: 32.6, e: 36.4, who: 'bot', text: 'سولني أنا! ونجاوبك على حساب المجال ديالك.' },
  { s: 36.8, e: 38.6, who: 'boy', text: 'صافي، دابا نقدر نرتاح' },
  { s: 38.8, e: 41.0, who: 'bot', text: 'ترتاح؟! باقي خاصك تكتب الأطروحة' },
];

// Feature chips shown at the top of the frame.
export const CHIPS = []; // no on-screen cards or labels: just the conversation

// Sound effects cues (generated with ffmpeg in render step).
export const SFX = [
  { t: 5.6, type: 'whoosh' },
  { t: 6.55, type: 'boing' },
  { t: 39.6, type: 'boing' },
  { t: 41.0, type: 'whoosh' },
];
