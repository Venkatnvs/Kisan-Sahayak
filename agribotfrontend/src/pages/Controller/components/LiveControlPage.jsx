import React, { useEffect, useState } from 'react';
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
  Sprout,
  AlertTriangle,
  Wifi
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
import { ref, set, onValue } from 'firebase/database';
import { database } from '@/firebase/firebaseConfig';

const LiveControlPage = () => {
  const [status, setStatus] = useState('');
  const [gpsData, setGpsData] = useState(null);
  const [sensorData, setSensorData] = useState(null);
  const [showGpsModal, setShowGpsModal] = useState(false);
  const [showSensorModal, setShowSensorModal] = useState(false);
  const [showStatusMessage, setShowStatusMessage] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');

  useEffect(() => {
    if (status) {
      setShowStatusMessage(true);
      const timer = setTimeout(() => {
        setShowStatusMessage(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [status]);

  useEffect(() => {
    const connectedRef = ref(database, '.info/connected');
    const unsubscribe = onValue(connectedRef, (snapshot) => {
      if (snapshot.val() === true) {
        setConnectionStatus('connected');
      } else {
        setConnectionStatus('error');
      }
    });
    sendCommand('S');
    return () => unsubscribe();
  }, []);

  const apiCommands = ['gps', 'sensor'];

  const sendCommand = async command => {
    try {
      if (!apiCommands.includes(command)) {
        try {
          const commandRef = ref(database, 'esp32_old/triggers');
          await set(commandRef, {
            command: command,
            timestamp: Date.now()
          });
        } catch (error) {
          setStatus('Error sending command');
          console.error(error);
        }
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
    <div className='grid grid-cols-3 gap-2 sm:w-52 sm:h-52 w-full max-w-[180px] mx-auto'>
      <Button
        onClick={() => sendCommand('f')}
        className='col-start-2 bg-gradient-to-b from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white rounded-xl shadow-lg flex items-center justify-center h-14 sm:h-16 transition-transform active:scale-95 border-b-4 border-blue-800'
        variant="default"
      >
        <ArrowUp size={32} />
      </Button>
      <Button
        onClick={() => sendCommand('l')}
        className='col-start-1 row-start-2 bg-gradient-to-b from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white rounded-xl shadow-lg flex items-center justify-center h-14 sm:h-16 transition-transform active:scale-95 border-b-4 border-blue-800'
        variant="default"
      >
        <ArrowLeft size={32} />
      </Button>
      <Button
        onClick={() => sendCommand('s')}
        className='col-start-2 row-start-2 bg-gradient-to-b from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white rounded-full shadow-lg flex items-center justify-center h-14 sm:h-16 transition-transform active:scale-95 border-b-4 border-red-800 font-bold text-xs'
        variant="destructive"
      >
        STOP
      </Button>
      <Button
        onClick={() => sendCommand('r')}
        className='col-start-3 row-start-2 bg-gradient-to-b from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white rounded-xl shadow-lg flex items-center justify-center h-14 sm:h-16 transition-transform active:scale-95 border-b-4 border-blue-800'
        variant="default"
      >
        <ArrowRight size={32} />
      </Button>
      <Button
        onClick={() => sendCommand('b')}
        className='col-start-2 row-start-3 bg-gradient-to-b from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white rounded-xl shadow-lg flex items-center justify-center h-14 sm:h-16 transition-transform active:scale-95 border-b-4 border-blue-800'
        variant="default"
      >
        <ArrowDown size={32} />
      </Button>
    </div>
  );

  const ServoControls = () => (
    <div className='space-y-6'>
      <div className='rounded-lg'>
        <h3 className='font-semibold mb-3 text-gray-200'>Base Rotation</h3>
        <div className='flex gap-2 justify-between items-center flex-wrap sm:flex-nowrap'>
          <Button
            onClick={() => sendCommand('servo 2 80')}
            className='bg-gradient-to-b from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 text-white px-3 py-2 rounded-xl flex-1 min-w-[80px] h-12 shadow-lg transition-transform active:scale-95 border-b-4 border-purple-800 font-semibold'
            variant="secondary"
          >
            Left
          </Button>
          <Separator className='hidden sm:block h-px w-6 bg-gray-600' orientation="horizontal" />
          <Button
            onClick={() => sendCommand('servo 2 63')}
            className='bg-gradient-to-b from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white px-3 py-2 rounded-xl flex-1 min-w-[80px] h-12 shadow-lg transition-transform active:scale-95 border-b-4 border-red-800 font-semibold'
            variant="secondary"
          >
            Stop
          </Button>
          <Separator className='hidden sm:block h-px w-6 bg-gray-600' orientation="horizontal" />
          <Button
            onClick={() => sendCommand('servo 2 30')}
            className='bg-gradient-to-b from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 text-white px-3 py-2 rounded-xl flex-1 min-w-[80px] h-12 shadow-lg transition-transform active:scale-95 border-b-4 border-purple-800 font-semibold'
            variant="secondary"
          >
            Right
          </Button>
        </div>
      </div>
      <div className='rounded-lg'>
        <h3 className='font-semibold mb-3 text-gray-200'>Camera Angle</h3>
        <div className='flex gap-2 justify-between items-center flex-wrap sm:flex-nowrap'>
          <Button
            onClick={() => sendCommand('servo 3 10')}
            className='bg-gradient-to-b from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 text-white px-3 py-2 rounded-xl flex-1 min-w-[80px] h-12 shadow-lg transition-transform active:scale-95 border-b-4 border-purple-800 font-semibold'
            variant="secondary"
          >
            Up
          </Button>
          <Separator className='hidden sm:block h-px w-6 bg-gray-600' orientation="horizontal" />
          <Button
            onClick={() => sendCommand('servo 3 40')}
            className='bg-gradient-to-b from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 text-white px-3 py-2 rounded-xl flex-1 min-w-[80px] h-12 shadow-lg transition-transform active:scale-95 border-b-4 border-purple-800 font-semibold'
            variant="secondary"
          >
            Middle
          </Button>
          <Separator className='hidden sm:block h-px w-6 bg-gray-600' orientation="horizontal" />
          <Button
            onClick={() => sendCommand('servo 3 90')}
            className='bg-gradient-to-b from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 text-white px-3 py-2 rounded-xl flex-1 min-w-[80px] h-12 shadow-lg transition-transform active:scale-95 border-b-4 border-purple-800 font-semibold'
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
        onClick={() => sendCommand('send')}
        className='bg-gradient-to-b from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 text-white px-3 py-2 rounded-xl flex items-center justify-center gap-1 h-14 shadow-lg transition-transform active:scale-95 border-b-4 border-green-800 font-semibold'
        variant="default"
      >
        <Send size={20} /> 
        <span className="ml-1">Send</span>
      </Button>
      <Button
        onClick={() => sendCommand('reset')}
        className='bg-gradient-to-b from-orange-600 to-orange-700 hover:from-orange-500 hover:to-orange-600 text-white px-3 py-2 rounded-xl flex items-center justify-center gap-1 h-14 shadow-lg transition-transform active:scale-95 border-b-4 border-orange-800 font-semibold'
        variant="destructive"
      >
        <RefreshCw size={20} /> 
        <span className="ml-1">Reset</span>
      </Button>
    </div>
  );

  const LiveStream = () => (
    <Card className='h-full bg-gray-900 border-gray-800 overflow-hidden'>
      <CardHeader className="p-3 sm:p-6 bg-gray-800 border-b border-gray-700">
        <CardTitle className="text-gray-200">Live Stream</CardTitle>
      </CardHeader>
      <CardContent className="p-3 sm:p-6 pt-4">
        <div className='aspect-video bg-black rounded-lg overflow-hidden mb-4 shadow-inner border border-gray-800'>
          <img
            src={`https://streamsync-7yp3.onrender.com/live/4202b1c1`}
            alt='Live stream'
            className='w-full h-full object-cover'
            onError={e => {
              e.currentTarget.src =
                'https://images.unsplash.com/photo-1633269540827-728aabbb7646?q=80&w=1000&auto=format&fit=crop';
            }}
          />
        </div>
        <h2 className='text-lg font-semibold text-gray-200 mb-3'>Actions</h2>
        <div className='mt-2'>
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
      <DialogContent className="sm:max-w-2xl max-w-[95vw] overflow-y-auto max-h-[90vh] bg-gray-900 text-gray-200 border-gray-800">
        <DialogHeader>
          <DialogTitle className="flex items-center text-gray-200">
            <MapPin className="mr-2" size={24} />
            GPS Location
          </DialogTitle>
          <DialogDescription className="text-gray-400">Current device location data</DialogDescription>
        </DialogHeader>
        
        <div className="mb-0 bg-gray-800 rounded-lg overflow-hidden">
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
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-0">
          <div className="space-y-1">
            <h3 className="text-sm font-medium text-gray-400">Latitude</h3>
            <p className="text-lg font-semibold text-gray-200">{gpsData.latitude}</p>
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-medium text-gray-400">Longitude</h3>
            <p className="text-lg font-semibold text-gray-200">{gpsData.longitude}</p>
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-medium text-gray-400">Altitude</h3>
            <p className="text-lg font-semibold text-gray-200">{gpsData.altitude}m</p>
          </div>
        </div>
        
        <Alert className="bg-gray-800 border-gray-700">
          <AlertTitle className="text-gray-200">GPS Status</AlertTitle>
          <AlertDescription>
            <Badge variant={gpsData.status === 'valid' ? 'success' : 'destructive'}>
              {gpsData.status === 'valid' ? 'Valid' : 'Invalid'}
            </Badge>
            <span className="ml-2 text-gray-400">Last updated: {new Date().toLocaleTimeString()}</span>
          </AlertDescription>
        </Alert>
        
        <DialogFooter className="flex flex-col sm:flex-row gap-3 justify-between">
          <Button 
            variant="outline" 
            onClick={() => setShowGpsModal(false)} 
            className="w-full sm:w-auto bg-gray-800 text-gray-200 border-gray-700 hover:bg-gray-700"
          >
            Close
          </Button>
          <Button 
            variant="default" 
            onClick={() => window.open(googleMapsUrl, '_blank')} 
            className="w-full sm:w-auto bg-blue-600 hover:bg-blue-500 text-white"
          >
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
      <DialogContent className="sm:max-w-md max-w-[95vw] bg-gray-900 text-gray-200 border-gray-800">
        <DialogHeader>
          <DialogTitle className="flex items-center text-gray-200">
            <TreePalm className="mr-2" size={24} />
            Sensor Readings
          </DialogTitle>
          <DialogDescription className="text-gray-400">Environmental and soil data</DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Temperature */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Thermometer className={`mr-2 ${getTemperatureColor(sensorData.temperature)}`} size={20} />
                <h3 className="font-medium text-gray-200">Temperature</h3>
              </div>
              <span className={`text-lg font-bold ${getTemperatureColor(sensorData.temperature)}`}>
                {sensorData.temperature}°C
              </span>
            </div>
            <Progress 
              value={(sensorData.temperature / 50) * 100} 
              className="h-2 bg-gray-800" 
            />
            <div className="flex justify-between text-xs text-gray-400">
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
                <h3 className="font-medium text-gray-200">Humidity</h3>
              </div>
              <span className={`text-lg font-bold ${getHumidityColor(sensorData.humidity)}`}>
                {sensorData.humidity}%
              </span>
            </div>
            <Progress 
              value={sensorData.humidity} 
              className="h-2 bg-gray-800" 
            />
            <div className="flex justify-between text-xs text-gray-400">
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
                <h3 className="font-medium text-gray-200">Soil Moisture</h3>
              </div>
              <span className={`text-lg font-bold ${getMoistureColor(sensorData.soil_moisture_percent)}`}>
                {sensorData.soil_moisture_percent}%
              </span>
            </div>
            <Progress 
              value={sensorData.soil_moisture_percent} 
              className="h-2 bg-gray-800" 
            />
            <div className="flex justify-between text-xs text-gray-400">
              <span>Dry</span>
              <span>Moist</span>
              <span>Wet</span>
            </div>
          </div>
        </div>
        
        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => setShowSensorModal(false)} 
            className="w-full bg-gray-800 text-gray-200 border-gray-700 hover:bg-gray-700"
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    );
  };

  const ActuatorControls = () => (
    <Card className="bg-gray-900 border-gray-800">
      <CardContent className="p-3 sm:p-4">
        <div className="space-y-4">
          <h3 className='font-semibold mb-2 text-gray-200'>Actuator</h3>
          <div className='flex gap-2 flex-col'>
            <Button
              onClick={() => sendCommand('u')}
              variant="secondary"
              className='bg-gradient-to-b from-teal-600 to-teal-700 hover:from-teal-500 hover:to-teal-600 text-white flex-1 h-12 rounded-xl shadow-lg transition-transform active:scale-95 border-b-4 border-teal-800 font-semibold'
            >
              Up
            </Button>
            <Button
              onClick={() => sendCommand('t')}
              variant="secondary"
              className='bg-gradient-to-b from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white flex-1 h-12 rounded-xl shadow-lg transition-transform active:scale-95 border-b-4 border-red-800 font-semibold'
            >
              Stop
            </Button>
            <Button
              onClick={() => sendCommand('d')}
              variant="secondary"
              className='bg-gradient-to-b from-teal-600 to-teal-700 hover:from-teal-500 hover:to-teal-600 text-white flex-1 h-12 rounded-xl shadow-lg transition-transform active:scale-95 border-b-4 border-teal-800 font-semibold'
            >
              Down
            </Button>
          </div>
          <h3 className='font-semibold mb-2 text-gray-200'>Soil Sensor</h3>
          <div className='flex gap-2 flex-col'>
            <Button
              onClick={() => sendCommand('servo 1 90')}
              variant="secondary"
              className='bg-gradient-to-b from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white flex-1 h-12 rounded-xl shadow-lg transition-transform active:scale-95 border-b-4 border-amber-800 font-semibold'
            >
              In
            </Button>
            <Button
              onClick={() => sendCommand('servo 1 120')}
              variant="secondary"
              className='bg-gradient-to-b from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white flex-1 h-12 rounded-xl shadow-lg transition-transform active:scale-95 border-b-4 border-amber-800 font-semibold'
            >
              Out
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const ConnectionIndicator = () => {
    const statusConfig = {
      connected: {
        variant: "outline",
        className: "bg-green-900 text-green-400 border-green-700",
        label: "Connected",
        icon: <Wifi size={16} className="mr-1" />
      },
      disconnected: {
        variant: "outline",
        className: "bg-red-900 text-red-400 border-red-700",
        label: "Disconnected",
        icon: <AlertTriangle size={16} className="mr-1" />
      },
      error: {
        variant: "outline",
        className: "bg-amber-900 text-amber-400 border-amber-700",
        label: "Connection Error",
        icon: <AlertTriangle size={16} className="mr-1" />
      },
      connecting: {
        variant: "outline",
        className: "bg-blue-900 text-blue-400 border-blue-700",
        label: "Connecting...",
        icon: <Wifi size={16} className="mr-1 animate-pulse" />
      }
    };
    
    const config = statusConfig[connectionStatus];
    
    return (
      <Badge 
        variant={config.variant}
        className={config.className}
      >
        {config.icon}
        {config.label}
      </Badge>
    );
  };

  return (
    <div className='min-h-screen py-2 px-2 sm:px-4 text-white'>
      <div className='max-w-7xl mx-auto space-y-4 sm:space-y-4'>
        <div className="flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-500">AgriBot Control</h1>
          <ConnectionIndicator />
        </div>

        {showStatusMessage && status && (
          <Alert variant="destructive" className="bg-red-900 border-red-800 text-white">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Alert</AlertTitle>
            <AlertDescription>{status}</AlertDescription>
          </Alert>
        )}

        {/* Desktop Layout - Grid with live stream on right, controls on left */}
        <div className="hidden sm:grid sm:grid-cols-[5fr_1.2fr_5fr] sm:gap-1">
          {/* Left side - Controls in 3 rows */}
          <div className="space-y-6 flex-1">
            {/* Row 1 - Direction Controls */}
            <Card className="p-3 sm:p-4 bg-gray-900 border-gray-800">
              <CardContent className="p-0">
                <h2 className="text-lg font-semibold mb-4 text-gray-200">Direction Control</h2>
                <div className="flex justify-center">
                  <DirectionalControls />
                </div>
              </CardContent>
            </Card>

            {/* Row  - Servo Controls */}
            <Card className="p-3 sm:p-4 bg-gray-900 border-gray-800">
              <CardContent className="p-0">
                <h2 className="text-lg font-semibold mb-4 text-gray-200">Servo Controls</h2>
                <ServoControls />
              </CardContent>
            </Card>

            {/* Row 3 - Actuator Controls */}
          </div>

          <div className="space-y-6">
            <ActuatorControls />
          </div>

          {/* Right side - Live Stream */}
          <div className="h-full flex-1">
            <LiveStream />
          </div>
        </div>

        {/* Mobile Layout - Vertical stack without tabs */}
        <div className="sm:hidden space-y-4">
          {/* Live Stream at top for mobile */}
          <LiveStream />

          {/* Direction Controls */}
          <Card className="p-3 bg-gray-900 border-gray-800">
            <CardContent className="p-0">
              <h2 className="text-lg font-semibold mb-3 text-gray-200">Direction Control</h2>
              <div className="flex justify-center">
                <DirectionalControls />
              </div>
            </CardContent>
          </Card>

          {/* Actuator Controls - In middle */}
          <ActuatorControls />

          {/* Servo Controls */}
          <Card className="p-3 bg-gray-900 border-gray-800">
            <CardContent className="p-0">
              <h2 className="text-lg font-semibold mb-3 text-gray-200">Servo Controls</h2>
              <ServoControls />
            </CardContent>
          </Card>
        </div>
      </div>
      
      {/* Modals */}
      <GPSModal />
      <SensorModal />
    </div>
  );
};

export default LiveControlPage;