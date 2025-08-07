import { useCallback, useRef, useState } from 'react';

import { Point, LineString, Polygon } from 'ol/geom';
import { circular } from 'ol/geom/Polygon';
import { transform } from 'ol/proj';

import Map from '../components/Map';
import Layer from '../components/Map/Layer';
import PinLayer from '../components/Map/PinLayer';
import { MapContext, getCoords, getDRA, fetchRoute } from '../components/Map/helpers.js';
import RideFeature from '../components/Map/feature';
import {
  pinStartNormalStyle, pinStartHoverStyle, pinStartActiveStyle,
  pinEndNormalStyle, pinEndHoverStyle, pinEndActiveStyle,
} from '../components/Map/styles';

import './home.css';

import EventForm from './forms';

export function meta() {
  return [
    { title: "RIDE Events" },
  ];
}

export default function Home() {

  const mapRef = useRef();

  const [ map, setMap ] = useState(null);
  const [ start, setStart ] = useState(false);
  const [ end, setEnd ] = useState(false);
  const [ selected, setSelected] = useState(false);

  const clickHandler = async (e) => {
    const feature = e.map.getFeaturesAtPixel(e.pixel,{
      layerFilter: (layer) => layer.listenForClicks,
    })[0];
    if (!feature) {
      if (!e.map.start) {
        e.map.start = new RideFeature({
          normalStyle: pinStartNormalStyle,
          hoverStyle: pinStartHoverStyle,
          activeStyle: pinStartActiveStyle,
          geometry: new Point(e.coordinate)
        });
        e.map.pins.getSource().addFeature(e.map.start);
        e.map.start.setFunc = setStart;
        endHandler(e, e.map.start);
      } else if (!e.map.end) {
        e.map.end = new RideFeature({
          normalStyle: pinEndNormalStyle,
          hoverStyle: pinEndHoverStyle,
          activeStyle: pinEndActiveStyle,
          geometry: new Point(e.coordinate)
        });
        e.map.pins.getSource().addFeature(e.map.end);
        e.map.end.setFunc = setEnd;
        endHandler(e, e.map.end);
        updateRoute(e.map);
      }
    }
  }

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

  const contextHandler = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    const feature = e.map.getFeaturesAtPixel(e.pixel,{
      layerFilter: (layer) => layer.listenForClicks,
    })[0];
    if (feature) {
      if (feature === e.map.start) {
        e.map.pins.getSource().removeFeature(e.map.start);
        e.map.start = null;
        setStart(null);
        if (e.map.end) {
          e.map.start = e.map.end;
          e.map.start.setFunc = setStart;
          e.map.end = null;
          setEnd(null)
          setStart({ dra: e.map.start.get('dra'), nearby: e.map.start.get('nearby') });
          const texts = e.map.start.getStyle().getText().getText();
          e.map.start.normal = pinStartNormalStyle;
          e.map.start.normal.getText().setText(texts);
          e.map.start.hover = pinStartHoverStyle;
          e.map.start.hover.getText().setText(texts);
          e.map.start.active = pinStartActiveStyle;
          e.map.start.active.getText().setText(texts);
          e.map.start.updateStyle();
        }
      } else if (feature === e.map.end) {
        e.map.pins.getSource().removeFeature(e.map.end);
        e.map.end = null;
        setEnd(null);
      }
    }
    updateRoute(e.map);
  }, [end]);

  const endHandler = useCallback(async (e, point) => {
    console.log('endhandler');
    const cc = getCoords(e.map, point);
    const dra = await getDRA(cc, point, e.map.getView().getResolution());
    point.setFunc(dra);

    if (e.map.selectedFeature) {
      e.map.selectedFeature.selected = false;
      e.map.selectedFeature.updateStyle();
    }
    e.map.selectedFeature = point;
    e.map.start.selected = true;
    e.map.start.updateStyle();
    setSelected(e.map.selectedFeature)
    updateRoute(e.map);
  }, []);

  mapRef.current = map;

  return (
    <div className="events-home">
      { selected &&
        <div className="panel">
          <EventForm start={start} end={end} map={mapRef.current} />
        </div>
      }
      <MapContext.Provider value={{ map, setMap }}>
        <Map parentClickHandler={clickHandler} parentContextHandler={contextHandler}>
          <PinLayer
            upCallback={endHandler}
          />
          <Layer name='events' />
        </Map>
      </MapContext.Provider>
    </div>
  );
}
