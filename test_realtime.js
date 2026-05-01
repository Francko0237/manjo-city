import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'http://localhost:8005';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJhbm9uIiwKICAgICJpc3MiOiAic3VwYWJhc2UtZGVtbyIsCiAgICAiaWF0IjogMTY0MTc2OTIwMCwKICAgICJleHAiOiAxNzk5NTM1NjAwCn0.dc_X5iR_VP_qT0zsiyj_I_OZ2T9FtRU2BBNWN8Bu4GE';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

console.log('Connecting to realtime...');
const channel = supabase.channel('test-channel');

channel.on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, payload => {
  console.log('Received payload:', payload);
}).subscribe((status) => {
  console.log('Status:', status);
  if (status === 'SUBSCRIBED') {
    console.log('Successfully subscribed! You can now test sending a message in the browser.');
  }
});

// keep alive
setInterval(() => {}, 1000);
