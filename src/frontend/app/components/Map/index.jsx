import { createContext, useContext, useEffect, useRef, useState } from 'react';

import { transform } from 'ol/proj';

import { click, createMap, MapContext, pointerMove } from './helpers.js';
import './map.css';

export default function Map({ children, parentClickHandler }) {

  let creatingMap = false;

  const elementRef = useRef();
  // const mapRef = useRef();

  const { map, setMap } = useContext(MapContext);

  useEffect(() => {
    if (creatingMap) { return; }  // only once
    creatingMap = true;

    const map = createMap();
    map.setTarget(elementRef.current);
    map.on('pointermove', pointerMove);
    map.on('click', clickHandler);
    setMap(map);
  }, []);
  window.map = map;

  function clickHandler(evt) {
    click(evt);
    parentClickHandler(evt);
    // console.log(transform(evt.coordinate, mapRef.current.getView().getProjection().getCode(), 'EPSG:4326'))
    // setSelected(mapRef.current.selectedFeature);
  }

  return (
    <div ref={elementRef} className="mapContainer">
      {children}
    </div>
  );
}
