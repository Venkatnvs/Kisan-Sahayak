import React from 'react';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';
import { MainLogo } from '@/constants/Images';
import { SITE_NAME } from '@/constants/BaseAxios';
import MobileSidebar from './MobileSidebar';

const Header = () => {
  return (
    <header className='sticky inset-x-0 top-0 w-full'>
      <nav className='flex items-center justify-between px-4 py-2 md:justify-end'>
        <div className={cn('lg:!hidden flex-row flex gap-1')}>
          <MobileSidebar />
          <Link to={'/'}>
            <div className='flex flex-row items-center space-x-0 space-y-0 cursor-pointer'>
              <img src={MainLogo} alt='Logo' className={cn('mr-1 w-8 h-6')} />
              {
                <h2 className='text-xl font-semibold text-pretty text-primary font-oswald'>
                  {SITE_NAME}
                </h2>
              }
            </div>
          </Link>
        </div>
        <div className='flex items-center gap-2'>
        </div>
      </nav>
    </header>
  );
};

export default Header;
