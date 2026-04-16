import { useEffect, useState } from 'react';
import { MoonStar, Zap, BookOpen, TrendingUp } from 'lucide-react';
import { Sidebar } from '@/components/Sidebar';
import { ChatAssistant } from '@/components/ChatAssistant';
import { NotesSummarizer } from '@/components/NotesSummarizer';
import { QuizGenerator } from '@/components/QuizGenerator';
import { readStorage, writeStorage } from '@/lib/storage';

type Section = 'chat' | 'summarizer' | 'quiz';

const THEME_KEY = 'study-guru.theme';

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

const features = [
  {
    icon: TrendingUp,
    title: 'Track your learning',
    description: 'Monitor progress with detailed analytics',
  },
  {
    icon: Zap,
    title: 'Instant AI explanations',
    description: 'Get clear answers in seconds',
  },
  {
    icon: BookOpen,
    title: 'Smart revision tools',
    description: 'Create quizzes and summaries effortlessly',
  },
];

export default function App() {
  const [activeSection, setActiveSection] = useState<Section>('chat');
  const { isDark, toggle } = useTheme();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">
      <div className="mx-auto flex min-h-screen max-w-[1600px] flex-col xl:flex-row">
        <Sidebar activeSection={activeSection} onChangeSection={setActiveSection} isDark={isDark} onToggleTheme={toggle} />

        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 xl:p-8">
          <header className="mb-8 flex flex-col gap-4 rounded-[2.5rem] border border-blue-500/10 bg-gradient-to-br from-blue-950/30 via-purple-950/20 to-slate-950/30 p-6 shadow-2xl shadow-blue-950/20 backdrop-blur-xl md:flex-row md:items-start md:justify-between">
            <div className="flex-1">
              <div className="inline-flex items-center gap-2 rounded-full border border-blue-400/30 bg-blue-400/10 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.3em] text-blue-300">
                ✨ Premium Learning Platform
              </div>
              <h2 className="mt-4 text-4xl font-bold tracking-tight text-white leading-tight">Upgrade Your Learning with AI-Powered Study Tools</h2>
              <p className="mt-3 max-w-3xl text-base leading-7 text-slate-300">
                Ask doubts, summarize notes, and generate quizzes — all in one intelligent workspace designed for students.
              </p>
            </div>

            <div className="flex items-center gap-3 rounded-2xl border border-purple-500/20 bg-purple-950/40 px-4 py-3 text-sm text-purple-200 backdrop-blur">
              <MoonStar className="h-4 w-4 text-purple-300" />
              Study Guru AI
            </div>
          </header>

          {activeSection === 'chat' ? <ChatAssistant /> : null}
          {activeSection === 'summarizer' ? <NotesSummarizer /> : null}
          {activeSection === 'quiz' ? <QuizGenerator /> : null}

          {activeSection === 'chat' && (
            <section className="mt-8 grid gap-4 md:grid-cols-3">
              {features.map((feature) => {
                const Icon = feature.icon;
                return (
                  <div
                    key={feature.title}
                    className="group rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02] p-5 backdrop-blur transition hover:border-blue-400/30 hover:bg-blue-950/20"
                  >
                    <div className="mb-3 inline-flex rounded-lg bg-blue-500/10 p-3 group-hover:bg-blue-500/20 transition">
                      <Icon className="h-5 w-5 text-blue-400" />
                    </div>
                    <h3 className="font-semibold text-white">{feature.title}</h3>
                    <p className="mt-1 text-sm text-slate-400">{feature.description}</p>
                  </div>
                );
              })}
            </section>
          )}
        </main>
      </div>
    </div>
  );
}
