import PageContainer from '@/components/layout/PageContainer'
import TextHeader from '@/components/PageHeaders/TextHeader'
import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog"
import { CalendarIcon, MapPinIcon, ThermometerIcon, DropletIcon } from 'lucide-react'
import { fetchFieldDataApi } from '@/apis/fields'

const DataPage = () => {
  const [fieldData, setFieldData] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedRecord, setSelectedRecord] = useState(null)
  const [openModal, setOpenModal] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetchFieldDataApi()
        setFieldData(response.data)
        setLoading(false)
      } catch (error) {
        console.error("Error fetching field data:", error)
        setLoading(false)
      }
    }
    
    fetchData()
  }, [])

  const handleCardClick = (record) => {
    setSelectedRecord(record)
    setOpenModal(true)
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <PageContainer scrollable>
        <TextHeader title='Analysis Page' description='This page is for data analysis' />
        <div className="flex justify-center items-center h-64">
          <p>Loading field data...</p>
        </div>
      </PageContainer>
    )
  }

  return (
    <PageContainer scrollable>
      <TextHeader title='Crop Analysis' description='View your field data and analysis' />
      
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6 p-2 sm:p-4">
        {fieldData.map((item) => (
          <Card 
            key={item.id} 
            className="cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => handleCardClick(item)}
          >
            <div className="relative h-40 sm:h-48 w-full">
              <img 
                src={item.img} 
                alt={`${item.crop_name} image`} 
                className="w-full h-full object-cover rounded-t-lg"
              />
              <Badge 
                className="absolute top-2 right-2"
                variant={item?.is_not_crop ? 'secondary' : item?.is_disease ? 'destructive' : 'success'}
              >
                {item?.is_not_crop ? 'Not a Crop' : item?.is_disease ? 'Disease Detected' : 'Healthy'}
              </Badge>
            </div>
            <CardHeader className="pb-2 p-3 sm:p-6">
              <CardTitle className="text-base sm:text-lg">{item.crop_name} - ID: {item.id}</CardTitle>
              <CardDescription className="flex items-center gap-1 text-xs sm:text-sm">
                <CalendarIcon size={14} />
                {formatDate(item.created_at)}
              </CardDescription>
            </CardHeader>
            <CardFooter className="pt-0 p-3 sm:p-6">
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="flex items-center gap-1 text-xs">
                  <ThermometerIcon size={12} />
                  {item.temperature}°C
                </Badge>
                <Badge variant="outline" className="flex items-center gap-1 text-xs">
                  <DropletIcon size={12} />
                  {item.humidity}%
                </Badge>
              </div>
            </CardFooter>
          </Card>
        ))}
      </div>
      
      <Dialog open={openModal} onOpenChange={setOpenModal}>
        {selectedRecord && (
          <DialogContent className="max-w-4xl w-[95vw] overflow-y-auto max-h-[90vh] p-4 sm:p-6">
            <DialogHeader>
              <DialogTitle className="text-lg sm:text-xl">{selectedRecord.crop_name} Analysis</DialogTitle>
              <DialogDescription className="text-sm">
                Field data recorded on {formatDate(selectedRecord.created_at)}
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-2">
              <div>
                <img 
                  src={selectedRecord.img} 
                  alt={`${selectedRecord.crop_name} image`} 
                  className="w-full h-56 sm:h-72 object-cover rounded-lg"
                />
                
                <div className="mt-3 sm:mt-4 space-y-2 sm:space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-sm sm:text-base">Temperature:</span>
                    <span className="text-sm sm:text-base">{selectedRecord.temperature}°C</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-sm sm:text-base">Humidity:</span>
                    <span className="text-sm sm:text-base">{selectedRecord.humidity}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-sm sm:text-base">Soil Moisture:</span>
                    <span className="text-sm sm:text-base">{selectedRecord.soil_moisture}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-sm sm:text-base">Status:</span>
                    <Badge 
                      variant={selectedRecord.is_not_crop ? 'secondary' : selectedRecord.is_disease ? 'destructive' : 'success'}
                    >
                      {selectedRecord.is_not_crop ? 'Not a Crop' : selectedRecord.is_disease ? 'Disease Detected' : 'Healthy'}
                    </Badge>
                  </div>
                </div>
              </div>
              
              <div className="space-y-3 sm:space-y-4">
                <div>
                  <h3 className="text-base sm:text-lg font-medium mb-1 sm:mb-2">Description</h3>
                  <p className="text-gray-700 text-sm sm:text-base">{selectedRecord.description}</p>
                </div>
                
                {selectedRecord.is_disease && selectedRecord.solution && (
                  <div>
                    <h3 className="text-base sm:text-lg font-medium mb-1 sm:mb-2">Recommended Solution</h3>
                    <p className="text-gray-700 text-sm sm:text-base">{selectedRecord.solution}</p>
                  </div>
                )}
                
                <div>
                  <h3 className="text-base sm:text-lg font-medium mb-1 sm:mb-2">Location</h3>
                  <div className="flex items-center gap-2 text-sm sm:text-base">
                    <MapPinIcon size={16} />
                    <span className="break-all">
                      Lat: {selectedRecord.location.lat}, Lng: {selectedRecord.location.lng}
                    </span>
                  </div>
                  <Button onClick={() => window.open(`https://google.com/maps?q=${selectedRecord.location.lat},${selectedRecord.location.lng}`, '_blank')} className="mt-2 text-xs sm:text-sm w-full sm:w-auto">
                    Open in Google Maps
                  </Button>
                </div>
                
                <div>
                  <h3 className="text-base sm:text-lg font-medium mb-1 sm:mb-2">Additional Information</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm sm:text-base">
                    <div>
                      <span className="font-medium">Field ID:</span>
                      <span className="ml-2">{selectedRecord.main_field}</span>
                    </div>
                    <div>
                      <span className="font-medium">Record ID:</span>
                      <span className="ml-2">{selectedRecord.id}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <DialogFooter className="mt-4 sm:mt-6 flex flex-col sm:flex-row gap-2">
              <Button variant="outline" onClick={() => setOpenModal(false)} className="w-full sm:w-auto">Close</Button>
              {/* {selectedRecord.is_disease && (
                <Button className="w-full sm:w-auto">Take Action</Button>
              )} */}
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </PageContainer>
  )
}

export default DataPage