import type { QuizQuestion, QuizResult, SummaryResult } from '@/types';
type AskResponse = { answer?: string; error?: string };
type ErrorResponse = { error?: string };

async function parseError(response: Response): Promise<never> {
  let message = 'Request failed.';

  const rawText = await response.text();

  if (rawText) {
    try {
      const payload = JSON.parse(rawText) as ErrorResponse;
      if (payload?.error) {
        message = payload.error;
      } else {
        message = rawText;
      }
    } catch {
      message = rawText;
    }
  }

  throw new Error(message);
}

export async function askDoubt(question: string): Promise<string> {
  const response = await fetch('/api/ask', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question }),
  });

  if (!response.ok) {
    await parseError(response);
  }

  const payload = (await response.json()) as AskResponse;

  if (!payload.answer) {
    throw new Error('AI returned an empty answer.');
  }

  return payload.answer;
}

export async function summarizeNotes(notes: string): Promise<SummaryResult> {
  const response = await fetch('/api/summarize', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: notes }),
  });

  if (!response.ok) {
    await parseError(response);
  }

  return (await response.json()) as SummaryResult;
}

export async function generateQuizFromContent(content: string): Promise<QuizResult> {
  const response = await fetch('/api/quiz', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
  });

  if (!response.ok) {
    await parseError(response);
  }

  return (await response.json()) as QuizResult;
}

export async function generateQuizFromPdf(file: File, contentHint = ''): Promise<QuizResult> {
  const formData = new FormData();
  formData.append('pdf', file);
  if (contentHint.trim()) {
    formData.append('content', contentHint);
  }

  const response = await fetch('/api/quiz', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    await parseError(response);
  }

  return (await response.json()) as QuizResult;
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
