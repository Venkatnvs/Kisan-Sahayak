import React from 'react'
import { BrowserRouter, Route, Routes } from "react-router-dom";
import routes from './router';
import { Toaster } from './components/ui/sonner';

import L from 'leaflet';

delete L.Icon.Default.prototype._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

function App() {
  return (
    <>
      <BrowserRouter>
        <Routes>
          <Route>
            {routes.map((route) => {
              return (
                <Route
                  key={route.name}
                  path={route.path}
                  element={<route.element />}
                />
              );
            })}
          </Route>
          <Route
            path="*"
            element={<p className="text-white-1">404 Not Found</p>}
          />
        </Routes>
      </BrowserRouter>
      <Toaster />
    </>
  )
}

export default App
