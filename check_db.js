import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ntqopfuavrodgfzhzlae.supabase.co';
const supabaseAnonKey = 'sb_publishable_meut0dXyb41qbn3jCOxthg_thuaxnIW';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function check() {
  const { data: barrels, error: err1 } = await supabase.from('barrels').select('*');
  console.log('BARRELS IN DB:', barrels);
  if (err1) console.error('Error barrels:', err1);

  const { data: profiles, error: err2 } = await supabase.from('profiles').select('*');
  console.log('PROFILES IN DB:', profiles);
  if (err2) console.error('Error profiles:', err2);
}

check();
