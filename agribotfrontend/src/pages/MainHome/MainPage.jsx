import PageContainer from '@/components/layout/PageContainer'
import HeaderWithButton from '@/components/PageHeaders/HeaderWithButton';
import { Plus } from 'lucide-react';
import React from 'react'
import { useNavigate } from 'react-router-dom';
import FieldsList from '../Fields/FieldsList';

const MainPage = () => {
  const navigate = useNavigate();

  return (
    <PageContainer scrollable>
      <HeaderWithButton
        title='Fields'
        description='List of all fields'
        buttonText='Add Field'
        onClick={() => {
          navigate('/fields/add');
        }}
        icon={<Plus className='mr-2 h-4 w-4' />}
      />
      <FieldsList />
    </PageContainer>
  )
}

export default MainPage