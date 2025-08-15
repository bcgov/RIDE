import { createContext, useContext, useEffect, useRef, useState } from 'react';

import { transform } from 'ol/proj';

import { click, createMap, MapContext, pointerMove } from './helpers.js';
import './map.css';

export default function Map({ children, parentClickHandler, parentContextHandler }) {

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
    map.on('contextmenu', parentContextHandler);
    map.on('movestart', (e) => {
      if (e.map.start) { e.map.start.ref.current.style.visibility = 'hidden'; }
      if (e.map.end) { e.map.end.ref.current.style.visibility = 'hidden'; }
    })
    map.on('moveend', (e) => {
      e.map.start?.updateInfobox(e.map);
      e.map.end?.updateInfobox(e.map);
    })
    map.on('change', (e) => {
      console.log(e);
    })
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
    <div ref={elementRef} className="map-container">
      {children}
    </div>
  );
}
