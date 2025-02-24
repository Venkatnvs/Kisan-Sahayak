import React from 'react'
import BottomNav from './BottomNav'
import Header from './Header'
import Sidebar from './Sidebar'

const DashboardLayout = ({
    children
}) => {
  return (
    <div className="flex">
      <Sidebar />
      <main className="w-full flex-1 overflow-hidden">
        <Header />
        {children}
      </main>
    </div>
  )
}

export default DashboardLayout