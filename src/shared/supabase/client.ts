import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase env vars are empty. Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Falling back to dummy values for DEV mode.');
}

// createClient throws an error if the URL is not valid. 
// We provide a syntactically valid URL dummy if the env vars are missing, 
// so the UI can still render and we can test the DEV fallback logic.
export const supabase = createClient(
    supabaseUrl || 'https://dummy-project.supabase.co',
    supabaseAnonKey || 'dummy-anon-key'
);
