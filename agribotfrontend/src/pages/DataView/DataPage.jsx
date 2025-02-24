import PageContainer from '@/components/layout/PageContainer'
import TextHeader from '@/components/PageHeaders/TextHeader'
import React from 'react'

const DataPage = () => {
  return (
    <PageContainer scrollable>
        <TextHeader title='Analysis Page' description='This page is for data analysis' />
    </PageContainer>
  )
}

export default DataPage