import { PropsWithChildren } from 'react'
import { useLaunch } from '@tarojs/taro'
import './app.scss'

function App({ children }: PropsWithChildren<object>) {
  useLaunch(() => {
    console.log('SkillFlow App launched.')
  })

  return children
}

export default App
