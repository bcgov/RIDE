/* eslint-disable no-unused-vars */
import { useContext, useEffect, useRef, useState } from 'react';

import GeoJSON from 'ol/format/GeoJSON.js';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import { Point, LineString, Polygon } from 'ol/geom';
import { circular } from 'ol/geom/Polygon';
import { Circle, Fill, Icon, Style, Stroke, Text } from 'ol/style';
import * as ol from 'ol';

import { MapContext } from '../../contexts';
import { getNearby } from '../../events/Location';
import {
  getDRA, fetchRoute, ll2g, g2ll, getSnapped, Drag, pointerMove,
} from './helpers.js';
import ContextMenu from '../../events/ContextMenu';

globalThis.ol = ol;
globalThis.Circle = Circle;
globalThis.Polygon = Polygon;
globalThis.circular = circular;

import RideFeature, { PinFeature } from './feature.js';

function layerStyle(feature, resolution) {
  if (!feature.get('visible')) { return null; }
  if (feature.get('selected')) { return feature.active; }
  return feature.get('hovered') ? feature.hover : feature.normal;
}

const layer = new VectorLayer({
  classname: 'pins',
  visible: true,
  source: new VectorSource({ format: new GeoJSON() }),
  style: layerStyle,
});
layer.listenForClicks = true;
layer.listenForContext = true;
layer.listenForHover = true;
layer.canDragFeatures = true;
layer.setZIndex(1000);
layer.getSource().remove = (name) => {
  layer.getSource().forEachFeature((feature) => {
    if (feature.get('name') === name) {
      layer.getSource().removeFeature(feature);
    }
  });
}

// Replace all abbrevaitions in road names
const transform_road_abbreviations = (input) => {
  if (typeof input !== 'string') {
    return input;
  }

  return input
    .replace(/\bHwy\b/gi, 'Highway')
    .replace(/\bAve\b/gi, 'Avenue')
    .replace(/\bRd\b/gi, 'Road')
    .replace(/\bPl\b/gi, 'Place')
    .replace(/\bCrt\b/gi, 'Court')
    .replace(/\bBlvd\b/gi, 'Boulevard')
    .replace(/\bDr\b/gi, 'Drive')
    .replace(/\bPky\b/gi, 'Parkway')
    .replace(/\bCres\b/gi, 'Crescent')
    .replace(/\bCir\b/gi, 'Circle')
    .replace(/\bTerr\b/gi, 'Terrace')
    .replace(/\bSt\b/gi, 'Street')
    .replace(/\bLn\b/gi, 'Lane');
};

function transform_prop_value(value) {
  // Transform all strings
  if (typeof value === 'string') {
    return transform_road_abbreviations(value);
  }

  // Transform strings in array
  if (Array.isArray(value)) {
    return value.map((item) => (
      typeof item === 'string' ? transform_road_abbreviations(item) : item
    ));
  }

  // Do nothing for other types
  return value;
}

const markerStyles = {
  static: new Style({
    image: new Circle({
      stroke: new Stroke({
        color: 'rgb(30, 83, 167)',
        width: 2,
      }),
      fill: new Fill({ color: 'rgba(24, 148, 230, 0.75)' }),
      radius: 10,
    }),
    text: new Text({
      font: '11px BC Sans',
      fill: new Fill({ color: [ 255, 255, 255, 1], }),
      text: '',
      textBaseline: 'bottom',
      offsetY: 8,
    }),
  }),
  hover: [
    new Style({
      image: new Circle({
        stroke: new Stroke({
          color: 'rgba(30, 83, 167, 1)',
          width: 3,
        }),
        fill: new Fill({ color: 'rgba(30, 83, 167, 0.7)' }),
        radius: 11,
      }),
      text: new Text({
        font: 'bold 11px BC Sans',
        fill: new Fill({ color: [ 255, 255, 255, 1], }),
        text: '',
        textBaseline: 'bottom',
        offsetY: 8,
      }),
    }),
    new Style({
      text: new Text({
        font: '13px BC Sans',
        // fill: new Fill({ color: [ 0, 0, 0, 1], }),
        fill: new Fill({ color: [ 255, 255, 255, 1], }),
        backgroundFill: new Fill({ color: [ 0, 0, 0, 0.5], }),
        padding: [3, 5, 1, 6],
        // stroke: new Stroke({ color: [255, 255, 255,1], width: 2 }),
        text: 'asdfasdf',
        offsetY: -20,
        textBaseline: 'bottom',
      }),
    }),
  ],
  active: new Style({
    image: new Circle({
      stroke: new Stroke({
        color: 'rgba(30, 83, 167, 1)',
        width: 2,
      }),
      fill: new Fill({ color: 'rgba(30, 83, 167, 0.7)' }),
      radius: 8,
    }),
  }),
}

const intersectionStyles = {
  static: new Style({
    image: new Circle({
      stroke: new Stroke({
        color: 'rgba(88, 66, 21, 1)',
        width: 2,
      }),
      fill: new Fill({ color: 'rgba(249, 196, 48, 0.4)' }),
      radius: 8,
    }),
  }),
  hover: new Style({
    image: new Circle({
      stroke: new Stroke({
        color: 'rgba(88, 66, 21, 1)',
        width: 3,
      }),
      fill: new Fill({ color: 'rgba(249, 196, 48, 0.7)' }),
      radius: 10,
    }),
    text: new Text({
      font: '13px BC Sans',
      // fill: new Fill({ color: [ 0, 0, 0, 1], }),
      fill: new Fill({ color: [ 255, 255, 255, 1], }),
      backgroundFill: new Fill({ color: [ 0, 0, 0, 0.5], }),
      padding: [3, 5, 1, 6],
      // stroke: new Stroke({ color: [255, 255, 255,1], width: 2 }),
      text: '',
      offsetY: -20,
      textBaseline: 'bottom',
    }),
  }),
  active: new Style({
    image: new Circle({
      stroke: new Stroke({
        color: 'rgba(88, 66, 21, 1)',
        width: 2,
      }),
      fill: new Fill({ color: 'rgba(249, 196, 48, 0.7)' }),
      radius: 8,
    }),
  }),
}


/* Handler for any event that triggers updating the point and related info
  * (such as dragging the pin to a new location):
  *   1. reset the form data for the point
  *   2. get the DRA info and update the form data
  *   3. move the pin to the closest geometric feature
  *   4. get the nearby references and add them to the form data
  */
export const endHandler = async (e, point, dispatch) => {
  const snapped = getSnapped(e.coordinate, e.pixel, e.map);
  dispatch({
    type: point.action,
    value: {
      name: 'pending',
      pending: true,
      nearbyPending: false,
      nearbyError: '',
      coords: g2ll(snapped),
      candidates: [],
    }
  });
  updateRoute(e.map);
  point.getGeometry().setCoordinates(snapped);
  point.dra = await getDRA(snapped, point, e.map);
  const props = point.dra.properties;
  let aliases = [
    props?.ROAD_NAME_ALIAS1,
    props?.ROAD_NAME_ALIAS2,
    props?.ROAD_NAME_ALIAS3,
    props?.ROAD_NAME_ALIAS4,
  ].filter(Boolean);
  let name = props?.ROAD_NAME_FULL || 'Greenfield';
  if (props?.HIGHWAY_ROUTE_NUMBER) {
    name = `Hwy ${props?.HIGHWAY_ROUTE_NUMBER}`;
    aliases.unshift(props?.ROAD_NAME_FULL);
    aliases = aliases.filter((alias) => alias !== name);
  }

  const prop_values = {
    ... props,
    name,
    alias: aliases[0],
    aliases,
    pending: false,
    nearbyPending: true
  };

  const payload = {
    type: point.action,
    value: Object.fromEntries(
      Object.entries(prop_values).map(([key, val]) => [key, transform_prop_value(val)])
    )
  };

  dispatch(payload);

  if (point.dra.closest) {
    const coords = ll2g(point.dra.closest.geometry.coordinates);
    point.getGeometry().setCoordinates(coords);
  }

  if (point.dra.properties) {
    let error = '';
    const isHighway = point.dra.properties.HIGHWAY_ROUTE_NUMBER;
    try {
      point.candidates = await getNearby(g2ll(point.getGeometry().getCoordinates()), !isHighway);
      const candidatesById = point.candidates.reduce((byId, candidate) => {
        byId[candidate.id] = candidate;
        return byId;
      }, {});
      const source = e.map.get('pins').getSource();
      const name = 'nearby points';
      source.remove(name);

      for (const n of point.candidates) {
        if (n.source !== 'intersections') { continue; }
        let styles = intersectionStyles;
        if (n.class == 'S4') {
          styles = markerStyles;
          styles.static = styles.static.clone();
          styles.static.getText().setText(n.km_post);
          styles.hover = styles.hover.map((style) => style.clone());
          styles.hover[0].getText().setText(n.km_post);
          styles.hover[1].getText().setText(n.phrase);
        } else {
          styles.hover = styles.hover.clone();
          styles.hover.getText().setText(n.phrase);
        }

        const feature = new RideFeature({
          styles,
          type: 'intersection',
          geometry: new Point(ll2g(n.coords)),
          name,
          isVisible: true,
          noSelect: true,
        });
        source.addFeature(feature);
      }
      if (!point.nearby) { point.nearby = []; }
      if (point.candidates.length > 0) {
        if (point.nearby.length === 0 && point.candidates[0]?.source === 'municipalities') {
          point.nearby.push(structuredClone(point.candidates[0]));
        } else {
          const current = point.nearby.filter((n) => n.source === 'municipalities')[0];
          if (current && current.id !== point.candidates[0].id) {
            Object.assign(current, point.candidates[0]);
          }
          point.nearby = point.nearby.filter((nearby) => {
            if (candidatesById[nearby.id]) {
              Object.assign(nearby, candidatesById[nearby.id]);
              return true;
            }
            return false;
          })
        }
      }
    } catch (err) {
      console.trace(err, `cause: ${err.cause})`);
      error = 'Error retrieving reference locations';
      point.candidates = [];
    }

    dispatch({
      type: point.action,
      value: {
        ... point.dra.properties,
        nearbyPending: false,
        pending: false,
        nearby: point.nearby,
        nearbyError: error,
        candidates: point.candidates,
      }
    });
  }

};

/* Given an always present (possibly empty) route feature on the map: if
* there's a start and end point, ask for a route, and if a route is received,
* update the feature's geometry.  Otherwise, blank the geometry to hide the
* route
*/
export const updateRoute = async (map) => {
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


export default function PinLayer({ event, dispatch }) {
  const { map } = useContext(MapContext);
  const [ contextMenu, setContextMenu ] = useState([]);
  const menuRef = useRef();
  const eventRef = useRef();
  eventRef.current = event;

  useEffect(() => {
    if (!map) { return; }

    if (!map.get('pins')) {
      map.addLayer(layer);
      map.pins = layer;
      map.set('pins', layer);
      map.on('contextmenu', contextHandler);
      map.on('pointermove', pointerMove);
      map.getInteractions().extend([
        new Drag({ endHandler, menuRef, resetContextMenu: () => setContextMenu([]), dispatch })
      ]);

      map.route = new PinFeature({ style: 'route', geometry: new LineString([]), isVisible: true, noSelect: true })
      layer.getSource().addFeature(map.route);

      // pin for search result
      map.location = new PinFeature({
        style: 'location',
        geometry: new Point([]),
        isVisible: true
      });
      map.location.noHover = true;
      map.location.noSelect = true;
      layer.getSource().addFeature(map.location);
    }
  });

  // co-ordinate visible pins with current event
  useEffect(() => {
    if (!map || event?.from_bulk) { return; }

    const evt = event.preview || event;

    if (evt.location.start?.name && (event.showForm || event.showHistory)) { // start location but no pin
      const coords = ll2g(evt.location.start.coords);
      if (map.start) {
        map.start.getGeometry().setCoordinates(coords);
      } else {
        map.start = new PinFeature({
          style: 'start', geometry: new Point(coords), action: 'set start', isVisible: true
        });
        map.start.dra = { properties: evt.location.start }
        map.pins.getSource().addFeature(map.start);
      }
      map.start.set('isPreview', !!event.preview);
    } else if (map.start) { // no start location but start pin exists
      // map.pins.getSource().removeFeature(map.start);
      // console.log('removing');
      // map.start = null;
    }

    if (evt.location.end?.name && (event.showForm || event.showHistory)) { // end location but no pin
      const coords = ll2g(evt.location.end.coords);
      if (map.end) {
        map.end.getGeometry().setCoordinates(coords);
      } else {
        map.end = new PinFeature({
          style: 'end', geometry: new Point(coords), action: 'set end', isVisible: true,

        });
        map.end.dra = { properties: evt.location.end }
        map.pins.getSource().addFeature(map.end);
      }

      const route = evt.geometry?.geometries[2]?.coordinates;
      if (route && route.length > 0) {
        map.route.getGeometry().setCoordinates(route.map(cc => ll2g(cc)))
      }

    } else if (map.end) { // no end location but end pin exists
      map.pins.getSource().removeFeature(map.end);
      map.end = null;
    }

    if (!event.showForm) {
        map.route.getGeometry().setCoordinates([])
    }

    updateRoute(map);
  }, [event]);

  /* Remove a pin from the map and update the event.  If the pin removed is the
   * start pin and there's an end pin, make the end pin the new start pin.
   */
  const removePin = (feature, map) => {
    if (feature === map.start) {
      map.pins.getSource().removeFeature(map.start);
      map.start = null;

      if (map.end) {
        map.end.changeStyle('start');
        map.end.action = 'set start';
        map.start = map.end;
        map.end = null;
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

  return (
    <ContextMenu ref={menuRef} options={contextMenu} setContextMenu={setContextMenu} />
  );
}
