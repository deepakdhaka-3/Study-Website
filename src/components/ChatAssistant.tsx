import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { AlertTriangle, SendHorizonal, Sparkles } from 'lucide-react';
import type { ChatMessage, KnowledgeEntry } from '@/types';
import { LoadingDots } from './LoadingDots';
import { answerWithGroundTruth } from '@/lib/gemini';
import { chatSystemPrompt } from '@/lib/prompts';
import { searchKnowledgeEntries } from '@/lib/supabase';
import { readStorage, writeStorage } from '@/lib/storage';

const CHAT_HISTORY_KEY = 'study-helper.chat-history';

function formatKnowledgeContext(entries: KnowledgeEntry[]) {
  return entries
    .map((entry, index) => {
      const topic = entry.topic ? `Topic: ${entry.topic}` : 'Topic: not set';
      const source = entry.source_label ? `Source: ${entry.source_label}` : 'Source: Supabase';

      return [
        `Record ${index + 1}`,
        topic,
        source,
        `Question: ${entry.question}`,
        `Answer: ${entry.answer}`,
      ].join('\n');
    })
    .join('\n\n');
}

export function ChatAssistant() {
  const [messages, setMessages] = useState<ChatMessage[]>(() => readStorage(CHAT_HISTORY_KEY, [] as ChatMessage[]));
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [sources, setSources] = useState<KnowledgeEntry[]>([]);

  useEffect(() => {
    writeStorage(CHAT_HISTORY_KEY, messages);
  }, [messages]);

  const placeholder = useMemo(
    () => 'Ask about a course concept, exam topic, study method, or anything stored in Supabase...',
    [],
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const question = input.trim();
    if (!question) {
      setError('Please type a question first.');
      return;
    }

    setError('');
    setInput('');
    setIsLoading(true);

    const nextMessages: ChatMessage[] = [...messages, { id: crypto.randomUUID(), role: 'user', content: question }];
    setMessages(nextMessages);

    try {
      const entries = await searchKnowledgeEntries(question, 6);
      setSources(entries);

      if (entries.length === 0) {
        setMessages((current) => [
          ...current,
          {
            id: crypto.randomUUID(),
            role: 'assistant',
            content:
              'I could not find a matching answer in the Supabase database. Please add a relevant knowledge entry or try a narrower question.',
          },
        ]);
        return;
      }

      const context = formatKnowledgeContext(entries);
      const response = await answerWithGroundTruth(
        `User question: ${question}\n\nDatabase context:\n${context}\n\nRespond only from the database context. If the evidence is partial, say so politely.`,
        chatSystemPrompt,
      );

      setMessages((current) => [...current, { id: crypto.randomUUID(), role: 'assistant', content: response }]);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Something went wrong while answering the question.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_18rem]">
      <div className="rounded-[2rem] border border-white/10 bg-slate-950/70 p-4 shadow-2xl shadow-cyan-950/20 backdrop-blur xl:p-6">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200">
              <Sparkles className="h-3.5 w-3.5" />
              Chat Assistant
            </div>
            <h2 className="mt-3 text-2xl font-semibold text-white">Ask any academic question</h2>
            <p className="mt-1 text-sm text-slate-400">The assistant only answers from Supabase records, then uses Gemini to explain them clearly.</p>
          </div>
        </div>

        <div className="mb-4 max-h-[58vh] space-y-4 overflow-y-auto pr-1">
          {messages.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-white/10 bg-white/[0.03] p-8 text-center text-slate-400">
              Start with a question about biology, mathematics, programming, or any study topic stored in your database.
            </div>
          ) : null}

          {messages.map((message) => (
            <article
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-3xl px-4 py-3 text-sm leading-6 shadow-lg ${
                  message.role === 'user'
                    ? 'bg-cyan-500 text-slate-950'
                    : 'border border-white/10 bg-slate-900/90 text-slate-100'
                }`}
              >
                <p className="whitespace-pre-wrap">{message.content}</p>
              </div>
            </article>
          ))}

          {isLoading ? (
            <article className="flex justify-start">
              <div className="rounded-3xl border border-white/10 bg-slate-900/90 px-4 py-3">
                <LoadingDots />
              </div>
            </article>
          ) : null}
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="relative">
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder={placeholder}
              rows={3}
              className="w-full resize-none rounded-3xl border border-white/10 bg-white/5 px-4 py-4 pr-14 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-400/40 focus:bg-white/8"
            />
            <button
              type="submit"
              disabled={isLoading}
              className="absolute bottom-4 right-4 inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-400 text-slate-950 transition hover:bg-cyan-300 disabled:opacity-50"
            >
              <SendHorizonal className="h-4 w-4" />
            </button>
          </div>
          {error ? (
            <div className="flex items-center gap-2 rounded-2xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">
              <AlertTriangle className="h-4 w-4" />
              {error}
            </div>
          ) : null}
        </form>
      </div>

      <aside className="rounded-[2rem] border border-white/10 bg-white/5 p-4 shadow-2xl shadow-cyan-950/10 backdrop-blur xl:p-5">
        <h3 className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-400">Retrieved context</h3>
        <div className="mt-4 space-y-3">
          {sources.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 bg-slate-950/50 p-4 text-sm text-slate-400">
              Matches from Supabase will appear here before the AI answers.
            </div>
          ) : (
            sources.map((entry) => (
              <div key={entry.id} className="rounded-2xl border border-white/10 bg-slate-950/70 p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-cyan-300">{entry.topic || 'General'}</p>
                <p className="mt-2 text-sm font-medium text-white">{entry.question}</p>
                <p className="mt-2 text-sm leading-6 text-slate-300">{entry.answer}</p>
              </div>
            ))
          )}
        </div>
      </aside>
    </section>
  );
}
