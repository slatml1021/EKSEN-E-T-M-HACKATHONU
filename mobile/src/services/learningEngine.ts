import type { Evaluation, Scene, Twin } from '../domain/types';

/**
 * This contract is the seam where a production language-feedback provider is
 * added. The local evaluator intentionally corrects only clear, known errors;
 * it never calls a merely different style "wrong".
 */
export interface LearningProvider {
  evaluateReply(input: { text: string; twin: Twin; scene: Scene }): Promise<Evaluation>;
}

export type TwinInference = {
  twin: Twin;
  confidence: number;
  signals: string[];
};

export function evaluatePractice(text: string, twin: Twin, scene: Scene): Evaluation {
  const answer = text.trim();
  const lower = answer.toLocaleLowerCase('en-US');
  const issue = detectClearGrammarIssue(lower);
  const asksForHelp = /\b(could you|can you|can i|would you|please|help)\b/.test(lower);
  const mentionsScene = mentionsVisibleContext(lower, scene);
  const wordCount = meaningfulWords(answer).length;
  const baseAccuracy = answer ? 72 + (mentionsScene ? 9 : 0) + (asksForHelp ? 7 : 0) : 28;
  const baseNaturalness = answer ? 68 + (asksForHelp ? 15 : 0) + (wordCount >= 4 ? 5 : 0) : 25;

  return {
    answer: answer || 'Henüz bir yanıt yazılmadı.',
    grammar: !answer
      ? 'Önce kısa bir İngilizce yanıt dene; mükemmel olması gerekmiyor.'
      : issue.explanation ?? 'Açık bir dilbilgisi hatası görünmüyor. Bu nedenle cümleni yalnızca farklı bir üslupla değiştirmiyoruz.',
    corrected: !answer
      ? scene.phrase.en
      : issue.corrected ?? answer,
    natural: !answer
      ? `İpucu: “${scene.phrase.en}” ile başlayabilirsin.`
      : asksForHelp
        ? 'İsteğini nazikçe kurdun; gerçek bir konuşmada rahatça kullanılabilir.'
        : 'Cümlen anlaşılır. İstek eklemek için “Could you…” veya “Can I…” kalıbını seçebilirsin; bu bir düzeltme değil, ton tercihidir.',
    style: personalisedSuggestion(scene, twin, asksForHelp),
    accuracy: clamp(baseAccuracy - (issue.explanation ? 18 : 0)),
    naturalness: clamp(baseNaturalness),
    voice: clamp(62 + styleAlignment(twin, wordCount, asksForHelp)),
  };
}

/** A transparent, non-psychological Turkish writing-style estimate. */
export function inferTwinFromTurkish(sample: string, current: Twin): TwinInference {
  const text = sample.trim().toLocaleLowerCase('tr-TR');
  if (!text) return { twin: current, confidence: 0, signals: ['Analiz için birkaç Türkçe cümle yazmalısın.'] };

  const shortSentences = text.split(/[.!?]+/).filter(Boolean).map((item) => item.trim()).filter(Boolean);
  const averageLength = shortSentences.reduce((sum, item) => sum + item.split(/\s+/).length, 0) / Math.max(1, shortSentences.length);
  const directMarkers = countMatches(text, /\b(isterim|istemiyorum|gerek|olmaz|net|kısa|bence)\b/g);
  const warmMarkers = countMatches(text, /\b(lütfen|lutfen|teşekkür|tesekkur|sağ ol|sag ol|rica|selam)\b/g);
  const humourMarkers = countMatches(text, /[😀😄😂😉]|\b(şaka|saka|komik|haha|ahah|neyse)\b/g);
  const directness = clamp(Math.round(42 + directMarkers * 9 + (averageLength <= 8 ? 12 : -4)));
  const warmth = clamp(Math.round(45 + warmMarkers * 10 + (text.includes('!') ? 5 : 0)));
  const humour = clamp(Math.round(30 + humourMarkers * 18));
  const signals = [
    averageLength <= 8 ? 'Kısa cümle eğilimi görüldü.' : 'Açıklayıcı cümle eğilimi görüldü.',
    directMarkers ? 'Doğrudan anlatım işaretleri bulundu.' : 'Doğrudanlık için güçlü bir işaret bulunmadı.',
    warmMarkers ? 'Samimi/nezaket dili işaretleri bulundu.' : 'Samimiyet için güçlü bir işaret bulunmadı.',
  ];
  return { twin: { directness, warmth, humour }, confidence: clamp(42 + Math.min(38, sample.length / 4)), signals };
}

/** A local partner turn keeps the demo conversational when no dialogue API is configured. */
export function continuePracticeDialogue(text: string, scene: Scene, twin: Twin): string {
  const answer = text.trim();
  if (!answer) return `Take your time. You could say: “${scene.phrase.en}”`;
  const tone = twin.warmth >= 60 ? 'That makes sense.' : 'Got it.';
  const prompt = twin.directness >= 65 ? 'What do you need next?' : 'Could you tell me one more detail?';
  return `${tone} ${prompt}`;
}

function detectClearGrammarIssue(text: string): { explanation?: string; corrected?: string } {
  if (/\bi\s+(is|are)\b/.test(text)) {
    return { explanation: 'Özne “I” ile “am” kullanılır.', corrected: text.replace(/\bi\s+(is|are)\b/i, 'I am') };
  }
  if (/\b(he|she|it|the \w+|my \w+)\s+(do not|don’t|don't)\b/.test(text)) {
    return { explanation: 'Tekil özneyle “doesn’t” kullanılır.', corrected: text.replace(/\b(do not|don’t|don't)\b/i, 'doesn’t') };
  }
  if (/\b(can|could|would)\s+to\s+\w+/.test(text)) {
    return { explanation: '“Can / could / would” sonrasında fiilin yalın hâli gelir; “to” kullanılmaz.', corrected: text.replace(/\b(can|could|would)\s+to\s+/i, '$1 ') };
  }
  return {};
}

function mentionsVisibleContext(text: string, scene: Scene): boolean {
  const labels = [scene.title, scene.place, ...scene.objects, scene.phrase.en]
    .flatMap((value) => meaningfulWords(value.toLocaleLowerCase('en-US')));
  return labels.some((label) => label.length > 2 && text.includes(label));
}

function personalisedSuggestion(scene: Scene, twin: Twin, alreadyPolite: boolean): string {
  const request = alreadyPolite ? scene.phrase.en : `Could you help me with this, please?`;
  if (twin.directness >= 65) return `Hi — ${request}`;
  if (twin.warmth >= 65) return `Hi! ${request} Thanks so much.`;
  return `Excuse me, ${request}`;
}

function styleAlignment(twin: Twin, wordCount: number, polite: boolean): number {
  const conciseBonus = twin.directness >= 60 && wordCount <= 14 ? 14 : 5;
  const warmBonus = twin.warmth >= 60 && polite ? 12 : 5;
  return conciseBonus + warmBonus + Math.round(twin.humour / 15);
}

function meaningfulWords(value: string): string[] { return value.match(/[A-Za-z][A-Za-z'-]*/g) ?? []; }
function countMatches(value: string, expression: RegExp): number { return value.match(expression)?.length ?? 0; }
function clamp(value: number): number { return Math.max(0, Math.min(100, Math.round(value))); }

export const demoLearningProvider: LearningProvider = {
  async evaluateReply({ text, twin, scene }) {
    return evaluatePractice(text, twin, scene);
  },
};
