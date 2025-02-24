import React from 'react';
import { Separator } from '../ui/separator';
import { Heading } from '../ui/Header';

const TextHeader = ({
    title,
    description,
}) => {
  return (
    <>
      <div className='flex items-start pb-1'>
        <Heading title={title} description={description} />
      </div>
      <Separator />
    </>
  );
};

export default TextHeader;
