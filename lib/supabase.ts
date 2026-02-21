import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://xnawoaqcctgzrbexlsat.supabase.co';
const supabaseKey = 'sb_publishable_RxerIgqK9TxRJUFwcwxZAA_8xBWaZZg';

export const supabase = createClient(supabaseUrl, supabaseKey);