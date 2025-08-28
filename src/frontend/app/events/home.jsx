import { useCallback, useReducer, useRef, useState } from 'react';

import { Point, LineString, Polygon } from 'ol/geom';
import { circular } from 'ol/geom/Polygon';
import { transform } from 'ol/proj';
import { boundingExtent, getCenter } from 'ol/extent';
import { linear } from 'ol/easing';

import Map from '../components/Map';
import Layer from '../components/Map/Layer';
import PinLayer from '../components/Map/PinLayer';
import {
  MapContext, getCoords, getDRA, getNearby, fetchRoute, ll2g, g2ll, getSnapped,
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
  const menuRef = useRef();
  const startRef = useRef();
  const endRef = useRef();

  const [ map, setMap ] = useState(null);
  const [ contextMenu, setContextMenu] = useState([]);
  const [ preview, setPreview ] = useState(false);
  const [ event, dispatch ] = useReducer(eventReducer, getInitialEvent());

  const clickHandler = useCallback((e) => {
    if (menuRef.current.classList.contains('open')) {
      setContextMenu([]);
      return;
    }
    const feature = e.map.getFeaturesAtPixel(e.pixel,{
      layerFilter: (layer) => layer.listenForClicks,
    })[0];
    if (!feature) {
      const coords = getSnapped(e);
      if (!e.map.start) {
        e.map.start = new RideFeature({ style: 'start', geometry: new Point(coords) });
        // e.map.start.setFunc = setStart;
        e.map.start.action = 'set start';
        e.map.start.ref = startRef;
        e.map.pins.getSource().addFeature(e.map.start);
        e.map.getView().animate({ center: coords, duration: 250, easing: linear });

        endHandler(e, e.map.start);
      } else if (!e.map.end) {
        e.map.end = new RideFeature({ style: 'end', geometry: new Point(coords) });
        e.map.pins.getSource().addFeature(e.map.end);

        const ex = boundingExtent([coords, e.map.start.getGeometry().getCoordinates()]);
        e.map.getView().animate({ center: getCenter(ex), duration: 500, easing: linear });
        // e.map.end.setFunc = setEnd;
        e.map.end.action = 'set end';
        e.map.end.ref = endRef;
        endHandler(e, e.map.end);
        updateRoute(e.map);
      }
    } else if (e.originalEvent.shiftKey) {
      removePin(feature, e.map);
    }
  }, [contextMenu]);

  const removePin = (feature, map) => {
    if (feature?.ref?.current) {
      feature.ref.current.style.visibility = 'hidden';
    }
    if (feature === map.start) {
      map.pins.getSource().removeFeature(map.start);
      map.start = null;
      if (map.end) {
        map.start = map.end;
        map.start.ref = startRef;
        map.end = null;
        startRef.current.style.top = endRef.current.style.top;
        startRef.current.style.left = endRef.current.style.left;
        endRef.current.style.visibility = 'hidden';
        startRef.current.style.visibility = '';
        map.start.normal = pinStartNormalStyle.clone();
        map.start.hover = pinStartHoverStyle.clone();
        map.start.active = pinStartActiveStyle.clone();
        map.start.updateStyle();
        dispatch({ type: 'swap location', source: 'end', value: event.location.end, target: 'start' });
      } else {
        dispatch({ type: 'remove location', key: 'start' });
      }
    } else if (feature === map.end) {
      map.pins.getSource().removeFeature(map.end);
      map.end = null;
      dispatch({ type: 'remove location', key: 'end' });
      // setEnd(null);
    }
    updateRoute(map);
  }

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

  const endHandler = async (e, point) => {
    const cc = getSnapped(e);
    dispatch({ type: point.action, value: { pending: true, nearbyPending: false, coords: cc }})
    point.getGeometry().setCoordinates(cc);
    point.updateInfobox(e.map);

    point.dra = await getDRA(cc, point, e.map);
    const props = point.dra.properties;
    const aliases = [
      props.ROAD_NAME_ALIAS1,
      props.ROAD_NAME_ALIAS2,
      props.ROAD_NAME_ALIAS3,
      props.ROAD_NAME_ALIAS4,
    ].filter(el => el);

    dispatch({ type: point.action, value: { ... props, name: props.ROAD_NAME_FULL, alias: aliases[0], aliases, pending: false, nearbyPending: true }})
    if (point.dra.closest) {
      const coords = ll2g(point.dra.closest.geometry.coordinates);
      point.getGeometry().setCoordinates(coords);
    }
    if (point.dra?.properties) {
      point.nearby = await getNearby(g2ll(point.getGeometry().getCoordinates()));
      if (point.nearby[0]) { point.nearby[0].include = true; }
      // point.setFunc({... point.dra.properties, nearbyPending: false, pending: false, nearby: point.nearby });
      dispatch({ type: point.action, value: {... point.dra.properties, nearbyPending: false, pending: false, nearby: point.nearby }})
    }
    point.updateInfobox(e.map);

    updateRoute(e.map);
  };


  const updateRoute = async (map) => {
    const currentProjection = map.getView().getProjection().getCode();
    if (map.start && map.end) {
      const startCoordinates = transform(
        map.start.getGeometry().getCoordinates(),
        currentProjection,
        'EPSG:4326'
      );
      const endCoordinates = transform(
        map.end.getGeometry().getCoordinates(),
        currentProjection,
        'EPSG:4326'
      );
      const points = [
        startCoordinates[0], startCoordinates[1],
        endCoordinates[0], endCoordinates[1]
      ];
      const results = await fetchRoute(points);
      if (results.route) {
        const coords = results.route.map((pair) => (
          transform(pair, 'EPSG:4326', currentProjection)
        ));
        map.route.getGeometry().setCoordinates(coords);
      }
    } else {
      map.route.getGeometry().setCoordinates([]);
    }
  }

  const contextHandler = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const feature = e.map.getFeaturesAtPixel(e.pixel, {
      layerFilter: (layer) => layer.listenForClicks,
    })[0];

    menuRef.current.style.left = e.pixel[0] + 'px';
    menuRef.current.style.top = e.pixel[1] + 'px';
    menuRef.current.style.visibility = undefined;
    if (feature) {
      if (feature === e.map.route) { return; }
      const map = e.map
      setContextMenu([
        {
          label: 'Remove pin',
          action: (e) => {
            e.stopPropagation();
            removePin(feature, map);
            setContextMenu([]);
          }
        },
      ]);
    }
  };

  const cancel = useCallback(() => {
    removePin(map.end, map);
    removePin(map.start, map);
    dispatch({ type: 'reset form' });
  }, [map]);

  mapRef.current = map;

  return (
    <div className="events-home">
      { event.location.start.name &&
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
        <Map parentClickHandler={clickHandler} parentContextHandler={contextHandler}>
          <PinLayer upCallback={endHandler} menuRef={menuRef} />
          <Layer name='events' />
          <InfoBox className="startInfo" ref={startRef} point={event.location.start} />
          <InfoBox className="endInfo" ref={endRef} point={event.location.end} />
          <ContextMenu ref={menuRef} options={contextMenu}></ContextMenu>
        </Map>
      </MapContext.Provider>

      { event.location.start.name && preview &&
        <Preview preview={() => setPreview(!preview)} event={event} />
      }
    </div>
  );
}
