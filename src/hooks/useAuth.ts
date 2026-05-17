import { useEffect } from 'react'
import Taro from '@tarojs/taro'
import { supabase } from '../utils/supabase'
import { useAuthStore } from '../stores/authStore'

export function useAuth() {
  const { user, isAuthenticated, isLoading, setUser, setLoading } = useAuthStore()

  useEffect(() => {
    // 获取当前 session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        loadProfile(session.user.id)
      } else {
        setLoading(false)
      }
    })

    // 监听认证状态变化
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        loadProfile(session.user.id)
      } else {
        setUser(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function loadProfile(userId: string) {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (data) {
      setUser({
        id: data.id,
        email: data.email,
        nickname: data.nickname,
        avatar: data.avatar,
        role: data.role
      })
    } else {
      setLoading(false)
    }
  }

  async function signInWithGitHub() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: { redirectTo: window.location.origin + '/skilflow' }
    })
    if (error) {
      Taro.showToast({ title: '登录失败', icon: 'none' })
    }
  }

  // 小程序端微信登录
  async function signInWithWechat() {
    // #ifdef WEAPP
    try {
      const { code } = await Taro.login()
      const { data, error } = await supabase.functions.invoke('wechat-auth', {
        body: { code }
      })
      if (error) throw error
      // 使用返回的 token 设置 session
    } catch (err) {
      Taro.showToast({ title: '微信登录失败', icon: 'none' })
    }
    // #endif
  }

  return {
    user,
    isAuthenticated,
    isLoading,
    signInWithGitHub,
    signInWithWechat
  }
}
