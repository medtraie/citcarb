import { createClient } from '@supabase/supabase-js';

export const supabaseUrl = 'https://ntqopfuavrodgfzhzlae.supabase.co';
export const supabaseAnonKey = 'sb_publishable_meut0dXyb41qbn3jCOxthg_thuaxnIW';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
