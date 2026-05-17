import { PropsWithChildren, useEffect, useState } from 'react'
import { useLaunch } from '@tarojs/taro'
import { supabase } from './utils/supabase'
import { useAuth } from './hooks/useAuth'
import './app.scss'

function App({ children }: PropsWithChildren<object>) {
  const [ready, setReady] = useState(false)
  useAuth()

  useLaunch(() => {
    console.log('SkillFlow App launched.')
  })

  useEffect(() => {
    // 还原 OAuth 回调 hash 中的 session
    const saved = sessionStorage.getItem('sb-auth-hash')
    if (saved) {
      sessionStorage.removeItem('sb-auth-hash')
      // 手动设置 hash 让 Supabase 处理
      location.hash = '#' + saved
    }
    // 等 Supabase 恢复 session
    supabase.auth.getSession().then(() => setReady(true))
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      setReady(true)
    })
    const timeout = setTimeout(() => setReady(true), 2000)
    return () => { subscription.unsubscribe(); clearTimeout(timeout) }
  }, [])

  if (!ready) return null
  return children
}

export default App
