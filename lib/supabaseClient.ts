
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://udpjabprmyvhmbqsmins.supabase.co';
const SUPABASE_KEY = 'sb_publishable_Q2UEv3eri5Aiq1eX8-PUvw_cSzLRNP7';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
