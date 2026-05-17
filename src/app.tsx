import { PropsWithChildren } from 'react'
import { useLaunch } from '@tarojs/taro'
import { useAuth } from './hooks/useAuth'
import './app.scss'

function App({ children }: PropsWithChildren<object>) {
  useAuth()

  useLaunch(() => {
    console.log('SkillFlow App launched.')
  })

  return children
}

export default App
