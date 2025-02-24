import { Breadcrumbs } from '@/components/Breadcrumbs';
import PageContainer from '@/components/layout/PageContainer'
import TextHeader from '@/components/PageHeaders/TextHeader';
import React from 'react'
import AddFieldSelection from './components/AddFieldSelection';

const breadcrumbItems = [
    { title: 'Home', link: '/' },
    { title: 'Add New Field' },
  ];

const NewFieldPage = () => {
  return (
    <PageContainer scrollable>
        <div className='space-y-2'>
        <Breadcrumbs items={breadcrumbItems} />
        <TextHeader title='Add New Field' description='Add a new farm field' />
        <AddFieldSelection />
      </div>
    </PageContainer>
  )
}

export default NewFieldPage