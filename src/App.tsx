import { useEffect, useState } from 'react';
import { MoonStar, PanelsTopLeft } from 'lucide-react';
import { Sidebar } from '@/components/Sidebar';
import { ChatAssistant } from '@/components/ChatAssistant';
import { NotesSummarizer } from '@/components/NotesSummarizer';
import { QuizGenerator } from '@/components/QuizGenerator';
import { readStorage, writeStorage } from '@/lib/storage';

type Section = 'chat' | 'summarizer' | 'quiz';

const THEME_KEY = 'study-helper.theme';

function useTheme() {
  const [isDark, setIsDark] = useState(() => readStorage(THEME_KEY, 'dark') === 'dark');

  useEffect(() => {
    const theme = isDark ? 'dark' : 'light';
    document.documentElement.dataset.theme = theme;
    document.documentElement.classList.toggle('dark', isDark);
    writeStorage(THEME_KEY, theme);
  }, [isDark]);

  return { isDark, toggle: () => setIsDark((current) => !current) };
}

export default function App() {
  const [activeSection, setActiveSection] = useState<Section>('chat');
  const { isDark, toggle } = useTheme();

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.18),_transparent_30%),linear-gradient(180deg,_#020617_0%,_#0f172a_100%)] text-white">
      <div className="mx-auto flex min-h-screen max-w-[1600px] flex-col xl:flex-row">
        <Sidebar activeSection={activeSection} onChangeSection={setActiveSection} isDark={isDark} onToggleTheme={toggle} />

        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 xl:p-8">
          <header className="mb-6 flex flex-col gap-4 rounded-[2rem] border border-white/10 bg-white/5 p-5 shadow-2xl shadow-cyan-950/10 backdrop-blur md:flex-row md:items-center md:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.28em] text-slate-300">
                <PanelsTopLeft className="h-3.5 w-3.5" />
                Modern Study Workspace
              </div>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-white">Study smarter with Supabase-backed AI tools</h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
                Chat from Supabase knowledge, summarize notes into revision-friendly bullets, and generate quizzes from the same database ground truth.
              </p>
            </div>

            <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-slate-300">
              <MoonStar className="h-4 w-4 text-cyan-300" />
              Gemini 2.5 Flash + Supabase
            </div>
          </header>

          {activeSection === 'chat' ? <ChatAssistant /> : null}
          {activeSection === 'summarizer' ? <NotesSummarizer /> : null}
          {activeSection === 'quiz' ? <QuizGenerator /> : null}
        </main>
      </div>
    </div>
  );
}
