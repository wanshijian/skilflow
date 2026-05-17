import { useCallback } from 'react'
import Taro from '@tarojs/taro'
import { supabase, invokeEdgeFunction } from '../utils/supabase'
import { useAppStore } from '../stores/appStore'
import { useAuthStore } from '../stores/authStore'

export function useAppFactory() {
  const {
    flowStep, currentPrompt, currentLanguage, currentApp,
    generatedCode, sandboxResult, quota, remainingQuota,
    setFlowStep, setPrompt, setLanguage, setCurrentApp,
    setGeneratedCode, setSandboxResult, setQuota, setRemainingQuota, reset
  } = useAppStore()
  const { user, isAuthenticated } = useAuthStore()

  // 加载用户配额
  const loadQuota = useCallback(async () => {
    if (!user?.id) return
    const remaining = await supabase.rpc('get_user_remaining_quota', { uid: user.id })
    setRemainingQuota(remaining.data || 0)

    const { data } = await supabase.from('user_quotas').select('*').eq('user_id', user.id).single()
    if (data) setQuota(data)
  }, [user])

  // 生成应用
  const generateApp = useCallback(async (prompt: string, language: string = 'python') => {
    if (!isAuthenticated) {
      Taro.showToast({ title: '请先登录', icon: 'none' })
      return
    }

    if (!prompt.trim()) {
      Taro.showToast({ title: '请输入需求描述', icon: 'none' })
      return
    }

    setPrompt(prompt)
    setLanguage(language)
    setFlowStep('generating')

    try {
      const result = await invokeEdgeFunction<{
        success: boolean
        app: any
        code: string
        language: string
        error?: string
      }>('code-gen', {
        prompt: prompt.trim(),
        language,
        userId: user!.id
      })

      if (result.error === 'NO_QUOTA') {
        setFlowStep('failed')
        Taro.showModal({
          title: '配额不足',
          content: '今日免费次数已用完。购买次数或分享给好友获取额外配额。',
          confirmText: '去购买',
          success: (res) => {
            if (res.confirm) {
              Taro.navigateTo({ url: '/pages/user/index?tab=upgrade' })
            }
          }
        })
        return
      }

      if (result.success && result.app) {
        setCurrentApp(result.app)
        setGeneratedCode(result.code)
        setFlowStep('done')
        await loadQuota()
        Taro.showToast({ title: '代码生成成功！', icon: 'success' })
      } else {
        throw new Error(result.error || '生成失败')
      }
    } catch (err) {
      setFlowStep('failed')
      Taro.showToast({
        title: (err as Error).message || '生成失败，请重试',
        icon: 'none'
      })
    }
  }, [isAuthenticated, user, loadQuota])

  // 沙箱测试代码
  const testInSandbox = useCallback(async (code: string, language: string) => {
    setFlowStep('testing')
    try {
      const result = await invokeEdgeFunction<{
        success: boolean
        stdout: string
        stderr: string
        error?: string
      }>('sandbox', {
        code,
        language,
        appId: currentApp?.id
      })
      setSandboxResult(result)
      setFlowStep('done')

      if (result.success) {
        Taro.showToast({ title: '测试通过！', icon: 'success' })
      } else {
        Taro.showToast({ title: '测试发现问题，请查看结果', icon: 'none' })
      }
    } catch {
      setSandboxResult({ success: false, stdout: '', stderr: '', error: '沙箱服务暂不可用' })
      setFlowStep('done')
      Taro.showToast({ title: '沙箱服务暂不可用', icon: 'none' })
    }
  }, [currentApp])

  // 分享获取配额
  const shareForQuota = useCallback(async () => {
    if (!user?.id) return
    const { data: success } = await supabase.rpc('add_share_quota', { uid: user.id })
    if (success) {
      await loadQuota()
      Taro.showToast({ title: '分享成功，+1 次配额！', icon: 'success' })
    } else {
      Taro.showToast({ title: '今日分享奖励已达上限', icon: 'none' })
    }
  }, [user, loadQuota])

  return {
    flowStep,
    currentPrompt,
    currentLanguage,
    currentApp,
    generatedCode,
    sandboxResult,
    quota,
    remainingQuota,
    generateApp,
    testInSandbox,
    shareForQuota,
    loadQuota,
    reset,
    setPrompt,
    setLanguage
  }
}
