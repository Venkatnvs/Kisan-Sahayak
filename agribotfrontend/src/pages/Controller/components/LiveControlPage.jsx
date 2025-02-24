import React, { useState } from 'react';
import {
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  RotateCw,
  Send,
  RefreshCw,
  Car,
  Gamepad2,
} from 'lucide-react';

const LiveControlPage = () => {
  const [status, setStatus] = useState('');

  const sendCommand = async command => {
    try {
      setStatus(`Sending command: ${command}`);
      // In a real implementation, you would send the command to the IP address
      // await fetch(`http://${ipAddress}/command`, {
      //   method: 'POST',
      //   body: JSON.stringify({ command }),
      // });
      console.log(`Sent command ${command} to`);
      setTimeout(() => setStatus(''), 2000);
    } catch (error) {
      setStatus('Error sending command');
      console.error(error);
    }
  };

  const DirectionalControls = () => (
    <div className='grid grid-cols-3 gap-2 w-48 h-48'>
      <button
        onClick={() => sendCommand('f')}
        className='col-start-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg flex items-center justify-center'
      >
        <ArrowUp size={24} />
      </button>
      <button
        onClick={() => sendCommand('l')}
        className='col-start-1 row-start-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg flex items-center justify-center'
      >
        <ArrowLeft size={24} />
      </button>
      <button
        onClick={() => sendCommand('s')}
        className='col-start-2 row-start-2 bg-red-500 hover:bg-red-600 text-white rounded-lg flex items-center justify-center'
      >
        STOP
      </button>
      <button
        onClick={() => sendCommand('r')}
        className='col-start-3 row-start-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg flex items-center justify-center'
      >
        <ArrowRight size={24} />
      </button>
      <button
        onClick={() => sendCommand('b')}
        className='col-start-2 row-start-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg flex items-center justify-center'
      >
        <ArrowDown size={24} />
      </button>
    </div>
  );

  const ServoControls = () => (
    <div className='space-y-4'>
      <div className='bg-gray-100 p-4 rounded-lg'>
        <h3 className='font-semibold mb-2'>Servo 1</h3>
        <div className='flex gap-2'>
          <button
            onClick={() => sendCommand('85')}
            className='bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded'
          >
            85°
          </button>
          <button
            onClick={() => sendCommand('120')}
            className='bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded'
          >
            120°
          </button>
        </div>
      </div>
      <div className='bg-gray-100 p-4 rounded-lg'>
        <h3 className='font-semibold mb-2'>Servo 2</h3>
        <div className='flex gap-2 justify-between items-center'>
          <button
            onClick={() => sendCommand('70')}
            className='bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded flex-1'
          >
            70°
          </button>
          <div className='h-px w-12 bg-gray-300'></div>
          <button
            onClick={() => sendCommand('90')}
            className='bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded flex-1'
          >
            90°
          </button>
          <div className='h-px w-12 bg-gray-300'></div>
          <button
            onClick={() => sendCommand('110')}
            className='bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded flex-1'
          >
            110°
          </button>
        </div>
      </div>
      <div className='bg-gray-100 p-4 rounded-lg'>
        <h3 className='font-semibold mb-2'>Servo 3</h3>
        <div className='flex gap-2'>
          <button
            onClick={() => sendCommand('90')}
            className='bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded'
          >
            90°
          </button>
          <button
            onClick={() => sendCommand('50')}
            className='bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded'
          >
            50°
          </button>
          <button
            onClick={() => sendCommand('130')}
            className='bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded'
          >
            130°
          </button>
        </div>
      </div>
    </div>
  );

  const ActionButtons = () => (
    <div className='grid grid-cols-2 gap-4'>
      <button
        onClick={() => sendCommand('gps')}
        className='bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-lg flex items-center justify-center gap-2'
      >
        <Gamepad2 size={20} /> GPS
      </button>
      <button
        onClick={() => sendCommand('sensor')}
        className='bg-yellow-500 hover:bg-yellow-600 text-white px-6 py-3 rounded-lg flex items-center justify-center gap-2'
      >
        <RotateCw size={20} /> Sensor
      </button>
      <button
        onClick={() => sendCommand('send')}
        className='bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg flex items-center justify-center gap-2'
      >
        <Send size={20} /> Send
      </button>
      <button
        onClick={() => sendCommand('reset')}
        className='bg-red-500 hover:bg-red-600 text-white px-6 py-3 rounded-lg flex items-center justify-center gap-2'
      >
        <RefreshCw size={20} /> Reset
      </button>
    </div>
  );

  const LiveStream = () => (
    <div className='bg-gray-50 p-4 rounded-lg h-full'>
      <h2 className='text-lg font-semibold mb-4'>Live Stream</h2>
      <div className='aspect-video bg-black rounded-lg overflow-hidden mb-5'>
        <img
          src={`http://12/stream`}
          alt='Live stream'
          className='w-full h-full object-cover'
          onError={e => {
            e.currentTarget.src =
              'https://images.unsplash.com/photo-1633269540827-728aabbb7646?q=80&w=1000&auto=format&fit=crop';
          }}
        />
      </div>
      <h2 className='text-lg font-semibold'>Actions</h2>
      <div className='bg-gray-50 p-4 rounded-lg'>
        <ActionButtons />
      </div>
    </div>
  );

  return (
    <div className='min-h-screen py-2'>
      <div className='max-w-7xl mx-auto space-y-8'>
        <div className='p-4 rounded-xl'>
          {status && (
            <div className='mb-4 p-3 bg-blue-100 text-blue-800 rounded-md'>
              {status}
            </div>
          )}

          <div className='grid lg:grid-cols-2 gap-8'>
            <div className='space-y-6'>
              <div className='bg-gray-50 p-4 rounded-lg'>
                <h2 className='text-lg font-semibold mb-4'>
                  Direction Control
                </h2>
                <div className='flex justify-center'>
                  <DirectionalControls />
                </div>
              </div>
              <div className='bg-gray-50 p-4 rounded-lg'>
                <h2 className='text-lg font-semibold mb-4'>Servo Controls</h2>
                <ServoControls />
              </div>
            </div>

            <LiveStream />
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiveControlPage;
