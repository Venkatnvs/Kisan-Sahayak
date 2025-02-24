import PageContainer from '@/components/layout/PageContainer'
import TextHeader from '@/components/PageHeaders/TextHeader'
import React from 'react'
import LiveControlPage from './components/LiveControlPage'

const ControlPage = () => {
  return (
    <PageContainer scrollable>
      <TextHeader title='Control Page' description='This page is for controlling the robot' />
      <LiveControlPage />
    </PageContainer>
  )
}

export default ControlPage