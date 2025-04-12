import React from 'react';
import DisplayMapView from './DisplayMapView';
import { Separator } from '@/components/ui/separator';
import WeatherDetails from './WeatherDetails';
import ForecastDetails from './ForecastDetails';

const FieldDetailsFull = ({ fieldData }) => {
  return (
    <section className='flex flex-col gap-4 h-full w-full px-2'>
        <div className="min-h-[90vh] flex rounded-xl bg-gray-300/50 p-2 md:p-4 w-full h-full flex-col mt-5">
          <h3 className="text-xl my-2">Field Map</h3>
          <DisplayMapView fieldDetails={fieldData} />
        </div>

        <Separator />

        <div className="flex rounded-xl bg-gray-300/50 p-2 md:p-4 w-full flex-col">
          <h3 className="text-xl my-2">Weather Details</h3>
          <WeatherDetails weatherData={fieldData?.weather} />
        </div>

        <Separator />

        <div className="flex flex-col w-full max-w-[calc(100vw-1.5rem)] sm:max-w-[calc(100vw-6rem)] md:max-w-[calc(100vw-12rem)] lg:max-w-[calc(100vw-18rem)] rounded-xl bg-gray-300/50 p-2 sm:p-3 md:p-4 lg:p-6">
          <h3 className="text-xl mt-2">Forecast Details</h3>
          <p className="text-sm text-gray-500 mb-2">5 Day Forecast</p>
          <ForecastDetails forecastData={fieldData?.forecast} />
        </div>
    </section>
  );
};

export default FieldDetailsFull;
