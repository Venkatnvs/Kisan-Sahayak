import React, { useEffect } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';
import L from 'leaflet';

const MapWithFields = ({ fieldDetails }) => {
  const map = useMap();

  useEffect(() => {
    const latlngs = fieldDetails?.geometry?.coordinates[0].map(coord => [
      coord[1],
      coord[0],
    ]);

    const polygon = L.polygon(latlngs, { color: '#E6E804', fillColor: '#db4f32' }).addTo(map);

    polygon.bindPopup(`<p>Area: ${fieldDetails?.size} acres</p>`).openPopup();

    const bounds = polygon.getBounds();
    map.fitBounds(bounds, { padding: [100, 40] });


    if (fieldDetails?.disease_locations?.length) {
      fieldDetails.disease_locations.forEach(marker => {
        const latLng = [marker.location.lat, marker.location.lng];
        const leafletMarker = L.marker(latLng).addTo(map);
        const markerData = `
          <div style="display: flex; align-items: center; gap: 8px; max-width: 260px;">
            <img src="${marker.img}" alt="${marker.crop_name}" style="width: 80px; height: 80px; object-fit: cover; border-radius: 6px;">
            <div style="display: flex; flex-direction: column; gap: 2px; font-size: 12px; line-height: 1.2;">
              <h3 style="margin: 0; font-size: 14px; font-weight: bold; color: #333;">${marker.crop_name}</h3>
              <p style="margin: 0;"><strong>Soil Moisture:</strong> ${marker.soil_moisture}%</p>
              <p style="margin: 0;"><strong>Humidity:</strong> ${marker.humidity}%</p>
              <p style="margin: 0;"><strong>Temperature:</strong> ${marker.temperature}°C</p>
              <p style="margin: 0;"><strong>Solution:</strong> ${marker.solution}</p>
              <a href="https://google.com/maps?q=${marker.location.lat},${marker.location.lng}" target="_blank">Open in Google Maps</a>
            </div>
          </div>`;
        leafletMarker.bindPopup(markerData).openPopup();


      });
    }

  }, [map, fieldDetails]);

  return null;
};

const DisplayMapView = ({ fieldDetails }) => {
  if (!fieldDetails.geometry) {
    return <div>Loading...</div>;
  }

  if (!fieldDetails) return null;
  if (!fieldDetails.geometry) return null;

  return (
    <div className='flex-col z-0 w-full h-full'>
      <MapContainer zoom={13} className='h-full'>
        <TileLayer
          url='https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}'
          attribution='&copy; <a href="https://www.google.com/maps">Google Maps</a> contributors'
        />
        <MapWithFields fieldDetails={fieldDetails} />
      </MapContainer>
    </div>
  );
};

export default DisplayMapView;