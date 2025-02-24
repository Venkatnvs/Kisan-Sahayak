import React from 'react';
import { ScrollArea } from '../ui/scroll-area';
import DashboardLayout from './DashboardLayout';

const PageContainer = ({ children, scrollable = false }) => {
  return (
    <DashboardLayout>
      {scrollable ? (
        <ScrollArea className='h-[calc(100dvh-16px)]'>
          <div className='h-full  p-2 md:px-4'>{children}</div>
        </ScrollArea>
      ) : (
        <div className='h-full  p-4 md:px-8'>{children}</div>
      )}
    </DashboardLayout>
  );
};

export default PageContainer;