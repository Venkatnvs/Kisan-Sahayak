import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, FeatureGroup, useMap } from 'react-leaflet';
import { EditControl } from 'react-leaflet-draw';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';
import { GeoSearchControl, OpenStreetMapProvider } from 'leaflet-geosearch';
import 'leaflet-geosearch/dist/geosearch.css';
import { calculateArea, MetersAreaToAcres } from '../scripts/utils';
import L from 'leaflet';

const SearchField = () => {
  const map = useMap();

  useEffect(() => {
    const provider = new OpenStreetMapProvider();

    const searchControl = new GeoSearchControl({
      provider,
      style: '',
      showMarker: true,
      showPopup: false,
      retainZoomLevel: false,
      animateZoom: true,
      autoClose: true,
      searchLabel: 'Enter address',
      keepResult: true,
    });

    map.addControl(searchControl);

    return () => map.removeControl(searchControl);
  }, [map]);

  return null;
};

const MapComponent = ({
  selectedField,
  setSelectedField = () => {},
  setCurrentStep = () => {},
}) => {
  const handleDrawCreated = e => {
    const layer = e.layer;
    if (layer instanceof L.Polygon) {
      const shape = layer.toGeoJSON();
      const latLngs = layer.getLatLngs()[0];
      const area = calculateArea(latLngs);
      const acers = MetersAreaToAcres(area);

      setSelectedField({
        coordinates: latLngs,
        size: acers,
        geometry: shape.geometry,
      });
      setCurrentStep(2);
      layer.bindPopup(`<p>Area: ${acers} acres</p>`).openPopup();
      setTimeout(() => {
        layer.closePopup();
      }, 2000);
    }
  };

  return (
    <div className='flex-1 z-0'>
      <MapContainer
        center={[15.667104, 76.701766]}
        zoom={13}
        className='h-full'
      >
        <TileLayer
          url='https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}'
          attribution='&copy; <a href="https://www.google.com/maps">Google Maps</a> contributors'
        />
        <SearchField />
        <FeatureGroup pathOptions={{ color: '#E6E804', fillColor: '#db4f32' }}>
          <EditControl
            position='topright'
            onCreated={handleDrawCreated}
            draw={{
              rectangle: false,
              polygon: selectedField ? false : true,
              circle: false,
              polyline: false,
              circlemarker: false,
            }}
          />
        </FeatureGroup>
      </MapContainer>
    </div>
  );
};

export default MapComponent;
