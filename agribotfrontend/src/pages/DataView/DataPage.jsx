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
      
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 p-4">
        {fieldData.map((item) => (
          <Card 
            key={item.id} 
            className="cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => handleCardClick(item)}
          >
            <div className="relative h-48 w-full">
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
            <CardHeader className="pb-2">
              <CardTitle>{item.crop_name} - ID: {item.id}</CardTitle>
              <CardDescription className="flex items-center gap-1">
                <CalendarIcon size={14} />
                {formatDate(item.created_at)}
              </CardDescription>
            </CardHeader>
            <CardFooter className="pt-0">
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="flex items-center gap-1">
                  <ThermometerIcon size={12} />
                  {item.temperature}°C
                </Badge>
                <Badge variant="outline" className="flex items-center gap-1">
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
          <DialogContent className="max-w-4xl overflow-y-scroll max-h-[96vh]">
            <DialogHeader>
              <DialogTitle>{selectedRecord.crop_name} Analysis</DialogTitle>
              <DialogDescription>
                Field data recorded on {formatDate(selectedRecord.created_at)}
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <img 
                  src={selectedRecord.img} 
                  alt={`${selectedRecord.crop_name} image`} 
                  className="w-full h-72 object-cover rounded-lg"
                />
                
                <div className="mt-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Temperature:</span>
                    <span>{selectedRecord.temperature}°C</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Humidity:</span>
                    <span>{selectedRecord.humidity}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Soil Moisture:</span>
                    <span>{selectedRecord.soil_moisture}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Status:</span>
                    <Badge 
                      variant={selectedRecord.is_not_crop ? 'secondary' : selectedRecord.is_disease ? 'destructive' : 'success'}
                    >
                      {selectedRecord.is_not_crop ? 'Not a Crop' : selectedRecord.is_disease ? 'Disease Detected' : 'Healthy'}
                    </Badge>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-medium mb-2">Description</h3>
                  <p className="text-gray-700">{selectedRecord.description}</p>
                </div>
                
                {selectedRecord.is_disease && selectedRecord.solution && (
                  <div>
                    <h3 className="text-lg font-medium mb-2">Recommended Solution</h3>
                    <p className="text-gray-700">{selectedRecord.solution}</p>
                  </div>
                )}
                
                <div>
                  <h3 className="text-lg font-medium mb-2">Location</h3>
                  <div className="flex items-center gap-2">
                    <MapPinIcon size={16} />
                    <span>
                      Lat: {selectedRecord.location.lat}, Lng: {selectedRecord.location.lng}
                    </span>
                  </div>
                  <Button onClick={() => window.open(`https://google.com/maps?q=${selectedRecord.location.lat},${selectedRecord.location.lng}`, '_blank')} className="mt-2">
                    Open in Google Maps
                  </Button>
                </div>
                
                <div>
                  <h3 className="text-lg font-medium mb-2">Additional Information</h3>
                  <div className="grid grid-cols-2 gap-2">
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
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpenModal(false)}>Close</Button>
              {/* {selectedRecord.is_disease && (
                <Button>Take Action</Button>
              )} */}
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </PageContainer>
  )
}

export default DataPage