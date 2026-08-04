import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Database } from '../types/database.types';

import { Platform } from 'react-native';

const SUPABASE_URL = 'https://xaeilrwacevfemvrvvmv.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhhZWlscndhY2V2ZmVtdnJ2dm12Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU3NjgwNTMsImV4cCI6MjEwMTM0NDA1M30.Grn0H-Ixg8hDOCgrCHv9FaD2AdoL37JE9ZaD85X3OzA';

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    ...(Platform.OS !== 'web' ? { storage: AsyncStorage } : {}),
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === 'web',
  },
});
