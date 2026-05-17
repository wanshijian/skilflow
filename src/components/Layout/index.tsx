import { View } from '@tarojs/components'
import { PropsWithChildren } from 'react'
import Header from '../Header'
import MobileNav from '../MobileNav'
import './index.scss'

interface LayoutProps { className?: string }

export default function Layout({ children, className = '' }: PropsWithChildren<LayoutProps>) {
  return (
    <View className={`layout ${className}`}>
      <Header />
      <View className="layout__content">{children}</View>
      <MobileNav />
    </View>
  )
}
