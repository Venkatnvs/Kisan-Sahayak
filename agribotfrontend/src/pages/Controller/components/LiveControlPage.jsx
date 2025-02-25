import React, { useState } from 'react';
import {
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Send,
  RefreshCw,
  MapPin,
  TreePalm,
  ExternalLink,
  Thermometer,
  Droplets,
  Sprout
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

const LiveControlPage = () => {
  const [status, setStatus] = useState('');
  const [gpsData, setGpsData] = useState(null);
  const [sensorData, setSensorData] = useState(null);
  const [showGpsModal, setShowGpsModal] = useState(false);
  const [showSensorModal, setShowSensorModal] = useState(false);

  const apiCommands = ['gps', 'sensor'];

  const sendCommand = async command => {
    try {
      if (command === 'send') {
        setStatus('Sending command: send');
        return;
      }
      
      if (!apiCommands.includes(command)) {
        const response = await fetch(`http://192.168.177.57/cmd?command=${command}`);
        if (!response) {
          throw new Error('Failed to send command');
        }
        setStatus('');
      } else {
        setStatus(`Sending command: ${command}`);
        const response = await fetch(`http://192.168.177.57/api/${command}`);
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        const data = await response.json();
        
        if (command === 'sensor' && data.dht_status !== 'ok') {
          throw new Error('Failed to get sensor data');
        }
        
        if (command === 'gps' && data.status !== 'valid') {
          throw new Error('Failed to get GPS data');
        }
        
        if (command === 'sensor') {
          setSensorData(data);
          setShowSensorModal(true);
          setStatus(`Temperature: ${data.temperature}°C, Humidity: ${data.humidity}%, Soil Moisture: ${data.soil_moisture_percent}%`);
        } else if (command === 'gps') {
          setGpsData(data);
          setShowGpsModal(true);
          setStatus(`Latitude: ${data.latitude}, Longitude: ${data.longitude}, Altitude: ${data.altitude}m`);
        }
        
        setTimeout(() => setStatus(''), 10000);
      }
    } catch (error) {
      setStatus('Error sending command');
      console.error(error);
    }
  };

  const DirectionalControls = () => (
    <div className='grid grid-cols-3 gap-2 w-40 h-40'>
      <Button
        onClick={() => sendCommand('f')}
        className='col-start-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg flex items-center justify-center'
        variant="default"
      >
        <ArrowUp size={24} />
      </Button>
      <Button
        onClick={() => sendCommand('l')}
        className='col-start-1 row-start-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg flex items-center justify-center'
        variant="default"
      >
        <ArrowLeft size={24} />
      </Button>
      <Button
        onClick={() => sendCommand('s')}
        className='col-start-2 row-start-2 bg-red-500 hover:bg-red-600 text-white rounded-lg flex items-center justify-center'
        variant="destructive"
      >
        STOP
      </Button>
      <Button
        onClick={() => sendCommand('r')}
        className='col-start-3 row-start-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg flex items-center justify-center'
        variant="default"
      >
        <ArrowRight size={24} />
      </Button>
      <Button
        onClick={() => sendCommand('b')}
        className='col-start-2 row-start-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg flex items-center justify-center'
        variant="default"
      >
        <ArrowDown size={24} />
      </Button>
    </div>
  );

  const ServoControls = () => (
    <div className='space-y-8'>
      <div className='rounded-lg'>
        <h3 className='font-semibold mb-2'>Base Rotation</h3>
        <div className='flex gap-2 justify-between items-center'>
          <Button
            onClick={() => sendCommand('servo 2 80')}
            className='bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded flex-1'
            variant="secondary"
          >
            Left
          </Button>
          <Separator className='h-px w-12 bg-gray-300' orientation="horizontal" />
          <Button
            onClick={() => sendCommand('servo 2 63')}
            className='bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded flex-1'
            variant="secondary"
          >
            Stop
          </Button>
          <Separator className='h-px w-12 bg-gray-300' orientation="horizontal" />
          <Button
            onClick={() => sendCommand('servo 2 30')}
            className='bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded flex-1'
            variant="secondary"
          >
            Right
          </Button>
        </div>
      </div>
      <div className='rounded-lg'>
        <h3 className='font-semibold mb-2'>Camera Angle</h3>
        <div className='flex gap-2 justify-between items-center'>
          <Button
            onClick={() => sendCommand('servo 3 10')}
            className='bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded flex-1'
            variant="secondary"
          >
            Up
          </Button>
          <Separator className='h-px w-12 bg-gray-300' orientation="horizontal" />
          <Button
            onClick={() => sendCommand('servo 3 40')}
            className='bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded flex-1'
            variant="secondary"
          >
            Middle
          </Button>
          <Separator className='h-px w-12 bg-gray-300' orientation="horizontal" />
          <Button
            onClick={() => sendCommand('servo 3 90')}
            className='bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded flex-1'
            variant="secondary"
          >
            Down
          </Button>
        </div>
      </div>
    </div>
  );

  const ActionButtons = () => (
    <div className='grid grid-cols-2 gap-4'>
      <Button
        onClick={() => sendCommand('gps')}
        className='bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-lg flex items-center justify-center gap-2'
        variant="outline"
      >
        <MapPin size={20} /> GPS
      </Button>
      <Button
        onClick={() => sendCommand('sensor')}
        className='bg-yellow-500 hover:bg-yellow-600 text-white px-6 py-3 rounded-lg flex items-center justify-center gap-2'
        variant="outline"
      >
        <TreePalm size={20} /> Sensor
      </Button>
      <Button
        onClick={() => sendCommand('send')}
        className='bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg flex items-center justify-center gap-2'
        variant="default"
      >
        <Send size={20} /> Send
      </Button>
      <Button
        onClick={() => sendCommand('reset')}
        className='bg-red-500 hover:bg-red-600 text-white px-6 py-3 rounded-lg flex items-center justify-center gap-2'
        variant="destructive"
      >
        <RefreshCw size={20} /> Reset
      </Button>
    </div>
  );

  const LiveStream = () => (
    <Card className='h-full'>
      <CardHeader>
        <CardTitle>Live Stream</CardTitle>
      </CardHeader>
      <CardContent>
        <div className='aspect-video bg-black rounded-lg overflow-hidden mb-5'>
          <img
            src={`http://192.168.177.179:81`}
            alt='Live stream'
            className='w-full h-full object-cover'
            onError={e => {
              e.currentTarget.src =
                'https://images.unsplash.com/photo-1633269540827-728aabbb7646?q=80&w=1000&auto=format&fit=crop';
            }}
          />
        </div>
        <h2 className='text-lg font-semibold'>Actions</h2>
        <div className='mt-4'>
          <ActionButtons />
        </div>
      </CardContent>
    </Card>
  );

  const GPSModal = () => {
    if (!gpsData) return null;

    const googleMapsUrl = `https://www.google.com/maps?q=${gpsData.latitude},${gpsData.longitude}`;
    
    return (
      <Dialog open={showGpsModal} onOpenChange={setShowGpsModal}>
      <DialogContent className="sm:max-w-2xl overflow-y-scroll max-h-[96vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <MapPin className="mr-2" size={24} />
            GPS Location
          </DialogTitle>
          <DialogDescription>Current device location data</DialogDescription>
        </DialogHeader>
        
        <div className="mb-0 bg-gray-100 rounded-lg overflow-hidden">
          <MapContainer
            center={[gpsData.latitude, gpsData.longitude]}
            zoom={15}
            style={{ height: '300px', width: '100%' }}
          >
            <TileLayer
              url='https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}'
              attribution='&copy; <a href="https://www.google.com/maps">Google Maps</a> contributors'
            />
            <Marker position={[gpsData.latitude, gpsData.longitude]}>
              <Popup>Device Location</Popup>
            </Marker>
          </MapContainer>
        </div>
        
        <div className="grid grid-cols-3 gap-4 mb-0">
          <div className="space-y-1">
            <h3 className="text-sm font-medium text-gray-500">Latitude</h3>
            <p className="text-lg font-semibold">{gpsData.latitude}</p>
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-medium text-gray-500">Longitude</h3>
            <p className="text-lg font-semibold">{gpsData.longitude}</p>
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-medium text-gray-500">Altitude</h3>
            <p className="text-lg font-semibold">{gpsData.altitude}m</p>
          </div>
        </div>
        
        <Alert>
          <AlertTitle>GPS Status</AlertTitle>
          <AlertDescription>
            <Badge variant={gpsData.status === 'valid' ? 'success' : 'destructive'}>
              {gpsData.status === 'valid' ? 'Valid' : 'Invalid'}
            </Badge>
            <span className="ml-2">Last updated: {new Date().toLocaleTimeString()}</span>
          </AlertDescription>
        </Alert>
        
        <DialogFooter className="flex justify-between">
          <Button variant="outline" onClick={() => setShowGpsModal(false)}>
            Close
          </Button>
          <Button variant="default" onClick={() => window.open(googleMapsUrl, '_blank')}>
            <ExternalLink size={16} className="mr-2" />
            Open in Google Maps
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    );
  };

  const SensorModal = () => {
    if (!sensorData) return null;
    
    // Calculate color based on value for indicators
    const getTemperatureColor = (temp) => {
      if (temp > 30) return 'text-red-500';
      if (temp < 10) return 'text-blue-500';
      return 'text-green-500';
    };
    
    const getHumidityColor = (humidity) => {
      if (humidity > 70) return 'text-blue-500';
      if (humidity < 30) return 'text-yellow-500';
      return 'text-green-500';
    };
    
    const getMoistureColor = (moisture) => {
      if (moisture > 70) return 'text-blue-500';
      if (moisture < 30) return 'text-yellow-500';
      return 'text-green-500';
    };
    
    return (
      <Dialog open={showSensorModal} onOpenChange={setShowSensorModal}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <TreePalm className="mr-2" size={24} />
            Sensor Readings
          </DialogTitle>
          <DialogDescription>Environmental and soil data</DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Temperature */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Thermometer className={`mr-2 ${getTemperatureColor(sensorData.temperature)}`} size={20} />
                <h3 className="font-medium">Temperature</h3>
              </div>
              <span className={`text-lg font-bold ${getTemperatureColor(sensorData.temperature)}`}>
                {sensorData.temperature}°C
              </span>
            </div>
            <Progress 
              value={(sensorData.temperature / 50) * 100} 
              className="h-2" 
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>0°C</span>
              <span>25°C</span>
              <span>50°C</span>
            </div>
          </div>
          
          {/* Humidity */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Droplets className={`mr-2 ${getHumidityColor(sensorData.humidity)}`} size={20} />
                <h3 className="font-medium">Humidity</h3>
              </div>
              <span className={`text-lg font-bold ${getHumidityColor(sensorData.humidity)}`}>
                {sensorData.humidity}%
              </span>
            </div>
            <Progress 
              value={sensorData.humidity} 
              className="h-2" 
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>0%</span>
              <span>50%</span>
              <span>100%</span>
            </div>
          </div>
          
          {/* Soil Moisture */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Sprout className={`mr-2 ${getMoistureColor(sensorData.soil_moisture_percent)}`} size={20} />
                <h3 className="font-medium">Soil Moisture</h3>
              </div>
              <span className={`text-lg font-bold ${getMoistureColor(sensorData.soil_moisture_percent)}`}>
                {sensorData.soil_moisture_percent}%
              </span>
            </div>
            <Progress 
              value={sensorData.soil_moisture_percent} 
              className="h-2" 
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>Dry</span>
              <span>Moist</span>
              <span>Wet</span>
            </div>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => setShowSensorModal(false)} className="w-full">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    );
  };

  const ActuatorControls = () => (
    <Card>
      <CardContent className="p-4">
        <div className="space-y-4">
          <h3 className='font-semibold mb-2'>Actuator</h3>
          <div className='flex gap-2 flex-col pb-5'>
            <Button
              onClick={() => sendCommand('u')}
              variant="secondary"
              className='bg-purple-500 hover:bg-purple-600 text-white'
            >
              Up
            </Button>
            <Button
              onClick={() => sendCommand('t')}
              variant="secondary"
              className='bg-red-500 hover:bg-red-600 text-white'
            >
              Stop
            </Button>
            <Button
              onClick={() => sendCommand('d')}
              variant="secondary"
              className='bg-purple-500 hover:bg-purple-600 text-white'
            >
              Down
            </Button>
          </div>
          <h3 className='font-semibold mb-2'>Soil Sensor</h3>
          <div className='flex gap-2 flex-col'>
            <Button
              onClick={() => sendCommand('servo 1 90')}
              variant="secondary"
              className='bg-purple-500 hover:bg-purple-600 text-white'
            >
              In
            </Button>
            <Button
              onClick={() => sendCommand('servo 1 120')}
              variant="secondary"
              className='bg-purple-500 hover:bg-purple-600 text-white'
            >
              Out
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className='min-h-screen py-2'>
      <div className='max-w-7xl mx-auto space-y-8'>
        <div className='p-2 rounded-xl'>
          {status && (
            <Alert className='mb-4'>
              <AlertTitle>Status</AlertTitle>
              <AlertDescription>{status}</AlertDescription>
            </Alert>
          )}

          <div className='grid lg:grid-cols-2 gap-4'>
            <div className='flex gap-4'>
              <Card className='flex-1 p-4'>
                <CardContent className='p-0'>
                  <div className='space-y-4'>
                    <h2 className='text-lg font-semibold mb-4'>
                      Direction Control
                    </h2>
                    <div className='flex justify-center'>
                      <DirectionalControls />
                    </div>
                  </div>
                  <div className='mt-8'>
                    <h2 className='text-lg font-semibold my-4'>Servo Controls</h2>
                    <ServoControls />
                  </div>
                </CardContent>
              </Card>
              <ActuatorControls />
            </div>

            <LiveStream />
          </div>
        </div>
      </div>
      
      {/* Modals */}
      <GPSModal />
      <SensorModal />
    </div>
  );
};

export default LiveControlPage;