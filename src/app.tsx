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

    // 干掉 Taro 动态 font-size（桌面端限制在 750px 的元凶）
    // Taro 注入的脚本会持续用 resize 改 html font-size，必须反复覆盖
    const fixFontSize = () => {
      document.documentElement.style.fontSize = '16px'
    }
    fixFontSize()
    const id = setInterval(fixFontSize, 200)
    setTimeout(() => clearInterval(id), 3000)
  }, [])

  return children
}

export default App
