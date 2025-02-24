import { fetchFieldApi } from '@/apis/fields'
import PageContainer from '@/components/layout/PageContainer'
import TextHeader from '@/components/PageHeaders/TextHeader'
import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import FieldDetailsFull from './components/FieldDetailsFull'

const FieldDetails = () => {
    const { id } = useParams()

    const [fieldData, setFieldData] = useState({});

  const fetchData = async () => {
    try {
      const res = await fetchFieldApi(id);
      console.log(res.data);
      setFieldData(res.data);
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (!fieldData) {
    return <div>Loading...</div>;
  }

  return (
    <PageContainer scrollable>
        <TextHeader title='Field Details' description='This page is for field details' />
        <div className="flex justify-center items-center h-64">
          <FieldDetailsFull
            fieldData={fieldData}
          />
        </div>
    </PageContainer>
  )
}

export default FieldDetails