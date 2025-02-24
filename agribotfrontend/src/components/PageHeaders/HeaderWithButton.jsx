import React from 'react';
import { Separator } from '../ui/separator';
import { Button } from '../ui/button';
import { Heading } from '../ui/Header';

const HeaderWithButton = ({ title, description, onClick, buttonText, icon }) => {
  return (
    <>
      <div className='flex items-start justify-between pb-1'>
        <Heading title={title} description={description} />
        <Button className='text-xs md:text-sm' onClick={() => onClick()}>
          {icon && icon} {buttonText}
        </Button>
      </div>
      <Separator />
    </>
  );
};

export default HeaderWithButton;
