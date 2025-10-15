// React
import { useCallback, useContext, useEffect, useReducer, useRef, useState } from 'react';

// Navigation
import { useNavigate } from 'react-router';

// OpenLayers
import { Point, LineString, Polygon } from 'ol/geom';
import { circular } from 'ol/geom/Polygon';
import { transform } from 'ol/proj';
import { boundingExtent, getCenter } from 'ol/extent';

// Internal imports
import Map from '../components/Map';
import Layer from '../components/Map/Layer';
import PinLayer from '../components/Map/PinLayer';
import { AuthContext, MapContext } from '../contexts';
import {
  getCoords, getDRA, getNearby, fetchRoute, ll2g, g2ll, getSnapped,
} from '../components/Map/helpers.js';
import RideFeature from '../components/Map/feature';
import {
  pinStartNormalStyle, pinStartHoverStyle, pinStartActiveStyle,
  pinEndNormalStyle, pinEndHoverStyle, pinEndActiveStyle,
} from '../components/Map/styles';
import ContextMenu from './ContextMenu';
import EventForm, { eventReducer, getInitialEvent } from './forms';
import InfoBox from './InfoBox';
import Preview from './Preview';

// Styling
import './home.css';

export function meta() {
  return [
    { title: "RIDE Events" },
  ];
}

export default function Home() {
  /* Setup */
  // Navigation
  const navigate = useNavigate();

  /* Hooks */
  // Context
  const { authContext, _setAuthContext } = useContext(AuthContext);

  // Refs
  const mapRef = useRef();
  const startRef = useRef();
  const endRef = useRef();

  // States
  const [ map, setMap ] = useState(null);
  const [ preview, setPreview ] = useState(true);
  const [ event, dispatch ] = useReducer(eventReducer, getInitialEvent());

  // Effects
  useEffect(() => {
    if (!authContext) { return; }

    if (authContext.loginStateKnown && !authContext.username) {
      // Redirect to landing page if not logged in
      // TODO: redirect back to this page after login, not required since this is the only page
      navigate('/');
    }
  }, [authContext]);

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

  return authContext.loginStateKnown && authContext.username && (
    <div className="events-home">
      { event.showForm && event.location.start.name &&
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
          <PinLayer event={event} dispatch={dispatch} startRef={startRef} endRef={endRef} />
          <Layer name='events' event={event} dispatch={dispatch} startRef={startRef} endRef={endRef} />
        </Map>
      </MapContext.Provider>

      { event.location.start.name && event.showPreview &&
        <Preview dispatch={dispatch} preview={() => setPreview(!preview)} event={event} />
      }
    </div>
  );
}
