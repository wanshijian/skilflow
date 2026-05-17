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
    // 处理 OAuth 回调 — 等 Supabase 从 hash 中恢复 session 后再渲染
    supabase.auth.getSession().then(() => setReady(true))
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      setReady(true)
    })
    // 兜底：1.5秒后无论如何都渲染
    const timeout = setTimeout(() => setReady(true), 1500)
    return () => { subscription.unsubscribe(); clearTimeout(timeout) }
  }, [])

  if (!ready) return null
  return children
}

export default App
