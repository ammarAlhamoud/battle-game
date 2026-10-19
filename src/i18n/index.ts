import { arMessages } from './messages.js';
import { arContent } from './content-ar.js';
import { proMessagesAr } from './pro-messages.js';
import { difficultyMessagesAr } from './difficulty-messages.js';

export type Language = 'en' | 'ar';
let language: Language = 'en';
/** Unknown source strings are preserved and exposed for localization QA. */
export const missingTranslations = new Set<string>();
export function getLanguage(): Language { return language; }
/** Storage, direction and live DOM updates belong to the caller. */
export function setLanguage(next: Language): void { language = next; }

const numberToken = '[+−-]?[\\d,]+(?:\\.\\d+)?';
const isCode = /^(?:[IVX]+|(?:[A-Z](?:\s+|\s*\/\s*))+[A-Z]|Ctrl\s*\+\s*[\d–-]+|Shift\s*\+\s*[\d–-]+|[A-Z]|[\d\s:.,%+−–\-×/→←↑↓▶▷✓✦⌑⌂⛶]+)$/;
const eras: Record<string, string> = { I: 'الأول', II: 'الثاني', III: 'الثالث', IV: 'الرابع', V: 'الخامس', VI: 'السادس', VII: 'السابع', VIII: 'الثامن' };
type Match = RegExpMatchArray;
type Rule = [RegExp, (match: Match, translate: (text: string) => string) => string];
const rules: Rule[] = [
  [/^Civilization tree\s*·\s*(\d+) SP$/, m => `شجرة الحضارة · ${m[1]} نقطة`],
  [/^(\d+)\s*\/\s*40 BATTLES WON$/, m => `${m[1]} / 40 انتصارًا`],
  [/^Age ([IVX]+) of VIII$/, m => `العصر ${eras[m[1]!] ?? m[1]} من ثمانية`],
  [/^THE ([IVX]+) AGE\s*\/\s*(.+)$/, (m, t) => `العصر ${eras[m[1]!] ?? m[1]} / ${t(m[2]!)}`],
  [/^AGE ([IVX]+) \/ BATTLE (\d+)( \/ ERA FINALE)?$/, m => `العصر ${eras[m[1]!] ?? m[1]} / المعركة ${m[2]}${m[3] ? ' / ختام العصر' : ''}`],
  [/^AGE ([IVX]+)$/, m => `العصر ${eras[m[1]!] ?? m[1]}`],
  [/^(\d+) — EIGHT AGES\. ONE ART OF COMMAND\.$/, m => `${m[1]} — ثمانية عصور. فن واحد للقيادة.`],
  [/^Downloading (\d+)%$/, m => `جارٍ التنزيل ${m[1]}%`],
  [/^(Begin|Replay) battle\s*→$/, m => m[1] === 'Begin' ? 'بدء المعركة ←' : 'إعادة المعركة ←'],
  [/^↶ Resume (.+) · (\d+:\d+)$/, (m, t) => `↶ استئناف ${t(m[1]!)} · ${m[2]}`],
  [/^Original illustration of (.+)$/, (m, t) => `رسم أصلي لعصر ${t(m[1]!)}`],
  [/^BATTLE (\d+)$/, m => `المعركة ${m[1]}`],
  [new RegExp(`^(${numberToken}) SCORE$`), m => `${m[1]} نقطة`],
  [/^([+−-]?\d+) SP( · PREREQUISITE REQUIRED)?$/, m => `${m[1]} نقطة${m[2] ? ' · يتطلب مهارة سابقة' : ''}`],
  [/^Learn · (\d+) SP$/, m => `اكتساب · ${m[1]} نقطة`],
  [/^REQUIRES: (.+)$/, (m, t) => `المتطلبات: ${t(m[1]!)}`],
  [/^LINE (\d+)$/, m => `الخط ${m[1]}`],
  [/^RESERVES\s*\/\s*(\d+)$/, m => `الاحتياط / ${m[1]}`],
  [/^PLANNED ORDERS\s*\/\s*(\d+)$/, m => `الأوامر المخططة / ${m[1]}`],
  [/^(\d+) soldiers selected$/, m => `${m[1]} جنود محددون`],
  [/^Edit order (\d+)$/, m => `تعديل الأمر ${m[1]}`],
  [/^Control group (\d+) assigned\.$/, m => `حُفظت مجموعة التحكم ${m[1]}.`],
  [/^Selection added to group (\d+)\.$/, m => `أُضيف التحديد إلى المجموعة ${m[1]}.`],
  [/^Applies this plan to (\d+) selected soldiers?\. You can also append orders with Shift \+ right-click\.$/, m => `تُطبّق هذه الخطة على ${m[1]} من الجنود المحددين. يمكنك أيضًا إضافة أوامر باستخدام Shift مع النقر الأيمن.`],
  [/^(\d+) \/ (\d+) army capacity · (\d+) \/ (\d+) reserve slots · (\d+) production lines?$/, m => `سعة الجيش ${m[1]} / ${m[2]} · الاحتياط ${m[3]} / ${m[4]} · خطوط الإنتاج ${m[5]}`],
  [/^Recruit (.+), (\d+) supplies, (\d+) capacity, ([\d.]+) seconds$/, (m, t) => `تجنيد ${t(m[1]!)}، ${m[2]} إمدادات، ${m[3]} سعة، ${m[4]} ثانية`],
  [/^Cancel (.+) · (50|100)% refund$/, (m, t) => `إلغاء ${t(m[1]!)} · استرداد ${m[2]}%`],
  [/^CANCEL: 100% before training · 50% after training begins\. (.+)$/, (m, t) => `الإلغاء: استرداد 100% قبل التدريب و50% بعد بدئه. ${t(m[1]!)}`],
  [/^ACTIVE: (.+)$/, (m, t) => `المزايا النشطة: ${t(m[1]!)}`],
  [/^Ability (\d+)s$/, m => `القدرة: ${m[1]} ث`],
  [/^(Rally|Recon|Volley) is ready in (\d+) seconds\.$/, (m, t) => `${t(m[1]!)} متاح بعد ${m[2]} ثانية.`],
  [/^(Rally|Recon|Volley) needs (\d+) supplies\.$/, (m, t) => `تحتاج قدرة ${t(m[1]!)} إلى ${m[2]} إمدادات.`],
  [/^(Rally|Recon|Volley) · select a target$/, (m, t) => `${t(m[1]!)} · اختر هدفًا`],
  [/^Use (rally|recon|volley)$/, (m, t) => `استخدام ${t(m[1]!)}`],
  [/^Build (barrier|tower)$/, (m, t) => `بناء ${t(m[1]!)}`],
  [/^Build a (barrier|tower)$/, (m, t) => `بناء ${t(m[1]!)}`],
  [/^(.+) Cost: (\d+) supplies\. Cooldown: (\d+) seconds\.$/, (m, t) => `${t(m[1]!)} التكلفة: ${m[2]} إمدادات. فترة الانتظار: ${m[3]} ثانية.`],
  [/^Choose a nearby clear cell\. Base cost: (\d+) supplies before construction upgrades\. Blocked or unaffordable sites are rejected\.$/, m => `اختر خلية قريبة خالية. التكلفة الأساسية: ${m[1]} إمدادات قبل تحسينات البناء. تُرفض المواقع المسدودة أو التي تتجاوز الإمدادات المتاحة.`],
  [/^(Move|Attack|Defend|Capture|Rally|Build|Ability) → ([\d.-]+), ([\d.-]+)$/, (m, t) => `${t(m[1]!)} ← ${m[2]}, ${m[3]}`],
  [new RegExp(`^(${numberToken}) supplies$`), m => `${m[1]} إمدادات`],
  [new RegExp(`^(${numberToken}) cap$`), m => `${m[1]} سعة`],
  [new RegExp(`^(${numberToken}) capacity$`), m => `${m[1]} سعة`],
  [new RegExp(`^(${numberToken}) cells$`), m => `${m[1]} خلايا`],
  [new RegExp(`^(${numberToken})s$`), m => `${m[1]} ث`],
  [new RegExp(`^(${numberToken}) seconds$`), m => `${m[1]} ثانية`],
  [new RegExp(`^(${numberToken}) \\/ (${numberToken}) health$`), m => `الصحة ${m[1]} / ${m[2]}`],
  [new RegExp(`^(${numberToken}) health$`), m => `${m[1]} صحة`],
  [new RegExp(`^(${numberToken}) damage$`), m => `${m[1]} ضرر`],
  [new RegExp(`^(${numberToken}) armor$`), m => `${m[1]} تدريع`],
  [new RegExp(`^(${numberToken}) range$`), m => `${m[1]} مدى`],
  [new RegExp(`^(${numberToken}) vision$`), m => `${m[1]} رؤية`],
  [/^Save could not be restored: (.+)\. You can import a backup\.$/, (m, t) => `تعذر استعادة الحفظ: ${t(m[1]!)} يمكنك استيراد نسخة احتياطية.`],
  [/^Eightfold could not start: (.+)\. Reload or restore a valid save\.$/, (m, t) => `تعذر تشغيل EIGHTFOLD: ${t(m[1]!)} أعد التحميل أو استعد ملف حفظ صالحًا.`],
  [/^Content validation failed: (.+)$/, (m, t) => `تعذر التحقق من بيانات اللعبة: ${t(m[1]!)}`],
  [/^Simulation stopped: (.+)\. Your last available battle snapshot was preserved\.$/, (m, t) => `توقفت المحاكاة: ${t(m[1]!)} حُفظت آخر حالة متاحة للمعركة.`],
  [/^Simulation error: (.+)$/, (m, t) => `خطأ في المحاكاة: ${t(m[1]!)}`],
  [/^Save failed: (.+)$/, (m, t) => `تعذر الحفظ: ${t(m[1]!)}`],
  [/^Autosave failed: (.+)$/, (m, t) => `تعذر الحفظ التلقائي: ${t(m[1]!)}`],
  [/^Error: (.+)$/, (m, t) => t(m[1]!)],
  [/^Invalid save at (.+): (.+)$/, (m, t) => `ملف الحفظ غير صالح عند ${readablePath(m[1]!)}: ${t(m[2]!)}`],
  [/^expected an array of at most (\d+) entries$/, m => `يجب ألا تتجاوز القائمة ${m[1]} عنصرًا`],
  [/^unknown reference (.+)$/, m => `مرجع غير معروف: ${m[1]}`],
  [/^Unknown (unit|mission) (.+)$/, m => `${m[1] === 'unit' ? 'وحدة' : 'مهمة'} غير معروفة: ${m[2]}`],
];

const pathTerms: Record<string, string> = {
  campaign: 'الحملة', battle: 'المعركة', version: 'الإصدار', savedAt: 'وقت الحفظ', records: 'السجلات', points: 'النقاط',
  skills: 'المهارات', selectedEra: 'العصر المحدد', tutorial: 'الدليل', totalEarned: 'مجموع المكتسبات', language: 'اللغة',
  bestScore: 'أفضل نتيجة', victory: 'النصر', claimed: 'المكافآت الممنوحة', missionId: 'معرف المهمة', seed: 'بذرة المعركة',
  tick: 'الخطوة', time: 'الوقت', paused: 'الإيقاف', units: 'الوحدات', factions: 'الفصائل', strongholds: 'الحصون',
  structures: 'المنشآت', fog: 'الرؤية', ai: 'خطط الخصم', events: 'الأحداث', nextId: 'المعرف التالي', winner: 'الفائز',
  ended: 'انتهاء المعركة', aiSides: 'الفصائل الآلية', id: 'المعرف', owner: 'المالك', defId: 'نوع الوحدة', x: 'X', y: 'Y',
  hp: 'الصحة', facing: 'الاتجاه', orders: 'الأوامر', route: 'المسار', cooldown: 'فترة الانتظار', abilityCooldown: 'انتظار القدرة',
  formation: 'التشكيل', group: 'المجموعة', slot: 'المكان', status: 'الحالة', lastHit: 'آخر إصابة', stuck: 'التعثر',
  targetId: 'معرف الهدف', resources: 'الإمدادات', spent: 'المنفق', earned: 'المكتسب', baseCapacity: 'السعة الأساسية',
  reserveCapacity: 'سعة الاحتياط', lines: 'خطوط الإنتاج', reserves: 'الاحتياط', autoDeploy: 'النشر التلقائي',
  cooldowns: 'فترات الانتظار', kills: 'القضاء على الأعداء', score: 'النتيجة', lost: 'الخسائر', captured: 'المواقع المستولى عليها',
  damageDealt: 'الضرر الملحق', blocked: 'توقف الإنتاج', queue: 'قائمة الانتظار', unitId: 'معرف الوحدة', total: 'الإجمالي',
  remaining: 'المتبقي', started: 'بدء التدريب', capturing: 'جهة الاستيلاء', progress: 'التقدم', kind: 'النوع', target: 'الهدف',
  maxHp: 'الصحة القصوى', built: 'اكتمال البناء', visible: 'المرئي', explored: 'المستكشف', memory: 'الذاكرة',
  seen: 'وقت المشاهدة', nextDecision: 'القرار التالي', objective: 'الهدف', mode: 'النمط', lastKnown: 'آخر معلومات معروفة',
  difficulty: 'الصعوبة', aiGraceUntil: 'مهلة التجهيز', nextRecruitAt: 'موعد التجنيد', decisions: 'القرارات', text: 'النص',
};
function readablePath(path: string): string {
  return path.split('.').map(part => part.replace(/^([A-Za-z]+)(.*)$/, (_, key: string, suffix: string) => `${pathTerms[key] ?? 'الحقل'}${suffix}`)).join(' / ');
}

function arabic(source: string, depth: number): string {
  if (!source || depth > 12) return source;
  const exact = difficultyMessagesAr[source] ?? proMessagesAr[source] ?? arMessages[source] ?? arContent[source];
  if (exact !== undefined) return exact;
  const text = source.trim();
  if (text !== source) return source.slice(0, source.indexOf(text)) + arabic(text, depth + 1) + source.slice(source.indexOf(text) + text.length);
  if (!text || /[\u0600-\u06ff]/.test(text) || isCode.test(text) || /^[IVX]+\s*\/\s*\d+$/.test(text)) return source;
  const t = (value: string) => arabic(value, depth + 1);
  for (const [pattern, render] of rules) { const match = text.match(pattern); if (match) return render(match, t); }
  // These are the explicit composite layouts used by the HUD and campaign.
  for (const separator of ['\n', ' · ', ' / ', ', ', '; ']) {
    if (!text.includes(separator)) continue;
    const pieces = text.split(separator); const translated = pieces.map(t);
    const complete = pieces.every((piece, index) => translated[index] !== piece || !/[A-Za-z]/.test(piece) || isCode.test(piece) || arMessages[piece] !== undefined);
    if (complete && translated.some((value, index) => value !== pieces[index])) return translated.join(separator === ', ' ? '، ' : separator);
  }
  if (/[A-Za-z]/.test(text)) missingTranslations.add(text);
  return source;
}

/** English stays byte-for-byte stable; Arabic uses exact content and typed phrase templates. */
export function translate(source: string, requested: Language = language): string {
  return requested === 'en' ? source : arabic(source, 0);
}
