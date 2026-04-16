import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { AlertTriangle, SendHorizonal, Sparkles, BookMarked, Lightbulb, Zap } from 'lucide-react';
import type { ChatMessage } from '@/types';
import { LoadingDots } from './LoadingDots';
import { askDoubt } from '@/lib/gemini';
import { readStorage, writeStorage } from '@/lib/storage';
import { appendChatSessionMemory, getChatSessionMemory, isSupabaseConfigured } from '@/lib/supabase';

const CHAT_HISTORY_KEY = 'study-guru.chat-history';
const CHAT_SESSION_KEY = 'study-guru.chat-session-id';

const actionSuggestions = [
  { icon: BookMarked, label: 'Summarize this', color: 'from-purple-500/20 to-purple-500/5' },
  { icon: Lightbulb, label: 'Explain simply', color: 'from-yellow-500/20 to-yellow-500/5' },
  { icon: Zap, label: 'Make quiz', color: 'from-blue-500/20 to-blue-500/5' },
];

export function ChatAssistant() {
  const [messages, setMessages] = useState<ChatMessage[]>(() => readStorage(CHAT_HISTORY_KEY, [] as ChatMessage[]));
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncingHistory, setIsSyncingHistory] = useState(false);
  const [error, setError] = useState('');

  const [sessionId] = useState(() => {
    const saved = readStorage(CHAT_SESSION_KEY, '');
    if (saved) {
      return saved;
    }

    const next = crypto.randomUUID();
    writeStorage(CHAT_SESSION_KEY, next);
    return next;
  });

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      return;
    }

    let active = true;

    async function loadSessionHistory() {
      setIsSyncingHistory(true);
      const remoteMessages = await getChatSessionMemory(sessionId);

      if (!active || remoteMessages.length === 0) {
        setIsSyncingHistory(false);
        return;
      }

      setMessages(remoteMessages);
      writeStorage(CHAT_HISTORY_KEY, remoteMessages);
      setIsSyncingHistory(false);
    }

    void loadSessionHistory();

    return () => {
      active = false;
    };
  }, [sessionId]);

  useEffect(() => {
    writeStorage(CHAT_HISTORY_KEY, messages);
  }, [messages]);

  const placeholder = useMemo(
    () => 'Type your doubt... get clear, instant explanations',
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

    void appendChatSessionMemory(sessionId, nextMessages[nextMessages.length - 1]);

    try {
      const response = await askDoubt(question);

      const assistantMessage: ChatMessage = { id: crypto.randomUUID(), role: 'assistant', content: response };
      setMessages((current) => [...current, assistantMessage]);

      void appendChatSessionMemory(sessionId, assistantMessage);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  function handleActionClick(action: string) {
    const enhancedQuestion = `${action}: ${input || 'the current topic'}`;
    setInput(enhancedQuestion);
  }

  return (
    <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="rounded-[2rem] border border-blue-500/10 bg-gradient-to-br from-slate-950/80 to-slate-900/60 p-4 shadow-2xl shadow-blue-950/10 backdrop-blur xl:p-6">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-400/20 bg-blue-400/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.24em] text-blue-200">
              <Sparkles className="h-3.5 w-3.5" />
              Ask Doubts
            </div>
            <h2 className="mt-3 text-2xl font-bold text-white">Ask Your Doubts Instantly</h2>
            <p className="mt-1 text-sm text-slate-400">Get clear, instant explanations from Study Guru AI.</p>
          </div>
        </div>

        <div className="mb-4 max-h-[58vh] space-y-4 overflow-y-auto pr-1">
          {isSyncingHistory ? (
            <div className="rounded-2xl border border-blue-500/20 bg-blue-950/30 px-4 py-3 text-xs text-blue-200">
              Syncing your session memory from Supabase...
            </div>
          ) : null}

          {messages.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-blue-500/20 bg-blue-950/30 p-8 text-center">
              <Sparkles className="mx-auto h-12 w-12 text-blue-400/40 mb-3" />
              <p className="text-slate-400 text-sm">Start your learning journey! Ask any doubt and get instant AI-powered explanations.</p>
            </div>
          ) : null}

          {messages.map((message) => (
            <article
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-6 shadow-lg ${
                  message.role === 'user'
                    ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white'
                    : 'border border-blue-500/20 bg-blue-950/40 text-slate-100'
                }`}
              >
                <p className="whitespace-pre-wrap">{message.content}</p>
              </div>
            </article>
          ))}

          {isLoading ? (
            <article className="flex justify-start">
              <div className="rounded-2xl border border-blue-500/20 bg-blue-950/40 px-4 py-3">
                <LoadingDots />
              </div>
            </article>
          ) : null}
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {messages.length > 0 && !isLoading && (
            <div className="flex gap-2 pb-2">
              {actionSuggestions.map((action) => {
                const Icon = action.icon;
                return (
                  <button
                    key={action.label}
                    type="button"
                    onClick={() => handleActionClick(action.label)}
                    className={`inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-gradient-to-r ${action.color} px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:border-blue-400/30 hover:bg-blue-950/20`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {action.label}
                  </button>
                );
              })}
            </div>
          )}
          <div className="relative">
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder={placeholder}
              rows={3}
              className="w-full resize-none rounded-2xl border border-blue-500/20 bg-blue-950/20 px-4 py-4 pr-14 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-blue-400/40 focus:bg-blue-950/30 focus:ring-1 focus:ring-blue-500/20"
            />
            <button
              type="submit"
              disabled={isLoading}
              className="absolute bottom-4 right-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 text-white transition hover:from-blue-400 hover:to-purple-400 disabled:opacity-50"
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

      <aside className="rounded-[2rem] border border-blue-500/10 bg-gradient-to-br from-blue-950/30 to-slate-950/30 p-4 shadow-2xl shadow-blue-950/10 backdrop-blur xl:p-5">
        <h3 className="text-sm font-bold uppercase tracking-[0.24em] text-blue-300">Smart Insights</h3>
        <p className="mt-1 text-xs text-slate-400">Helpful study tips and question patterns to improve understanding.</p>
        <div className="mt-4 space-y-3">
          <div className="rounded-xl border border-blue-500/20 bg-blue-950/40 p-4 backdrop-blur">
            <p className="text-xs uppercase tracking-[0.22em] text-blue-300 font-bold">Ask Better Questions</p>
            <p className="mt-2 text-xs leading-5 text-slate-300">Include topic + what confuses you + one example for clearer answers.</p>
          </div>
          <div className="rounded-xl border border-blue-500/20 bg-blue-950/40 p-4 backdrop-blur">
            <p className="text-xs uppercase tracking-[0.22em] text-blue-300 font-bold">Revision Trick</p>
            <p className="mt-2 text-xs leading-5 text-slate-300">After each answer, ask for a 3-point recap to remember faster.</p>
          </div>
          <div className="rounded-xl border border-blue-500/20 bg-blue-950/40 p-4 backdrop-blur">
            <p className="text-xs uppercase tracking-[0.22em] text-blue-300 font-bold">Practice Loop</p>
            <p className="mt-2 text-xs leading-5 text-slate-300">Use: Explain simply → Example → Mini quiz for strong understanding.</p>
          </div>
        </div>
      </aside>
    </section>
  );
}
