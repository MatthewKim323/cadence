import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://qxsjkixxzrbskvluclip.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF4c2praXh4enJic2t2bHVjbGlwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUzMjEzMjUsImV4cCI6MjA5MDg5NzMyNX0.SbeMkClzKbmZKVUpqiCQER9dtvDKA6UEkJYLMqBUgAs'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
