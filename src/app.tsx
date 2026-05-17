import { PropsWithChildren, useEffect } from 'react'
import { useLaunch } from '@tarojs/taro'
import { supabase } from './utils/supabase'
import { useAuth } from './hooks/useAuth'
import './app.scss'

function App({ children }: PropsWithChildren<object>) {
  useAuth()

  useLaunch(() => {
    console.log('SkillFlow App launched.')
  })

  useEffect(() => {
    // 还原 OAuth 回调 hash 中的 session
    const saved = sessionStorage.getItem('sb-auth-hash')
    if (saved) {
      sessionStorage.removeItem('sb-auth-hash')
      location.hash = saved.startsWith('#') ? saved : '#' + saved
    }
  }, [])

  return children
}

export default App
