import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { EmptyStateIcon, FieldSelectImage } from '@/constants/Images';
import { Meteors } from '@/components/magicui/meteors';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { fetchFieldsApi, fetchFieldsBySearchApi } from '@/apis/fields';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

const FieldsList = () => {
  const navigate = useNavigate();
  const [fields, setFields] = useState([]);
  const [search, setSearch] = useState('');

  const fetchData = async () => {
    try {
      const res = await fetchFieldsApi();
      console.log(res.data);
      setFields(res.data);
    } catch (error) {
      console.log(error);
    }
  };

  const handleSearch = async e => {
    setSearch(e.target.value);
    try {
      const res = await fetchFieldsBySearchApi(e.target.value);
      console.log(res.data);
      setFields(res.data);
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <>
      <div className='flex w-full my-5'>
        <Input
          placeholder='Search fields'
          className='sm:w-2/3 md:w-1/2 lg:w-1/3'
          value={search}
          onChange={handleSearch}
        />
      </div>

      <div className='grid flex-1 gap-4 overflow-auto md:grid-cols-2 lg:grid-cols-4'>
        {fields.map((field, index) => (
          <Card
            className='relative items-center justify-center max-w-lg overflow-hidden whitespace-nowrap'
            key={index}
          >
            <Meteors number={30} />
            <CardHeader>
              <CardTitle className='text-lg font-semibold'>
                {field.name}
              </CardTitle>
              <Badge className='text-xs' variant='secondary'>
                Created on: {new Date(field.created_at).toDateString()}
              </Badge>
            </CardHeader>
            <CardContent>
              <img
                src={field?.map_tile_url || FieldSelectImage}
                alt={`Field image for ${field.name}`}
                className='w-50 h-50 rounded-sm'
              />
              <div className='flex flex-col gap-2 mt-2'>
                <div className='text-sm'>
                  <strong>Size:</strong> {field.size} acres
                </div>
              </div>
            </CardContent>
            <CardFooter className='flex justify-between gap-3'>
              <Button
                className='w-1/2 text-xs'
                size='sm'
                onClick={() => {
                  navigate(`/fields/${field.id}`);
                }}
              >
                View Details
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      {fields.length === 0 && (
        <div className='flex items-center justify-center h-96 flex-col'>
          <img src={EmptyStateIcon} alt='No fields found' />
          <p className='text-lg text-gray-500'>No fields found</p>
        </div>
      )}
    </>
  );
};

export default FieldsList;
