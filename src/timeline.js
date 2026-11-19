// Shared timeline for the PhiDoc x Baahith reel (Topic 1: "Too many papers").
// All times are in seconds. Dialogue is Moroccan Darija.

export const DURATION = 45;
export const FPS = 30;

// who: 'boy' | 'bot'
export const LINES = [
  { s: 1.0,  e: 5.0,  who: 'boy', text: 'عندي 300 مقال خاصني نقراهم قبل الاجتماع ديال غدا!' },
  { s: 7.0,  e: 11.4, who: 'bot', text: 'ماتخافش! فـ PhiDoc تقدر تقلب على ملايين المقالات فكل المجالات.' },
  { s: 11.6, e: 13.4, who: 'boy', text: 'بصح؟ حتى فالمجال ديالي؟' },
  { s: 13.6, e: 18.0, who: 'bot', text: 'زيد اللي عجبوك للمكتبة ديالك، ورتبهم فـ collections.' },
  { s: 18.2, e: 23.0, who: 'bot', text: 'علّم على الجمل المهمة، وغادي نربطهم ليك مع الأسئلة ديال البحث ديالك.' },
  { s: 23.2, e: 25.4, who: 'boy', text: 'وإلا نسيت شي مرجع؟' },
  { s: 25.6, e: 30.0, who: 'bot', text: 'وفالأخير، نتأكد بلي حتى مرجع ما ناقص فالأطروحة ديالك.' },
  { s: 30.2, e: 32.4, who: 'boy', text: 'وإلا كان عندي سؤال على الموضوع ديالي؟' },
  { s: 32.6, e: 36.4, who: 'bot', text: 'سولني أنا! ونجاوبك على حساب المجال ديالك.' },
  { s: 36.8, e: 38.6, who: 'boy', text: 'صافي، دابا نقدر نرتاح' },
  { s: 38.8, e: 41.0, who: 'bot', text: 'ترتاح؟! باقي خاصك تكتب الأطروحة' },
];

// Feature chips shown at the top of the frame.
export const CHIPS = [
  { s: 7.2,  e: 11.5, icon: 'search',       en: 'Find papers',             ar: 'قلّب فملايين المقالات، فكل المجالات' },
  { s: 13.8, e: 15.9, icon: 'library',      en: 'Personal library',        ar: 'خزّن المقالات فالمكتبة ديالك' },
  { s: 15.9, e: 18.0, icon: 'folder',       en: 'Collections',             ar: 'رتّبهم بالفصول ولا بالمواضيع' },
  { s: 18.4, e: 23.0, icon: 'highlighter',  en: 'Highlights and evidence', ar: 'الجمل المهمة كتولّي أدلة' },
  { s: 25.8, e: 30.0, icon: 'check-circle', en: 'Citation audit',          ar: 'حتى مرجع ما ناقص' },
  { s: 32.8, e: 36.4, icon: 'sparkles',     en: 'Ask Baahith',             ar: 'أجوبة على حساب المجال ديالك' },
];

// Sound effects cues (generated with ffmpeg in render step).
export const SFX = [
  ...Array.from({ length: 14 }, (_, i) => ({ t: 0.35 + i * 0.22, type: 'paper' })),
  { t: 5.6, type: 'whoosh' },
  { t: 6.55, type: 'boing' },
  { t: 7.2, type: 'pop' },
  { t: 13.8, type: 'pop' },
  { t: 14.0, type: 'whoosh' },
  { t: 15.9, type: 'pop' },
  { t: 18.4, type: 'pop' },
  { t: 19.3, type: 'whoosh' },
  { t: 20.6, type: 'ding' },
  { t: 25.8, type: 'pop' },
  { t: 26.6, type: 'ding' }, { t: 27.2, type: 'ding' }, { t: 27.8, type: 'error' },
  { t: 28.9, type: 'ding' },
  { t: 32.8, type: 'pop' },
  { t: 34.0, type: 'pop' },
  { t: 39.6, type: 'boing' },
  { t: 41.2, type: 'whoosh' },
  { t: 41.8, type: 'ding' },
];
