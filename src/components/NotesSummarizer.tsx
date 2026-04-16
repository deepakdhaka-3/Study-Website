import { useState, type FormEvent } from 'react';
import { AlertTriangle, FileText, WandSparkles } from 'lucide-react';
import { LoadingDots } from './LoadingDots';
import { summarizeNotes } from '@/lib/gemini';
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
      const result = await summarizeNotes(trimmed);
      setSummary(result);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Failed to summarize notes.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_30rem]">
      <div className="rounded-[2rem] border border-purple-500/10 bg-gradient-to-br from-slate-950/80 to-slate-900/60 p-4 shadow-2xl shadow-purple-950/10 backdrop-blur xl:p-6">
        <div className="inline-flex items-center gap-2 rounded-full border border-purple-400/20 bg-purple-400/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.24em] text-purple-200">
          <FileText className="h-3.5 w-3.5" />
          Notes Summarizer
        </div>
        <h2 className="mt-3 text-2xl font-bold text-white">Turn Long Notes into Smart Summaries</h2>
        <p className="mt-1 text-sm text-slate-400">Paste your lecture notes or study material. Study Guru will create a concise summary with key bullet points.</p>

        <form onSubmit={handleSubmit} className="mt-5 space-y-3">
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            rows={13}
            placeholder="Paste your notes here..."
            className="w-full rounded-2xl border border-purple-500/20 bg-purple-950/20 px-4 py-4 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-purple-400/40 focus:bg-purple-950/30 focus:ring-1 focus:ring-purple-500/20"
          />
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 px-4 py-3 text-sm font-bold text-white transition hover:from-purple-400 hover:to-pink-400 disabled:opacity-50"
          >
            <WandSparkles className="h-4 w-4" />
            Summarize Notes
          </button>
          {error ? (
            <div className="flex items-center gap-2 rounded-xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">
              <AlertTriangle className="h-4 w-4" />
              {error}
            </div>
          ) : null}
        </form>
      </div>

      <div className="rounded-[2rem] border border-purple-500/10 bg-gradient-to-br from-purple-950/30 to-slate-950/30 p-4 shadow-2xl shadow-purple-950/10 backdrop-blur xl:p-6">
        <h3 className="text-sm font-bold uppercase tracking-[0.24em] text-purple-300">Summary Output</h3>

        <div className="mt-4 space-y-4">
          {loading ? (
            <div className="rounded-2xl border border-purple-500/20 bg-purple-950/40 p-5 text-slate-300">
              <LoadingDots />
            </div>
          ) : null}

          {summary ? (
            <>
              <div className="rounded-2xl border border-purple-400/20 bg-gradient-to-br from-purple-400/10 to-purple-400/5 p-5 text-slate-100">
                <p className="text-xs uppercase tracking-[0.22em] text-purple-200 font-bold">Short Summary</p>
                <p className="mt-3 text-sm leading-7 text-slate-100">{summary.summary}</p>
              </div>

              <div className="rounded-2xl border border-purple-500/20 bg-purple-950/40 p-5">
                <p className="text-xs uppercase tracking-[0.22em] text-purple-300 font-bold">Key Points</p>
                <ul className="mt-3 space-y-3 text-sm leading-6 text-slate-200">
                  {summary.bullets.map((bullet) => (
                    <li key={bullet} className="flex gap-3">
                      <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-purple-400" />
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </>
          ) : (
            <div className="rounded-2xl border border-dashed border-purple-500/20 bg-purple-950/20 p-8 text-center">
              <FileText className="mx-auto h-10 w-10 text-purple-400/40 mb-3" />
              <p className="text-slate-400 text-sm">Your AI-powered summary will appear here</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
