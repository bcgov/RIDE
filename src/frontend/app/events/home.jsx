import { useCallback, useRef, useState } from 'react';

import { Point, LineString, Polygon } from 'ol/geom';
import { circular } from 'ol/geom/Polygon';
import { transform } from 'ol/proj';

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
import EventForm from './forms';
import InfoBox from './InfoBox';


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
  const [ start, setStart ] = useState(false);
  const [ end, setEnd ] = useState(false);
  const [ selected, setSelected] = useState(false);
  const [ contextMenu, setContextMenu] = useState([]);


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
      // console.log(coords);
      if (!e.map.start) {
        e.map.start = new RideFeature({ style: 'start', geometry: new Point(coords) });
        e.map.start.setFunc = setStart;
        e.map.start.ref = startRef;
        e.map.pins.getSource().addFeature(e.map.start);

        endHandler(e, e.map.start);
      } else if (!e.map.end) {
        e.map.end = new RideFeature({ style: 'end', geometry: new Point(coords) });
        e.map.pins.getSource().addFeature(e.map.end);
        e.map.end.setFunc = setEnd;
        e.map.end.ref = endRef;
        endHandler(e, e.map.end);
        updateRoute(e.map);
      }
    } else if (e.originalEvent.shiftKey) {
      removePin(feature, e.map);
    }
  }, [contextMenu]);

  const removePin = (feature, map) => {
    if (feature.ref.current) {
      feature.ref.current.style.visibility = 'hidden';
    }
    if (feature === map.start) {
      map.pins.getSource().removeFeature(map.start);
      map.start = null;
      if (map.end) {
        map.start = map.end;
        map.start.setFunc = setStart;
        map.start.ref = startRef;
        map.end = null;
        startRef.current.style.top = endRef.current.style.top;
        startRef.current.style.left = endRef.current.style.left;
        endRef.current.style.visibility = 'hidden';
        startRef.current.style.visibility = '';
        setStart({ ...map.start.dra.properties, nearby: map.start.nearby });
        setEnd(null)
        map.start.normal = pinStartNormalStyle.clone();
        map.start.hover = pinStartHoverStyle.clone();
        map.start.active = pinStartActiveStyle.clone();
        map.start.updateStyle();
      } else {
        setStart(null);
      }
    } else if (feature === map.end) {
      map.pins.getSource().removeFeature(map.end);
      map.end = null;
      setEnd(null);
    }
    updateRoute(map);
  }

  const endHandler = async (e, point) => {
    // const cc = getCoords(e.map, point);
    const cc = getSnapped(e);
    point.setFunc({ pending: true, nearbyPending: false });
    point.getGeometry().setCoordinates(cc);
    point.updateInfobox(e.map);

    point.dra = await getDRA(cc, point, e.map);
    point.setFunc({... point.dra.properties, nearbyPending: true, pending: false });
    if (point.dra.closest) {
      const coords = ll2g(point.dra.closest.geometry.coordinates);
      point.getGeometry().setCoordinates(coords);
    }
    if (point.dra?.properties) {
      point.nearby = await getNearby(g2ll(point.getGeometry().getCoordinates()));
      point.setFunc({... point.dra.properties, nearbyPending: false, pending: false, nearby: point.nearby });
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

  mapRef.current = map;

  return (
    <div className="events-home">
      { start &&
        <div className="panel">
          <EventForm start={start} end={end} map={mapRef.current} />
        </div>
      }

      <MapContext.Provider value={{ map, setMap }}>
        <Map parentClickHandler={clickHandler} parentContextHandler={contextHandler}>
          <PinLayer upCallback={endHandler} menuRef={menuRef} />
          <Layer name='events' />
          <InfoBox className="startInfo" ref={startRef} point={start} />
          <InfoBox className="endInfo" ref={endRef} point={end} />
          <ContextMenu ref={menuRef} options={contextMenu}></ContextMenu>
        </Map>
      </MapContext.Provider>
      {/* <div className="map-container">
      </div> */}
    </div>
  );
}
