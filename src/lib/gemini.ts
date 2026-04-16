import type { QuizQuestion, QuizResult, SummaryResult } from '@/types';
type GeminiErrorPayload = {
  error?: {
    message?: string;
  };
};

type GeminiPayload = {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
};

const geminiApiKey = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;
const geminiModel = (import.meta.env.VITE_GEMINI_MODEL as string | undefined) || 'gemini-2.5-flash';

function requireGeminiApiKey() {
  if (!geminiApiKey) {
    throw new Error('Missing VITE_GEMINI_API_KEY in .env for static frontend usage.');
  }
}

function parseJsonFromText<T>(text: string): T {
  const fenced = text.match(/```json\s*([\s\S]*?)```/i);
  const candidate = (fenced?.[1] || text).trim();

  try {
    return JSON.parse(candidate) as T;
  } catch {
    const firstBrace = candidate.indexOf('{');
    const lastBrace = candidate.lastIndexOf('}');

    if (firstBrace >= 0 && lastBrace > firstBrace) {
      return JSON.parse(candidate.slice(firstBrace, lastBrace + 1)) as T;
    }

    throw new Error('Model did not return valid JSON.');
  }
}

async function parseGeminiError(response: Response): Promise<never> {
  let message = `Request failed (${response.status}).`;
  const rawText = await response.text();

  if (rawText) {
    try {
      const payload = JSON.parse(rawText) as GeminiErrorPayload;
      message = payload?.error?.message || rawText;
    } catch {
      message = rawText;
    }
  }

  throw new Error(message);
}

async function callGemini(userPrompt: string, systemInstruction: string, temperature = 0.35) {
  requireGeminiApiKey();

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${geminiApiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemInstruction }] },
        contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
        generationConfig: { temperature },
      }),
    },
  );

  if (!response.ok) {
    await parseGeminiError(response);
  }

  const payload = (await response.json()) as GeminiPayload;
  const text = payload?.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('').trim();

  if (!text) {
    throw new Error('AI returned an empty response.');
  }

  return text;
}

export async function askDoubt(question: string): Promise<string> {
  const trimmed = question.trim();
  if (!trimmed) {
    throw new Error('Question is required.');
  }

  return callGemini(
    `Explain this question in simple student-friendly language. Include a short example if useful.\n\nQuestion:\n${trimmed}`,
    'You are a helpful teacher for students. Keep answers concise, clear, and accurate.',
    0.35,
  );
}

export async function summarizeNotes(notes: string): Promise<SummaryResult> {
  const trimmed = notes.trim();
  if (!trimmed) {
    throw new Error('Text is required.');
  }

  const raw = await callGemini(
    `Summarize the notes below for revision. Return JSON only in this exact shape: {"summary":"...","bullets":["..."]}.\n\nNotes:\n${trimmed}`,
    'You are a student notes summarizer. Return only valid JSON with keys summary and bullets.',
    0.3,
  );

  const parsed = parseJsonFromText<Partial<SummaryResult>>(raw);
  const summary = String(parsed?.summary || '').trim();
  const bullets = Array.isArray(parsed?.bullets) ? parsed.bullets.map((item) => String(item).trim()).filter(Boolean) : [];

  if (!summary || bullets.length === 0) {
    throw new Error('Summarizer returned an invalid format.');
  }

  return { summary, bullets };
}

export async function generateQuizFromContent(content: string): Promise<QuizResult> {
  const trimmed = content.trim();
  if (!trimmed) {
    throw new Error('Quiz content is required.');
  }

  const raw = await callGemini(
    `Create a moderate-difficulty quiz from the content below. Return JSON only in this shape: {"topic":"...","questions":[{"question":"...","options":["A","B","C","D"],"answerIndex":1,"explanation":"..."}]}. Create 5 to 10 questions.\n\nContent:\n${trimmed}`,
    'You are a quiz generator for students. Return only valid JSON. Each question must include exactly 4 options and answerIndex 0-3.',
    0.35,
  );

  const parsed = parseJsonFromText<Partial<QuizResult>>(raw);
  const topic = String(parsed?.topic || 'Study Quiz').trim();
  const questions = normalizeQuizQuestions(Array.isArray(parsed?.questions) ? parsed.questions : []);

  if (questions.length === 0) {
    throw new Error('Quiz generator returned no valid questions.');
  }

  return { topic, questions };
}

export async function generateQuizFromPdf(_file: File, _contentHint = ''): Promise<QuizResult> {
  throw new Error('PDF quiz generation is not available in static mode. Paste PDF text into the content box instead.');
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
