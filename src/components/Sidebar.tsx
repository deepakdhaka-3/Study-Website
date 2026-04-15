import { BookOpen, BrainCircuit, MessageSquareText, MoonStar, SunMedium } from 'lucide-react';
import clsx from 'clsx';

type Section = 'chat' | 'summarizer' | 'quiz';

const items = [
  { id: 'chat', label: 'Chat', icon: MessageSquareText },
  { id: 'summarizer', label: 'Summarizer', icon: BookOpen },
  { id: 'quiz', label: 'Quiz', icon: BrainCircuit },
] as const;

type SidebarProps = {
  activeSection: Section;
  onChangeSection: (section: Section) => void;
  isDark: boolean;
  onToggleTheme: () => void;
};

export function Sidebar({ activeSection, onChangeSection, isDark, onToggleTheme }: SidebarProps) {
  return (
    <aside className="flex w-full flex-col gap-6 border-b border-white/10 bg-slate-950/80 p-4 backdrop-blur xl:h-screen xl:w-80 xl:border-b-0 xl:border-r xl:p-6">
      <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-cyan-500/15 via-sky-500/10 to-indigo-500/10 p-5 shadow-glow">
        <div className="inline-flex rounded-2xl bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-sky-200">
          AI Study Helper
        </div>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight text-white">Learn faster with DB-grounded answers</h1>
        <p className="mt-2 text-sm leading-6 text-slate-300">
          Search Supabase first, then let Gemini 2.5 Flash explain, summarize, or quiz from the returned context.
        </p>
      </div>

      <nav className="flex flex-col gap-2">
        {items.map((item) => {
          const Icon = item.icon;
          const active = activeSection === item.id;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onChangeSection(item.id)}
              className={clsx(
                'flex items-center gap-3 rounded-2xl border px-4 py-3 text-left transition duration-200 ease-out',
                active
                  ? 'border-cyan-400/40 bg-cyan-400/15 text-white shadow-glow'
                  : 'border-white/10 bg-white/5 text-slate-300 hover:border-white/20 hover:bg-white/10 hover:text-white',
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="font-medium">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <button
        type="button"
        onClick={onToggleTheme}
        className="mt-auto inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-slate-200 transition hover:border-white/20 hover:bg-white/10"
      >
        {isDark ? <SunMedium className="h-4 w-4" /> : <MoonStar className="h-4 w-4" />}
        {isDark ? 'Light mode' : 'Dark mode'}
      </button>
    </aside>
  );
}
