export type AssistantRole = 'user' | 'assistant';

export type ChatMessage = {
  id: string;
  role: AssistantRole;
  content: string;
};

export type KnowledgeEntry = {
  id: string;
  question: string;
  answer: string;
  topic: string | null;
  source_label: string | null;
  confidence: number | null;
  updated_at: string | null;
};

export type SummaryResult = {
  summary: string;
  bullets: string[];
};

export type QuizQuestion = {
  question: string;
  options: string[];
  answerIndex: number;
  explanation: string;
};

export type QuizResult = {
  topic: string;
  questions: QuizQuestion[];
};
