import { createClient } from '@supabase/supabase-js';
import type { KnowledgeEntry } from '@/types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

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
