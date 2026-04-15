import { useMemo, useState, type FormEvent } from 'react';
import { AlertTriangle, CheckCircle2, HelpCircle, Sparkles } from 'lucide-react';
import { LoadingDots } from './LoadingDots';
import { generateQuiz as generateQuizFromGemini, normalizeQuizQuestions } from '@/lib/gemini';
import { quizSystemPrompt } from '@/lib/prompts';
import { searchKnowledgeEntries } from '@/lib/supabase';
import type { QuizQuestion, QuizResult } from '@/types';

export function QuizGenerator() {
  const [topic, setTopic] = useState('');
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

    const trimmed = topic.trim();
    if (!trimmed) {
      setError('Please enter a topic first.');
      return;
    }

    setError('');
    setLoading(true);
    setSubmitted(false);
    setAnswers({});

    try {
      const entries = await searchKnowledgeEntries(trimmed, 8);

      if (entries.length === 0) {
        setQuiz(null);
        setError('No matching Supabase records were found for that topic. Add knowledge entries first, then try again.');
        return;
      }

      const context = entries
        .map((entry, index) => {
          return [`Record ${index + 1}`, `Topic: ${entry.topic || 'General'}`, `Question: ${entry.question}`, `Answer: ${entry.answer}`].join('\n');
        })
        .join('\n\n');

      const result = await generateQuizFromGemini(trimmed, context, quizSystemPrompt);
      const normalized = normalizeQuizQuestions(result.questions).slice(0, 10);

      setQuiz({
        topic: result.topic || trimmed,
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
      <div className="rounded-[2rem] border border-white/10 bg-slate-950/70 p-4 shadow-2xl shadow-cyan-950/20 backdrop-blur xl:p-6">
        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-emerald-200">
          <Sparkles className="h-3.5 w-3.5" />
          Quiz Generator
        </div>
        <h2 className="mt-3 text-2xl font-semibold text-white">Generate multiple-choice questions from database content</h2>
        <p className="mt-1 text-sm text-slate-400">Enter a topic, retrieve matching knowledge from Supabase, and let Gemini build a study quiz.</p>

        <form onSubmit={handleGenerate} className="mt-5 flex flex-col gap-3 sm:flex-row">
          <input
            value={topic}
            onChange={(event) => setTopic(event.target.value)}
            placeholder="Example: photosynthesis, Python loops, cell division"
            className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-emerald-400/40 focus:bg-white/8"
          />
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-400 disabled:opacity-50"
          >
            <HelpCircle className="h-4 w-4" />
            Build quiz
          </button>
        </form>

        {error ? (
          <div className="mt-4 flex items-center gap-2 rounded-2xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">
            <AlertTriangle className="h-4 w-4" />
            {error}
          </div>
        ) : null}

        <div className="mt-5 space-y-4">
          {loading ? (
            <div className="rounded-3xl border border-white/10 bg-slate-900/80 p-5">
              <LoadingDots />
            </div>
          ) : null}

          {quiz ? (
            <>
              {quiz.questions.map((question, index) => {
                const isCorrect = submitted && answers[index] === question.answerIndex;
                const selectedAnswer = answers[index];

                return (
                  <article key={`${question.question}-${index}`} className="rounded-3xl border border-white/10 bg-slate-900/80 p-5">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="text-base font-medium text-white">
                        {index + 1}. {question.question}
                      </h3>
                      {submitted ? (
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${isCorrect ? 'bg-emerald-400/15 text-emerald-200' : 'bg-rose-400/15 text-rose-200'}`}>
                          {isCorrect ? 'Correct' : 'Incorrect'}
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
                            className={`rounded-2xl border px-4 py-3 text-left text-sm transition ${
                              correct
                                ? 'border-emerald-400/40 bg-emerald-400/15 text-emerald-100'
                                : active
                                  ? 'border-cyan-400/40 bg-cyan-400/15 text-white'
                                  : 'border-white/10 bg-white/5 text-slate-300 hover:border-white/20 hover:bg-white/10'
                            }`}
                          >
                            {option}
                          </button>
                        );
                      })}
                    </div>

                    {submitted ? (
                      <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-slate-200">
                        <p className="font-semibold text-white">Answer: {question.options[question.answerIndex]}</p>
                        <p className="mt-2 leading-6 text-slate-300">{question.explanation}</p>
                      </div>
                    ) : null}
                  </article>
                );
              })}

              <button
                type="button"
                onClick={handleSubmitQuiz}
                className="inline-flex items-center gap-2 rounded-2xl bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
              >
                <CheckCircle2 className="h-4 w-4" />
                Submit answers
              </button>
            </>
          ) : (
            <div className="rounded-3xl border border-dashed border-white/10 bg-slate-950/50 p-6 text-sm leading-6 text-slate-400">
              Create a quiz after the app finds related Supabase records. Your final score appears after submission.
            </div>
          )}
        </div>
      </div>

      <aside className="rounded-[2rem] border border-white/10 bg-white/5 p-4 shadow-2xl shadow-cyan-950/10 backdrop-blur xl:p-5">
        <h3 className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-400">Scoreboard</h3>
        <div className="mt-4 rounded-3xl border border-white/10 bg-slate-950/70 p-5 text-white">
          {quiz && submitted ? (
            <>
              <p className="text-xs uppercase tracking-[0.2em] text-emerald-200">Final score</p>
              <p className="mt-3 text-4xl font-semibold">{score}/{quiz.questions.length}</p>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                Topic: {quiz.topic}
              </p>
            </>
          ) : (
            <>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Waiting for submission</p>
              <p className="mt-3 text-sm leading-6 text-slate-300">
                Answer the questions, then submit to reveal the score and the correct answers.
              </p>
            </>
          )}
        </div>

        <div className="mt-4 rounded-3xl border border-white/10 bg-slate-950/70 p-5 text-sm leading-6 text-slate-300">
          Quiz generation depends on the Supabase records returned for the topic. If no records are available, the app asks you to add them first.
        </div>
      </aside>
    </section>
  );
}
