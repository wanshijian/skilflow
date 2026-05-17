/// <reference types="@tarojs/taro" />

declare module '*.png'
declare module '*.gif'
declare module '*.jpg'
declare module '*.jpeg'
declare module '*.svg'
declare module '*.css'
declare module '*.less'
declare module '*.scss'
declare module '*.sass'
declare module '*.styl'

declare namespace NodeJS {
  interface ProcessEnv {
    TARO_ENV: 'weapp' | 'swan' | 'alipay' | 'h5' | 'rn' | 'tt' | 'qq' | 'jd'
    SUPABASE_URL: string
    SUPABASE_ANON_KEY: string
    SUPABASE_SERVICE_ROLE_KEY: string
    GEMINI_API_KEY: string
    WECHAT_APPID: string
    WECHAT_SECRET: string
  }
}

// Taro 页面配置类型
declare function definePageConfig(config: Record<string, unknown>): Record<string, unknown>
declare function defineAppConfig(config: Record<string, unknown>): Record<string, unknown>
