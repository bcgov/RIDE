// React
import { useContext, useEffect, useReducer, useRef, useState } from 'react';

// Navigation
import { useNavigate } from 'react-router';

// OpenLayers
import { boundingExtent, getCenter } from 'ol/extent';

// Internal imports
import Map from '../components/Map';
import Layer from '../components/Map/Layer';
import Layers, { allLayers } from './Layers';
import PinLayer from '../components/Map/PinLayer';
import { AuthContext, MapContext } from '../contexts';
import { ll2g, selectFeature } from '../components/Map/helpers.js';

import EventForm, { eventReducer, getInitialEvent } from './forms';
import Preview from './Preview';
import Message from './Message';
import Queue from './Queue';

// Styling
import './home.scss';

export function meta() {
  return [
    { title: "RIDE Events" },
  ];
}

const layersInitial = () => {
  const stored = localStorage.getItem('visibleLayers');
  if (stored) { return JSON.parse(stored); }
  return allLayers;
}

export default function Home() {
  /* Setup */
  // Navigation
  const navigate = useNavigate();

  /* Hooks */
  // Context
  const { authContext } = useContext(AuthContext);

  // Refs
  const mapRef = useRef();

  const layersReducer = (visibleLayers, action) => {
    if (action.layer !== visibleLayers.layer) {
      const updated = { ...visibleLayers, [action.layer]: action.value };
      localStorage.setItem("visibleLayers", JSON.stringify(updated));
      if (mapRef.current) {
        mapRef.current.set('visibleLayers', updated);
      }
      return updated;
    }
    return visibleLayers;
  }

  // States
  const [ map, setMap ] = useState(null);
  const [ preview, setPreview ] = useState(true);
  const [ event, dispatch ] = useReducer(eventReducer, getInitialEvent());
  const [ visibleLayers, toggle ] = useReducer(layersReducer, layersInitial());
  const [ message, setMessage ] = useState('');

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
    coords = coords.filter(Boolean) // filter undefined elements, such as if end isn't set
    coords = coords.map((pair) => pair[0] > -180 ? ll2g(pair): pair);
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
    selectFeature(map, null);
    dispatch({ type: 'reset form', cancel: true });
  }

  const clickHandler = (e, event) => {
    if (event.showForm) {
      return;
    }

    const feature = e.map.getFeaturesAtPixel(e.pixel,{
      layerFilter: (layer) => layer.listenForClicks,
    })[0];

    if (feature?.noSelect) { return; }

    if (feature?.styleState) { // new selection
      selectFeature(e.map, feature);
      const raw = feature.get('raw');
      dispatch({ type: 'reset form', value: raw, showPreview: true, showForm: false });
    } else if (e.map.selectedFeature) { // deselect existing selection
      selectFeature(e.map, null);
      dispatch({ type: 'reset form' });
      e.map.route.getGeometry().setCoordinates([]);
    }
  }

  mapRef.current = map;
  if (mapRef.current && !mapRef.current.get('visibleLayers')) { mapRef.current.set('visibleLayers', visibleLayers); }

  const showLayers = !(event.showPreview && event.location.start.name);

  return authContext.loginStateKnown && authContext.username && (
    <div className="events-home">
      <div className="panel">
        { (event.showForm && event.location.start.name)
          ? <EventForm
              map={mapRef.current}
              preview={() => setPreview(!preview)}
              cancel={cancel}
              event={event}
              dispatch={dispatch}
              goToFunc={centerMap}
              setMessage={setMessage}
            />
          : <Queue dispatch={dispatch} goToFunc={centerMap} map={mapRef.current} />
        }
      </div>

      <MapContext.Provider value={{ map, setMap }}>
        <Map dispatch={dispatch} event={event} clickHandler={clickHandler}>
          <PinLayer event={event} dispatch={dispatch} />
          <Layer visibleLayers={visibleLayers} event={event} dispatch={dispatch} />
          { showLayers && <Layers visibleLayers={visibleLayers} dispatch={toggle} /> }
        </Map>
      </MapContext.Provider>

      { event.location.start.name && event.showPreview &&
        <Preview
          event={event}
          dispatch={dispatch}
          preview={() => setPreview(!preview)}
          mapRef={mapRef}
        />
      }
      <Message message={message} setMessage={setMessage} />
    </div>
  );
}
