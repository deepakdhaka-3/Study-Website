import { useState, type FormEvent } from 'react';
import { AlertTriangle, FileText, WandSparkles } from 'lucide-react';
import { LoadingDots } from './LoadingDots';
import { summarizeNotes } from '@/lib/gemini';
import { summarySystemPrompt } from '@/lib/prompts';
import type { SummaryResult } from '@/types';

export function NotesSummarizer() {
  const [notes, setNotes] = useState('');
  const [summary, setSummary] = useState<SummaryResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmed = notes.trim();
    if (!trimmed) {
      setError('Paste some notes before summarizing.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const result = await summarizeNotes(trimmed, summarySystemPrompt);
      setSummary(result);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Failed to summarize notes.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_30rem]">
      <div className="rounded-[2rem] border border-white/10 bg-slate-950/70 p-4 shadow-2xl shadow-cyan-950/20 backdrop-blur xl:p-6">
        <div className="inline-flex items-center gap-2 rounded-full border border-fuchsia-400/20 bg-fuchsia-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-fuchsia-200">
          <FileText className="h-3.5 w-3.5" />
          Notes Summarizer
        </div>
        <h2 className="mt-3 text-2xl font-semibold text-white">Turn long notes into a short study summary</h2>
        <p className="mt-1 text-sm text-slate-400">Paste lecture notes or a long passage. Gemini creates a concise summary with bullet points.</p>

        <form onSubmit={handleSubmit} className="mt-5 space-y-3">
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            rows={13}
            placeholder="Paste your notes here..."
            className="w-full rounded-[1.75rem] border border-white/10 bg-white/5 px-4 py-4 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-fuchsia-400/40 focus:bg-white/8"
          />
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-2xl bg-fuchsia-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-fuchsia-400 disabled:opacity-50"
          >
            <WandSparkles className="h-4 w-4" />
            Summarize notes
          </button>
          {error ? (
            <div className="flex items-center gap-2 rounded-2xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">
              <AlertTriangle className="h-4 w-4" />
              {error}
            </div>
          ) : null}
        </form>
      </div>

      <div className="rounded-[2rem] border border-white/10 bg-white/5 p-4 shadow-2xl shadow-cyan-950/10 backdrop-blur xl:p-6">
        <h3 className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-400">Summary output</h3>

        <div className="mt-4 space-y-4">
          {loading ? (
            <div className="rounded-3xl border border-white/10 bg-slate-950/60 p-5 text-slate-300">
              <LoadingDots />
            </div>
          ) : null}

          {summary ? (
            <>
              <div className="rounded-3xl border border-cyan-400/20 bg-cyan-400/10 p-5 text-slate-100">
                <p className="text-xs uppercase tracking-[0.22em] text-cyan-200">Short summary</p>
                <p className="mt-3 text-sm leading-7 text-slate-100">{summary.summary}</p>
              </div>

              <div className="rounded-3xl border border-white/10 bg-slate-950/70 p-5">
                <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Bullet points</p>
                <ul className="mt-3 space-y-3 text-sm leading-6 text-slate-200">
                  {summary.bullets.map((bullet) => (
                    <li key={bullet} className="flex gap-3">
                      <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-fuchsia-400" />
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </>
          ) : (
            <div className="rounded-3xl border border-dashed border-white/10 bg-slate-950/50 p-6 text-sm leading-6 text-slate-400">
              Your summary will appear here. The output is optimized for fast revision and memory recall.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
