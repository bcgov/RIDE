import { useCallback, useReducer, useRef, useState } from 'react';

import { Point, LineString, Polygon } from 'ol/geom';
import { circular } from 'ol/geom/Polygon';
import { transform } from 'ol/proj';
import { boundingExtent, getCenter } from 'ol/extent';

import Map from '../components/Map';
import Layer from '../components/Map/Layer';
import PinLayer from '../components/Map/PinLayer';
import { MapContext } from '../contexts';
import {
  getCoords, getDRA, getNearby, fetchRoute, ll2g, g2ll, getSnapped,
} from '../components/Map/helpers.js';
import RideFeature from '../components/Map/feature';
import {
  pinStartNormalStyle, pinStartHoverStyle, pinStartActiveStyle,
  pinEndNormalStyle, pinEndHoverStyle, pinEndActiveStyle,
} from '../components/Map/styles';

import './home.css';

import ContextMenu from './ContextMenu';
import EventForm, { eventReducer, getInitialEvent } from './forms';
import InfoBox from './InfoBox';
import Preview from './Preview';




export function meta() {
  return [
    { title: "RIDE Events" },
  ];
}

export default function Home() {

  const mapRef = useRef();

  const [ map, setMap ] = useState(null);
  const [ preview, setPreview ] = useState(true);
  const [ event, dispatch ] = useReducer(eventReducer, getInitialEvent());

  const centerMap = (coords) => {
    if (!map || !coords ) { return; }
    if (!Array.isArray(coords[0])) { coords = [coords]; }
    coords = coords.filter(el => el) // filter undefined elements, such as if end isn't set
    const extent = boundingExtent(coords);

    if (coords.length > 1) {
      map.getView().fit(extent, { duration: 300, padding: [100, 250, 100, 250]});
    } else {
      map.getView().animate({ center: getCenter(extent), duration: 300 });
    }
  }

  const cancel = () => {
    map.pins.getSource().removeFeature(map.start);
    map.pins.getSource().removeFeature(map.end);
    map.route.getGeometry().setCoordinates([]);
    map.start = map.end = null;
    dispatch({ type: 'reset form' });
  }

  mapRef.current = map;

  return (
    <div className="events-home">
      { !event.id && event.location.start.name &&
        <div className="panel">
          <EventForm
            map={mapRef.current}
            preview={() => setPreview(!preview)}
            cancel={cancel}
            event={event}
            dispatch={dispatch}
            goToFunc={centerMap}
          />
        </div>
      }

      <MapContext.Provider value={{ map, setMap }}>
        <Map dispatch={dispatch}>
          <PinLayer event={event} dispatch={dispatch} />
          <Layer name='events' />
        </Map>
      </MapContext.Provider>

      { event.location.start.name && event.showPreview &&
        <Preview dispatch={dispatch} preview={() => setPreview(!preview)} event={event} />
      }
    </div>
  );
}
