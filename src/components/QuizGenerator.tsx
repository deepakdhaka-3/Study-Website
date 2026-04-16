import { useMemo, useState, type FormEvent } from 'react';
import { AlertTriangle, CheckCircle2, HelpCircle, Sparkles } from 'lucide-react';
import { LoadingDots } from './LoadingDots';
import { generateQuizFromContent, normalizeQuizQuestions } from '@/lib/gemini';
import type { QuizResult } from '@/types';

export function QuizGenerator() {
  const [content, setContent] = useState('');
  const [quiz, setQuiz] = useState<QuizResult | null>(null);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const score = useMemo(() => {
    if (!quiz || !submitted) {
      return 0;
    }

    return quiz.questions.reduce((total, question, index) => (answers[index] === question.answerIndex ? total + 1 : total), 0);
  }, [answers, quiz, submitted]);

  async function handleGenerate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmed = content.trim();
    if (!trimmed) {
      setError('Please paste notes/content first.');
      return;
    }

    setError('');
    setLoading(true);
    setSubmitted(false);
    setAnswers({});

    try {
      const result = await generateQuizFromContent(trimmed);
      const normalized = normalizeQuizQuestions(result.questions).slice(0, 10);

      setQuiz({
        topic: result.topic || 'Study Quiz',
        questions: normalized.length > 0 ? normalized : normalizeQuizQuestions(result.questions),
      });
    } catch (generateError) {
      setError(generateError instanceof Error ? generateError.message : 'Failed to generate a quiz.');
    } finally {
      setLoading(false);
    }
  }

  function handleSubmitQuiz() {
    if (!quiz) {
      return;
    }

    setSubmitted(true);
  }

  return (
    <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="rounded-[2rem] border border-green-500/10 bg-gradient-to-br from-slate-950/80 to-slate-900/60 p-4 shadow-2xl shadow-green-950/10 backdrop-blur xl:p-6">
        <div className="inline-flex items-center gap-2 rounded-full border border-green-400/20 bg-green-400/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.24em] text-green-200">
          <Sparkles className="h-3.5 w-3.5" />
          Quiz Generator
        </div>
        <h2 className="mt-3 text-2xl font-bold text-white">Test Your Knowledge</h2>
        <p className="mt-1 text-sm text-slate-400">Paste notes/content and Study Guru will create moderate-level MCQs.</p>

        <form onSubmit={handleGenerate} className="mt-5 flex flex-col gap-3">
          <textarea
            value={content}
            onChange={(event) => setContent(event.target.value)}
            rows={5}
            placeholder="Paste notes, chapter text, or key concepts here..."
            className="w-full rounded-xl border border-green-500/20 bg-green-950/20 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-green-400/40 focus:bg-green-950/30 focus:ring-1 focus:ring-green-500/20"
          />
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 px-4 py-3 text-sm font-bold text-white transition hover:from-green-400 hover:to-emerald-400 disabled:opacity-50 sm:w-fit"
          >
            <HelpCircle className="h-4 w-4" />
            Generate Quiz
          </button>
        </form>

        {error ? (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">
            <AlertTriangle className="h-4 w-4" />
            {error}
          </div>
        ) : null}

        <div className="mt-5 space-y-4">
          {loading ? (
            <div className="rounded-2xl border border-green-500/20 bg-green-950/40 p-5">
              <LoadingDots />
            </div>
          ) : null}

          {quiz ? (
            <>
              {quiz.questions.map((question, index) => {
                const isCorrect = submitted && answers[index] === question.answerIndex;
                const selectedAnswer = answers[index];

                return (
                  <article key={`${question.question}-${index}`} className="rounded-2xl border border-green-500/20 bg-green-950/40 p-5">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="text-base font-medium text-white">
                        {index + 1}. {question.question}
                      </h3>
                      {submitted ? (
                        <span className={`rounded-full px-3 py-1 text-xs font-bold ${isCorrect ? 'bg-green-400/15 text-green-200' : 'bg-rose-400/15 text-rose-200'}`}>
                          {isCorrect ? '✓ Correct' : '✗ Wrong'}
                        </span>
                      ) : null}
                    </div>

                    <div className="mt-4 grid gap-3">
                      {question.options.map((option, optionIndex) => {
                        const active = selectedAnswer === optionIndex;
                        const correct = submitted && optionIndex === question.answerIndex;

                        return (
                          <button
                            key={`${question.question}-${option}`}
                            type="button"
                            onClick={() => setAnswers((current) => ({ ...current, [index]: optionIndex }))}
                            className={`rounded-xl border px-4 py-3 text-left text-sm transition font-medium ${
                              correct
                                ? 'border-green-400/40 bg-green-400/15 text-green-100'
                                : active
                                  ? 'border-blue-400/40 bg-blue-400/15 text-white'
                                  : 'border-white/10 bg-white/5 text-slate-300 hover:border-blue-400/30 hover:bg-blue-950/20'
                            }`}
                          >
                            {option}
                          </button>
                        );
                      })}
                    </div>

                    {submitted ? (
                      <div className="mt-4 rounded-xl border border-green-500/20 bg-green-950/30 p-4 text-sm text-slate-200">
                        <p className="font-bold text-green-200">✓ Correct Answer: {question.options[question.answerIndex]}</p>
                        <p className="mt-2 leading-6 text-slate-300">{question.explanation}</p>
                      </div>
                    ) : null}
                  </article>
                );
              })}

              <button
                type="button"
                onClick={handleSubmitQuiz}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 px-5 py-3 text-sm font-bold text-white transition hover:from-blue-400 hover:to-purple-400"
              >
                <CheckCircle2 className="h-4 w-4" />
                Submit Answers
              </button>
            </>
          ) : (
            <div className="rounded-2xl border border-dashed border-green-500/20 bg-green-950/20 p-8 text-center">
              <HelpCircle className="mx-auto h-10 w-10 text-green-400/40 mb-3" />
              <p className="text-slate-400 text-sm">Generate a quiz to test your understanding. You'll see your score and explanations after submission.</p>
            </div>
          )}
        </div>
      </div>

      <aside className="rounded-[2rem] border border-green-500/10 bg-gradient-to-br from-green-950/30 to-slate-950/30 p-4 shadow-2xl shadow-green-950/10 backdrop-blur xl:p-5">
        <h3 className="text-sm font-bold uppercase tracking-[0.24em] text-green-300">Your Score</h3>
        <div className="mt-4 rounded-2xl border border-green-500/20 bg-green-950/40 p-5 text-white">
          {quiz && submitted ? (
            <>
              <p className="text-xs uppercase tracking-[0.2em] text-green-200 font-bold">Final Score</p>
              <p className="mt-3 text-5xl font-bold text-green-300">{score}/{quiz.questions.length}</p>
              <p className="mt-3 text-sm leading-6 text-slate-300">
                <span className="font-semibold text-white">Topic:</span> {quiz.topic}
              </p>
              <div className="mt-4 rounded-lg bg-green-400/10 px-3 py-2 text-xs text-green-200">
                {score === quiz.questions.length ? '🎉 Perfect Score!' : `${Math.round((score / quiz.questions.length) * 100)}% Correct`}
              </div>
            </>
          ) : (
            <>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400 font-bold">Answer & Submit</p>
              <p className="mt-3 text-sm leading-6 text-slate-300">
                Answer all questions, then submit to see your score and detailed explanations for each question.
              </p>
            </>
          )}
        </div>

        <div className="mt-4 rounded-xl border border-green-500/20 bg-green-950/30 p-4 text-sm leading-6 text-slate-300">
          💡 <span className="font-semibold text-slate-200">Pro Tip:</span> Review wrong answers to strengthen your understanding.
        </div>
      </aside>
    </section>
  );
}
