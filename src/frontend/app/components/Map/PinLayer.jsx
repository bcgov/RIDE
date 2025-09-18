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

import {
  getCoords, getDRA, getNearby, fetchRoute, ll2g, g2ll, getSnapped, Drag, MapContext,
} from './helpers.js';
import { routeNormalStyle, routeActiveStyle, routeHoverStyle } from './styles.js';
import ContextMenu from '../../events/ContextMenu';
import InfoBox from '../../events/InfoBox';

window.ol = ol;
window.Circle = Circle;
window.Polygon = Polygon;
window.circular = circular;

import RideFeature from './feature.js';

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


export default function PinLayer({ event, dispatch }) {
  const { map } = useContext(MapContext);
  const [ contextMenu, setContextMenu ] = useState([]);
  const menuRef = useRef();
  const startRef = useRef();
  const endRef = useRef();

  useEffect(() => {
    if (!map) { return; }

    if (!map.get('pins')) {
      map.addLayer(layer);
      map.pins = layer;
      map.set('pins', layer);
      map.on('click', clickHandler);
      map.on('contextmenu', contextHandler);
      map.getInteractions().extend([
        new Drag({ endHandler, menuRef, resetContextMenu: () => setContextMenu([]) })
      ]);
      map.route = new RideFeature({ style: 'route', geometry: new LineString([])})
      layer.getSource().addFeature(map.route);
    }
  });

  /* If there's no feature at the click, create a start point if none exists, an
   * end point if a start point is present, or nothing if both are present.
   */
  const clickHandler = (e) => {
    const feature = e.map.getFeaturesAtPixel(e.pixel,{
      layerFilter: (layer) => layer.listenForClicks,
    })[0];

    if (!feature) {
      const coords = getSnapped(e);
      if (!e.map.start) {
        e.map.start = new RideFeature({
          style: 'start',
          geometry: new Point(coords),
          ref: startRef,
          action: 'set start',
        });
        e.map.pins.getSource().addFeature(e.map.start);
        e.map.getView().animate({ center: coords, duration: 250, easing: linear });
        endHandler(e, e.map.start);
      } else if (!e.map.end) {
        e.map.end = new RideFeature({
          style: 'end',
          geometry: new Point(coords),
          ref: endRef,
          action: 'set end',
         });
        e.map.pins.getSource().addFeature(e.map.end);
        const ex = boundingExtent([coords, e.map.start.getGeometry().getCoordinates()]);
        e.map.getView().animate({ center: getCenter(ex), duration: 500, easing: linear });
        endHandler(e, e.map.end);
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
        map.end.resetStyle('start');
        map.end.ref = startRef;
        endRef.current.style.visibility = 'hidden';
        map.end.action = 'set start';
        map.start = map.end;
        map.end = null;
        startRef.current.style.visibility = 'unset';
        map.start.updateInfobox(map);
        dispatch({ type: 'swap location', source: 'end', value: event.location.end, target: 'start' });
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

  /* Handler for any event that triggers updating the point and related info
   * (such as dragging the pin to a new location):
   *   1. reset the form data for the point
   *   2. get the DRA info and update the form data
   *   3. move the pin to the closest geometric feature
   *   4. get the nearby references and add them to the form data
   */
  const endHandler = async (e, point) => {
    const snapped = getSnapped(e);
    dispatch({ type: point.action, value: { pending: true, nearbyPending: false, coords: snapped }})
    point.getGeometry().setCoordinates(snapped);
    point.dra = await getDRA(snapped, point, e.map);
    const props = point.dra.properties;
    const aliases = [
      props.ROAD_NAME_ALIAS1,
      props.ROAD_NAME_ALIAS2,
      props.ROAD_NAME_ALIAS3,
      props.ROAD_NAME_ALIAS4,
    ].filter(el => el);
    point.updateInfobox(e.map);

    dispatch({
      type: point.action,
      value: {
        ... props,
        name: props.ROAD_NAME_FULL,
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
  const updateRoute = async (map) => {
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
      const map = e.map // necessary to bind map for callback below
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

  return <>
    <InfoBox className="startInfo" ref={startRef} point={event.location?.start} />
    <InfoBox className="endInfo" ref={endRef} point={event.location?.end} />
    <ContextMenu ref={menuRef} options={contextMenu}></ContextMenu>
  </>;
}
