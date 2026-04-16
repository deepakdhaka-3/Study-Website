import { Lightbulb, MessageCircle, FileText, Brain, MoonStar, SunMedium } from 'lucide-react';
import clsx from 'clsx';

type Section = 'chat' | 'summarizer' | 'quiz';

const items = [
  { id: 'chat', label: 'Ask Doubts', icon: MessageCircle },
  { id: 'summarizer', label: 'Notes Summarizer', icon: FileText },
  { id: 'quiz', label: 'Quiz', icon: Brain },
] as const;

type SidebarProps = {
  activeSection: Section;
  onChangeSection: (section: Section) => void;
  isDark: boolean;
  onToggleTheme: () => void;
};

export function Sidebar({ activeSection, onChangeSection, isDark, onToggleTheme }: SidebarProps) {
  return (
    <aside className="flex w-full flex-col gap-6 border-b border-blue-500/10 bg-gradient-to-b from-slate-950 to-slate-900/80 p-4 backdrop-blur xl:h-screen xl:w-80 xl:border-b-0 xl:border-r xl:p-6">
      <div className="rounded-2xl border border-blue-500/20 bg-gradient-to-br from-blue-500/15 via-purple-500/10 to-slate-950/30 p-5 shadow-xl shadow-blue-950/30">
        <div className="inline-flex rounded-xl bg-gradient-to-r from-blue-500/20 to-purple-500/20 px-3 py-1 text-xs font-bold uppercase tracking-[0.3em] text-blue-300">
          🚀 Study Guru
        </div>
        <h1 className="mt-4 text-2xl font-bold tracking-tight text-white">Don't Fear — Study Guru Is Here to Make Learning Easy</h1>
        <p className="mt-2 text-xs leading-6 text-blue-200 font-medium">
          Powered by Advanced AI for Students
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
              onClick={() => onChangeSection(item.id as Section)}
              className={clsx(
                'flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition duration-200 ease-out font-medium',
                active
                  ? 'border-blue-400/40 bg-gradient-to-r from-blue-400/15 to-purple-400/10 text-white shadow-lg shadow-blue-500/20'
                  : 'border-white/10 bg-white/5 text-slate-300 hover:border-blue-400/30 hover:bg-blue-950/20 hover:text-white',
              )}
            >
              <Icon className="h-5 w-5 flex-shrink-0" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <button
        type="button"
        onClick={onToggleTheme}
        className="mt-auto inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-slate-200 transition hover:border-blue-400/30 hover:bg-blue-950/20"
      >
        {isDark ? <SunMedium className="h-4 w-4" /> : <MoonStar className="h-4 w-4" />}
        {isDark ? 'Light mode' : 'Dark mode'}
      </button>
    </aside>
  );
}
