// React
import { useContext, useEffect, useReducer, useRef, useState } from 'react';

// Navigation
import { useNavigate } from 'react-router';
import { useSelector } from 'react-redux';

// OpenLayers
import { boundingExtent, getCenter } from 'ol/extent';

// Internal imports
import Map from '../components/Map';
import {
  BoundariesLayer, DmsLayer, EventsLayer, PinsLayer
} from '../components/Map/layers';
import { clearPins } from '../components/Map/layers/Pins';
import Layers from './Layers';
import { AlertContext, AuthContext, MapContext } from '../contexts';
import { ll2g, selectFeature } from '../components/Map/helpers.js';
import Tabs from '../shared/Tabs';
import Bubble from '../shared/Bubble';

import EventForm, { getInitialEvent } from './forms';
import reducer from './forms/reducer';
import Dms from './Dms';
import Preview from './Preview';
import Queue from './Queue';
import Events from './Events';

import { selectPending } from '../slices/events';
import { selectAllServiceAreaBoundaries } from '../slices/serviceAreaBoundaries';

// Styling
import './home.scss';

export function meta() {
  return [
    { title: "RIDE Events" },
  ];
}

export default function Home() {
  /* Navigation */
  const navigate = useNavigate();

  /* Hooks */
  // Contexts
  const { setAlertContext } = useContext(AlertContext);
  const { authContext } = useContext(AuthContext);

  // Refs
  const mapRef = useRef();

  // States
  const [ map, setMap ] = useState(null);
  const [ preview, setPreview ] = useState(true);
  const [ event, dispatch ] = useReducer(reducer, getInitialEvent());
  const [ sign, setSign ] = useState(null);
  const [ computed, setComputed ] = useState(null);

  // Selectors
  const visibleLayers = useSelector(state => state.visibleLayers);
  const serviceAreaBoundaries = useSelector(selectAllServiceAreaBoundaries);

  // Effects
  useEffect(() => {
    if (!authContext) { return; }

    if (authContext.loginStateKnown && !authContext.username) {
      // Redirect to landing page if not logged in
      // TODO: redirect back to this page after login, not required since this is the only page
      navigate('/');
    }
  }, [authContext]);

  useEffect(() => {
    if (!map) { return; }

    mapRef.current = map;
  }, [map]);

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
    clearPins(map);
    dispatch({ type: 'reset form', cancel: true });
  }

  const clickHandler = (e, event) => {
    if (event.showForm) {
      return;
    }

    const feature = e.map.getFeaturesAtPixel(e.pixel,{
      layerFilter: (layer) => layer.listenForClicks,
    })[0];

    if (feature?.noSelect || feature?.get('noSelect')) { return; }

    if (feature?.get('type') === 'sign') {
      selectFeature(e.map, feature);
      dispatch({ type: 'reset form' });
      setSign(feature.get('raw'));
      e.map.route.getGeometry().setCoordinates([]);
    } else if (feature?.styleState) { // new selection
      selectFeature(e.map, feature);
      const raw = feature.get('raw');
      dispatch({ type: 'reset form', value: raw, showPreview: true, showForm: false });
    } else if (e.map.selectedFeature) { // deselect existing selection
      selectFeature(e.map, null);
      dispatch({ type: 'reset form' });
      setSign(null);
      e.map.route.getGeometry().setCoordinates([]);
    }
  }

  const showPreview = event.showPreview && (event.location.start.name || event.type === 'CHAIN_UP');
  const showLayers = !showPreview && !sign;

  return authContext.loginStateKnown && authContext.username && (
    <div className="events-home">
      <div className="panel">
        <h3>Events</h3>
        <Tabs>
          <Tabs.Tab name='active' label='Active'>
            <Events dispatch={dispatch} goToFunc={centerMap} map={mapRef.current} current={event} />
          </Tabs.Tab>

          <Tabs.Tab name='queue' label={
            <span>
              Awaiting Approval
              <Bubble classes={'num'} selector={selectPending} />
            </span>
          }>
            <Queue dispatch={dispatch} goToFunc={centerMap} map={mapRef.current} />
          </Tabs.Tab>
        </Tabs>

        { (event.showForm || event.showHistory) && event.location.start.name &&
          <div className="form-overlay">
            <EventForm
              map={mapRef.current}
              preview={() => setPreview(!preview)}
              cancel={cancel}
              event={event}
              dispatch={dispatch}
              computed={computed}
              visibleLayers={visibleLayers}
              serviceAreaBoundaries={serviceAreaBoundaries}
              goToFunc={centerMap}
              setAlertContext={setAlertContext} />
          </div>
        }
      </div>

      <MapContext.Provider value={{ map, setMap }}>
        <Map dispatch={dispatch} event={event} clickHandler={clickHandler}>
          <PinsLayer event={event} dispatch={dispatch} />
          <BoundariesLayer />
          <DmsLayer event={event} dispatch={dispatch} />
          <EventsLayer event={event} dispatch={dispatch} />
          { showLayers && <Layers /> }
        </Map>
      </MapContext.Provider>

      { showPreview &&
        <Preview
          event={event}
          dispatch={dispatch}
          preview={() => setPreview(!preview)}
          onComputed={setComputed}
          mapRef={mapRef} />
      }

      { !showPreview && sign &&
        <Dms sign={sign} close={() => { selectFeature(map); setSign(null) }} />
      }
    </div>
  );
}
