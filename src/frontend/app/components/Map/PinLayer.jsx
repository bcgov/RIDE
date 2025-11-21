/* eslint-disable no-unused-vars */
import { useCallback, useContext, useEffect, useRef, useState } from 'react';

import GeoJSON from 'ol/format/GeoJSON.js';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import { Point, LineString, Polygon, Circle } from 'ol/geom';
import { circular } from 'ol/geom/Polygon';
import * as ol from 'ol';
import { transform } from 'ol/proj';
import { boundingExtent, getCenter } from 'ol/extent';
import { linear } from 'ol/easing';

import { MapContext } from '../../contexts';
import {
  getCoords, getDRA, getNearby, fetchRoute, ll2g, g2ll, getSnapped, Drag, coordsMatch
} from './helpers.js';
import { routeNormalStyle, routeActiveStyle, routeHoverStyle } from './styles.js';
import ContextMenu from '../../events/ContextMenu';
import InfoBox from '../../events/InfoBox';

window.ol = ol;
window.Circle = Circle;
window.Polygon = Polygon;
window.circular = circular;

import { PinFeature } from './feature.js';

const layer = new VectorLayer({
  classname: 'pins',
  visible: true,
  source: new VectorSource({ format: new GeoJSON() }),
  style: () => null
});
layer.listenForClicks = true;
layer.listenForContext = true;
layer.listenForHover = true;
layer.canDragFeatures = true;
layer.setZIndex(1000);


/* Handler for any event that triggers updating the point and related info
  * (such as dragging the pin to a new location):
  *   1. reset the form data for the point
  *   2. get the DRA info and update the form data
  *   3. move the pin to the closest geometric feature
  *   4. get the nearby references and add them to the form data
  */
export const endHandler = async (e, point, dispatch) => {
  const snapped = getSnapped(e.coordinate, e.pixel, e.map);
  dispatch({ type: point.action, value: { name: 'pending', pending: true, nearbyPending: false, coords: g2ll(snapped) }})
  point.getGeometry().setCoordinates(snapped);
  point.dra = await getDRA(snapped, point, e.map);
  const props = point.dra.properties;
  const aliases = [
    props?.ROAD_NAME_ALIAS1,
    props?.ROAD_NAME_ALIAS2,
    props?.ROAD_NAME_ALIAS3,
    props?.ROAD_NAME_ALIAS4,
  ].filter(el => el);
  point.updateInfobox(e.map);

  dispatch({
    type: point.action,
    value: {
      ... props,
      name: props?.ROAD_NAME_FULL,
      alias: aliases[0],
      aliases,
      pending: false, nearbyPending: true
    }
  });

  if (point.dra.closest) {
    const coords = ll2g(point.dra.closest.geometry.coordinates);
    point.getGeometry().setCoordinates(coords);
  }

  if (point.dra.properties) {
    point.nearby = await getNearby(g2ll(point.getGeometry().getCoordinates()));
    if (point.nearby[0]) { point.nearby[0].include = true; }
    dispatch({
      type: point.action,
      value: {
        ... point.dra.properties,
        nearbyPending: false,
        pending: false,
        nearby: point.nearby
      }
    });
  }

  point.updateInfobox(e.map);
  updateRoute(e.map);
};

  /* Given an always present (possibly empty) route feature on the map: if
  * there's a start and end point, ask for a route, and if a route is received,
  * update the feature's geometry.  Otherwise, blank the geometry to hide the
  * route
  */
export const updateRoute = async (map) => {
  console.log('updating route', map.start, map.end);
  let route = [];
  if (map.start && map.end) {
    const startCoordinates = g2ll(map.start.getGeometry().getCoordinates());
    const endCoordinates = g2ll(map.end.getGeometry().getCoordinates());
    const points = [
      startCoordinates[0], startCoordinates[1],
      endCoordinates[0], endCoordinates[1]
    ];
    const results = await fetchRoute(points);
    if (results.route) {
      route = results.route.map((pair) => ll2g(pair));
    }
  }
  map.route.getGeometry().setCoordinates(route);
}


export default function PinLayer({ event, dispatch, startRef, endRef }) {
  const { map } = useContext(MapContext);
  const [ contextMenu, setContextMenu ] = useState([]);
  const [canStartEvent, setCanStartEvent] = useState(true);
  const menuRef = useRef();
  const eventRef = useRef();
  eventRef.current = event;

  useEffect(() => {
    if (!map) { return; }

    if (!map.get('pins')) {
      map.addLayer(layer);
      map.pins = layer;
      map.set('pins', layer);
      // map.on('click', clickHandler);
      map.on('contextmenu', contextHandler);
      map.getInteractions().extend([
        new Drag({ endHandler, menuRef, resetContextMenu: () => setContextMenu([]), dispatch })
      ]);
      map.route = new PinFeature({ style: 'route', geometry: new LineString([])})
      layer.getSource().addFeature(map.route);
      map.location = new PinFeature({
        style: 'location',
        geometry: new Point([]),
      });
      map.location.noHover = true;
      map.location.noSelect = true;
      layer.getSource().addFeature(map.location);
    }
  });

  // co-ordinate visible pins with current event
  useEffect(() => {
    if (!map) { return; }

    if (event.location.start?.name && event.showForm) { // start location but no pin
      const coords = ll2g(event.location.start.coords);
      if (map.start) {
        map.start.getGeometry().setCoordinates(coords);
      } else {
        map.start = new PinFeature({
          style: 'start', geometry: new Point(coords), ref: startRef, action: 'set start',
        });
        map.start.dra = { properties: event.location.start }
        map.pins.getSource().addFeature(map.start);
      }
      map.start.updateInfobox(map);
    } else if (map.start) { // no start location but start pin exists
      map.pins.getSource().removeFeature(map.start);
      map.start = null;
    }

    if (event.location.end?.name) { // end location but no pin
      const coords = ll2g(event.location.end.coords);
      if (map.end) {
        map.end.getGeometry().setCoordinates(coords);
      } else {
        map.end = new PinFeature({
          style: 'end', geometry: new Point(coords), ref: endRef, action: 'set end',
        });
        map.end.dra = { properties: event.location.end }
        map.pins.getSource().addFeature(map.end);
      }
      map.end.updateInfobox(map);

      const route = event.geometry?.geometries[2]?.coordinates;
      if (route && route.length > 0) {
        map.route.getGeometry().setCoordinates(route.map(cc => ll2g(cc)))
      }

    } else if (map.end) { // no end location but end pin exists
      map.pins.getSource().removeFeature(map.end);
      map.end = null;
    }

    // const route = event.geometry?.geometries[2]?.coordinates;
    // if (map.start && map.end && route) {
    //     console.log('resetting');
    //   map.route.getGeometry().setCoordinates(route.map(cc => ll2g(cc)));
    // } else {
    //     console.log('rreesetting', event.geometry?.geometries);
    //   map.route.getGeometry().setCoordinates([]);
    // }
  }, [event]);

  /* If there's no feature at the click, create a start point if none exists, an
   * end point if a start point is present, or nothing if both are present.
   */
  const clickHandler = (e) => {
    const feature = e.map.getFeaturesAtPixel(e.pixel,{
      layerFilter: (layer) => layer.listenForClicks,
    })[0];

    if (!feature) {
      const coords = getSnapped(e.coordinate, e.pixel, e.map);
      if (!e.map.start) {
        e.map.start = new PinFeature({
          style: 'start',
          geometry: new Point(coords),
          ref: startRef,
          action: 'set start',
        });
        e.map.pins.getSource().addFeature(e.map.start);
        e.map.getView().animate({ center: coords, duration: 250, easing: linear });
        endHandler(e, e.map.start, dispatch);
      } else if (!e.map.end) {
        e.map.end = new PinFeature({
          style: 'end',
          geometry: new Point(coords),
          ref: endRef,
          action: 'set end',
        });
        e.map.pins.getSource().addFeature(e.map.end);
        const ex = boundingExtent([coords, e.map.start.getGeometry().getCoordinates()]);
        e.map.getView().animate({ center: getCenter(ex), duration: 500, easing: linear });
        endHandler(e, e.map.end, dispatch);
        updateRoute(e.map);
      }
    }
  };

  /* Remove a pin from the map and update the event.  If the pin removed is the
   * start pin and there's an end pin, make the end pin the new start pin.
   */
  const removePin = (feature, map) => {
    if (feature === map.start) {
      map.pins.getSource().removeFeature(map.start);
      map.start = null;

      if (map.end) {
        console.log('swapping');
        map.end.resetStyle('start');
        map.end.ref = startRef;
        endRef.current.style.visibility = 'hidden';
        map.end.action = 'set start';
        map.start = map.end;
        map.end = null;
        startRef.current.style.visibility = 'unset';
        map.start.updateInfobox(map);
        dispatch({
          type: 'swap location',
          source: 'end',
          value: eventRef.current.location.end,
          target: 'start'
        });
      } else {
        dispatch({ type: 'remove location', key: 'start' });
      }
    } else if (feature === map.end) {
      map.pins.getSource().removeFeature(map.end);
      map.end = null;
      dispatch({ type: 'remove location', key: 'end' });
    }
    updateRoute(map);
  }


  const contextHandler = (e) => {
    e.preventDefault();
    const feature = e.map.getFeaturesAtPixel(e.pixel, {
      layerFilter: (layer) => layer.listenForClicks,
    })[0];

    menuRef.current.style.left = (e.pixel[0] - 2) + 'px';
    menuRef.current.style.top = (e.pixel[1] - 2)+ 'px';
    menuRef.current.style.visibility = undefined;
    if (feature) {
      const map = e.map; // necessary to bind map for callback below
      if (feature === e.map.route) { return; }
      if (feature === e.map.start || feature === e.map.end) {
        e.stopPropagation();
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
    }
  };

  return <>
    <InfoBox className="startInfo" ref={startRef} point={event.location?.start} />
    <InfoBox className="endInfo" ref={endRef} point={event.location?.end} />
    <ContextMenu ref={menuRef} options={contextMenu} setContextMenu={setContextMenu} />
  </>;
}
