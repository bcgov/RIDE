import { createContext, useContext, useEffect, useRef, useState } from 'react';

import { transform } from 'ol/proj';

import { MapContext } from '../../contexts';
import { click, createMap, pointerMove } from './helpers.js';

import './map.scss';

export default function Map({ children, dispatch }) {

  let creatingMap = false;

  const elementRef = useRef();

  const { map, setMap } = useContext(MapContext);

  useEffect(() => {
    if (creatingMap) { return; }  // only once
    creatingMap = true;

    const map = createMap();
    map.setTarget(elementRef.current);
    map.on('pointermove', pointerMove);
    map.on('click', (e) => click(e, dispatch));
    map.on('movestart', (e) => {
      if (e.map.start?.ref?.current) { e.map.start.ref.current.style.visibility = 'hidden'; }
      if (e.map.end?.ref?.current) { e.map.end.ref.current.style.visibility = 'hidden'; }
    })
    map.on('moveend', (e) => {
      e.map.start?.updateInfobox(e.map);
      e.map.end?.updateInfobox(e.map);
    })
    setMap(map);
  }, []);
  window.map = map;

  return (
    <div ref={elementRef} className="map-container">
      {children}
    </div>
  );
}
