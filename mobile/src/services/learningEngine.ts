import type { Evaluation, Scene, Twin } from '../domain/types';

/**
 * This contract is the seam where a production vision + LLM provider is added.
 * The demo provider stays deterministic so a jury presentation works offline.
 */
export interface LearningProvider {
  evaluateReply(input: { text: string; twin: Twin; scene: Scene }): Promise<Evaluation>;
}

export function evaluatePractice(text: string, twin: Twin): Evaluation {
  const answer = text.trim() || 'My microphone do not work.';
  const lower = answer.toLowerCase();
  const hasMic = /mic|microphone/.test(lower);
  const polite = /could|can i|could you|would you/.test(lower);

  return {
    answer,
    grammar: /don't work|do not work/.test(lower) && hasMic
      ? '“Microphone” tekil olduğu için “doesn’t / isn’t” kullanmalıyız.'
      : 'Cümlen anlaşılır; sadece daha doğal bir sürüm önerebiliriz.',
    corrected: hasMic
      ? 'I think the microphone isn’t working.'
      : 'I think there is a problem with the microphone.',
    natural: polite
      ? 'İsteğini nazikçe kurdun; bu gerçek bir konuşmada rahatça çalışır.'
      : 'İsteği “Could you…” ile yumuşatırsan daha doğal duyulur.',
    style: twin.directness > 65
      ? 'Hey, I think the mic isn’t working. Could you give me a hand?'
      : 'Excuse me, I think the microphone is not working. Could you help me, please?',
    accuracy: hasMic ? 78 : 65,
    naturalness: polite ? 89 : 72,
    voice: Math.min(94, twin.directness + 10),
  };
}

export const demoLearningProvider: LearningProvider = {
  async evaluateReply({ text, twin }) {
    return evaluatePractice(text, twin);
  },
};
