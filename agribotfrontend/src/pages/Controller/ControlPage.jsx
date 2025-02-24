import PageContainer from '@/components/layout/PageContainer'
import React from 'react'

const ControlPage = () => {
  return (
    <PageContainer scrollable>
        <div className="p-4">
            <h1 className="text-2xl font-semibold">Control Page</h1>
            <p className="text-gray-500">This is the control page</p>
        </div>
    </PageContainer>
  )
}

export default ControlPage