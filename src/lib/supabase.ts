import { createClient } from '@supabase/supabase-js';
import type { KnowledgeEntry } from '@/types';
import type { ChatMessage } from '@/types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

export function isSupabaseConfigured() {
  return Boolean(supabase);
}

type ChatMemoryRow = {
  id: string;
  session_id: string;
  role: ChatMessage['role'];
  content: string;
  created_at: string;
};

export async function getChatSessionMemory(sessionId: string): Promise<ChatMessage[]> {
  if (!supabase) {
    return [];
  }

  const cleanedSessionId = sessionId.trim();
  if (!cleanedSessionId) {
    return [];
  }

  const result = await supabase
    .from('chat_memory')
    .select('id, session_id, role, content, created_at')
    .eq('session_id', cleanedSessionId)
    .order('created_at', { ascending: true });

  if (result.error || !Array.isArray(result.data)) {
    return [];
  }

  return (result.data as ChatMemoryRow[]).map((row) => ({
    id: row.id,
    role: row.role,
    content: row.content,
  }));
}

export async function appendChatSessionMemory(sessionId: string, message: ChatMessage): Promise<void> {
  if (!supabase) {
    return;
  }

  const cleanedSessionId = sessionId.trim();
  const content = message.content.trim();

  if (!cleanedSessionId || !content) {
    return;
  }

  await supabase.from('chat_memory').insert({
    session_id: cleanedSessionId,
    role: message.role,
    content,
  });
}

export async function searchKnowledgeEntries(query: string, limit = 6): Promise<KnowledgeEntry[]> {
  if (!supabase) {
    throw new Error('Missing Supabase environment variables. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.');
  }

  const trimmed = query.trim();

  if (!trimmed) {
    return [];
  }

  const rpcResult = await supabase.rpc('search_knowledge_entries', {
    query_text: trimmed,
    match_limit: limit,
  });

  if (!rpcResult.error && Array.isArray(rpcResult.data)) {
    return rpcResult.data as KnowledgeEntry[];
  }

  const fallback = await supabase
    .from('knowledge_entries')
    .select('id, question, answer, topic, source_label, confidence, updated_at')
    .or(`question.ilike.%${trimmed}%,answer.ilike.%${trimmed}%,topic.ilike.%${trimmed}%`)
    .limit(limit);

  if (fallback.error || !fallback.data) {
    return [];
  }

  return fallback.data as KnowledgeEntry[];
}
