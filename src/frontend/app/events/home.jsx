import { useRef, useState } from 'react';

import Map from '../components/Map';
import Layer from '../components/Map/Layer';
import { MapContext } from '../components/Map/helpers.js';

import './home.css';

import EventForm from './forms';

export function meta() {
  return [
    { title: "RIDE Events" },
  ];
}

export default function Home() {

  const mapRef = useRef();

  const [ map, setMap ] = useState(null);
  const [ selected, setSelected] = useState(true);

  const clickHandler = (evt) => {
    setSelected(evt.map.selectedFeature)
  }

  mapRef.current = map;

  return (
    <div className="events-home">
      { selected &&
        <div className="panel">
            <EventForm />
        </div>
      }
      <MapContext.Provider value={{ map, setMap }}>
        <Map parentClickHandler={clickHandler}>
          <Layer name='a' />
        </Map>
      </MapContext.Provider>
    </div>
  );
}
