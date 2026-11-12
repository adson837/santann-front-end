import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://qhowtpcjkayhmvytwjsq.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFob3d0cGNqa3F5aG12eXR3anNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQyNTc5OTYsImV4cCI6MjEwOTgzMzk5Nn0.mpbkuSJlX8QKtXMEBzAC5Nl7WVQ-JdPpFFzQID9w5Nw'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)