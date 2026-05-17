import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL || ''
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || ''

const isConfigured = supabaseUrl && supabaseAnonKey && supabaseUrl !== 'https://your-project.supabase.co'

const mockClient = {
  from: () => mockClient,
  select: () => mockClient,
  eq: () => mockClient,
  order: () => mockClient,
  range: () => mockClient,
  contains: () => mockClient,
  single: () => mockClient,
  textSearch: () => mockClient,
  insert: () => mockClient,
  update: () => mockClient,
  upsert: () => mockClient,
  then: (cb: any) => Promise.resolve(cb({ data: [], error: null, count: 0 })),
  auth: {
    getSession: () => Promise.resolve({ data: { session: null }, error: null }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    signInWithOAuth: () => Promise.resolve({ error: null })
  },
  functions: {
    invoke: () => Promise.resolve({ data: null, error: null })
  },
  rpc: () => ({ then: (cb: any) => Promise.resolve(cb({ data: 0, error: null })) })
}

export const supabase = isConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : mockClient

// Edge Functions 调用封装
export async function invokeEdgeFunction<T = unknown>(
  name: string,
  payload: Record<string, unknown> = {}
): Promise<T> {
  const { data, error } = await supabase.functions.invoke<T>(name, {
    body: payload
  })
  if (error) throw error
  return data as T
}
