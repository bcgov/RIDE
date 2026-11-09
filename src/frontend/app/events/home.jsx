// React
import { useContext, useEffect, useReducer, useRef, useState } from 'react';

// Navigation
import { useNavigate, useSearchParams } from 'react-router';
import { shallowEqual, useSelector } from 'react-redux';
import { createSelector } from '@reduxjs/toolkit';

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
import RequestOrgForm from '../users/forms/requestOrg';

import EventForm, { getInitialEvent } from './forms';
import reducer from './forms/reducer';
import Dms from './Dms';
import Preview from './Preview';
import Queue from './Queue';
import Events from './Events';

import { memoizedPending, selectAllEvents, selectEventsLoaded } from '../slices/events';
import { rememberReturnPath } from '../shared/helpers';
import { selectAllServiceAreaBoundaries } from '../slices/serviceAreaBoundaries';

// Styling
import './home.scss';

export function meta() {
  return [
    { title: "RIDE Events" },
  ];
}


const NO_EVENTS = [];

export default function Home() {
  /* Navigation */
  const navigate = useNavigate();
  const [ searchParams, setSearchParams ] = useSearchParams();

  /* Hooks */
  // Contexts
  const { setAlertContext } = useContext(AlertContext);
  const { authContext } = useContext(AuthContext);

  // Refs
  const mapRef = useRef();
  const modalRef = useRef();
  const linkedEventId = useRef(searchParams.get('event'));  // DBC22-7322: "View on RIDE" links

  // States
  const [ map, setMap ] = useState(null);
  const [ preview, setPreview ] = useState(true);
  const [ event, dispatch ] = useReducer(reducer, getInitialEvent());
  const [ sign, setSign ] = useState(null);
  const [ computed, setComputed ] = useState(null);

  const [ requestingOrg, setRequestingOrg ] = useState(false);

  // Selectors
  const visibleLayers = useSelector(state => state.visibleLayers);
  const serviceAreaBoundaries = useSelector(selectAllServiceAreaBoundaries);
  // DBC22-7322: only the linked event's versions, and only until it's opened,
  // so polls don't re-render the page
  const linkedVersions = useSelector(
    (state) => linkedEventId.current ? selectAllEvents(state).filter((e) => e.id === linkedEventId.current) : NO_EVENTS,
    shallowEqual,
  );
  const eventsLoaded = useSelector(selectEventsLoaded);
  const pending = createSelector(
    [memoizedPending],
    (events) => events.filter((event) => (authContext.service_areas || []).includes(event.service_area)),
  );

  // Effects
  useEffect(() => {
    if (!authContext) { return; }

    if (authContext.loginStateKnown) {
      if (!authContext.username) {
        // Redirect to landing page if not logged in, returning here after login
        rememberReturnPath();
        navigate('/');

      } else if (authContext.request_organization) {
        setRequestingOrg(true);
      }
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

  // DBC22-7322: open the event linked from a notification email
  useEffect(() => {
    const id = linkedEventId.current;
    if (!id || !map || !authContext.username || !eventsLoaded) { return; }

    linkedEventId.current = null;
    setSearchParams((params) => { params.delete('event'); return params; }, { replace: true });

    const versions = linkedVersions;
    const linked = versions.find((e) => e.latest) || versions[0];
    if (!linked) {
      setAlertContext({ message: `Event ${id} is no longer shown in RIDE. It may have been cleared.` });
      return;
    }

    const canReview = authContext.is_approver || authContext.is_superuser;
    if (linked.type === 'CHAIN_UP' && canReview) {
      navigate('/chainups/');
      return;
    }

    // Same as editing from the events list or reviewing from the queue; like
    // the map menu, cleared events and events outside the user's service
    // areas (which the API won't let them save) open preview only
    const isPending = linked.latest && !linked.latest_approved;
    const activeOrPending = linked.status === 'Active' || !linked.approved;
    // The form only shows for users with an organization (hasOrganization)
    const userAreas = authContext.service_areas || [];
    const inUserAreas = userAreas.length > 0 && (authContext.is_superuser || userAreas.includes(linked.service_area));
    const showForm = linked.type !== 'CHAIN_UP' && inUserAreas && activeOrPending && (!isPending || canReview);
    centerMap(linked.location.start.coords);
    dispatch({ type: 'reset form', value: linked, showPreview: true, showForm });
    selectFeature(map, map.get('events')?.getSource().get(linked.id));
  }, [map, linkedVersions, eventsLoaded, authContext]);

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
  if (requestingOrg) {
    modalRef.current?.showModal();
  } else {
    modalRef.current?.close();
  }

  const hasOrganization = (authContext.service_areas || []).length > 0;

  return authContext.loginStateKnown && authContext.username && (
    <div className="events-home">
      { hasOrganization &&
        <div className="panel">
          <h3>Events</h3>
          <Tabs>
            <Tabs.Tab name='active' label='Active'>
              <Events dispatch={dispatch} goToFunc={centerMap} map={mapRef.current} current={event} />
            </Tabs.Tab>

            <Tabs.Tab name='queue' label={
              <span>
                Awaiting Approval
                <Bubble classes={'num'} selector={pending} />
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
                eventDispatch={dispatch}
                computed={computed}
                visibleLayers={visibleLayers}
                serviceAreaBoundaries={serviceAreaBoundaries}
                goToFunc={centerMap}
                setAlertContext={setAlertContext} />
            </div>
          }
        </div>
      }

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

      <dialog className="modal" ref={modalRef}>
        <RequestOrgForm setRequestingOrg={setRequestingOrg} />
      </dialog>
    </div>
  );
}
