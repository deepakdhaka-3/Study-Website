import type { QuizQuestion, QuizResult, SummaryResult } from '@/types';

const modelName = import.meta.env.VITE_GEMINI_MODEL || 'gemini-2.5-flash';
const apiKey = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;

type GeminiPart = { text: string };

type GeminiResponse = {
  candidates?: Array<{
    content?: {
      parts?: GeminiPart[];
    };
  }>;
};

function ensureGeminiKey() {
  if (!apiKey) {
    throw new Error('Missing Gemini API key.');
  }
}

function extractText(payload: GeminiResponse): string {
  const parts = payload.candidates?.[0]?.content?.parts ?? [];
  return parts.map((part) => part.text).join('').trim();
}

function extractJson<T>(rawText: string): T {
  const fenced = rawText.match(/```json\s*([\s\S]*?)```/i);
  const candidate = fenced?.[1] ?? rawText;

  try {
    return JSON.parse(candidate) as T;
  } catch {
    const firstBrace = candidate.indexOf('{');
    const lastBrace = candidate.lastIndexOf('}');

    if (firstBrace >= 0 && lastBrace > firstBrace) {
      return JSON.parse(candidate.slice(firstBrace, lastBrace + 1)) as T;
    }

    throw new Error('The model did not return valid JSON.');
  }
}

async function generateContent(prompt: string, systemInstruction: string) {
  ensureGeminiKey();

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      systemInstruction: {
        parts: [{ text: systemInstruction }],
      },
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        temperature: 0.3,
      },
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(body || 'Gemini request failed.');
  }

  return (await response.json()) as GeminiResponse;
}

export async function answerWithGroundTruth(prompt: string, systemInstruction: string) {
  const data = await generateContent(prompt, systemInstruction);
  const text = extractText(data);

  if (!text) {
    throw new Error('Gemini returned an empty response.');
  }

  return text;
}

export async function summarizeNotes(notes: string, systemInstruction: string): Promise<SummaryResult> {
  const data = await generateContent(
    `Summarize the following study notes into a short summary and 4-6 bullets. Return JSON with keys summary and bullets. Notes:\n\n${notes}`,
    systemInstruction,
  );

  return extractJson<SummaryResult>(extractText(data));
}

export async function generateQuiz(topic: string, context: string, systemInstruction: string): Promise<QuizResult> {
  const data = await generateContent(
    `Create 5 to 10 multiple-choice questions about this topic using only the supplied database context. Return JSON with keys topic and questions. Each question must include question, options, answerIndex, and explanation. Topic: ${topic}\n\nDatabase context:\n${context}`,
    systemInstruction,
  );

  return extractJson<QuizResult>(extractText(data));
}

export function normalizeQuizQuestions(questions: QuizQuestion[]): QuizQuestion[] {
  return questions
    .filter((question) => question.question && Array.isArray(question.options) && question.options.length >= 2)
    .map((question) => ({
      ...question,
      answerIndex: Number.isFinite(question.answerIndex) ? question.answerIndex : 0,
      options: question.options.slice(0, 6),
    }));
}
