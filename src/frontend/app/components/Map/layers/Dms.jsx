import { useContext, useEffect, useState, useRef } from 'react';
import { useSelector, useDispatch, useStore } from 'react-redux';

import GeoJSON from 'ol/format/GeoJSON.js';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import { Point } from 'ol/geom';
import { Icon, Style } from 'ol/style';

import { MapContext } from '../../../contexts';

import { ll2g } from '../helpers.js';
import RideFeature from '../feature.js';
import ContextMenu from '../../../events/ContextMenu.jsx';

import { refreshDms } from '../../../slices/dms';
import { EVENT_POLLING_REFRESH } from '../../../env';


import dmsEastIconActive from '../../../events/icons/dms-east-active.png';
import dmsEastIconHover from '../../../events/icons/dms-east-hover.png';
import dmsEastIconStatic from '../../../events/icons/dms-east-static.png';

import dmsSouthIconActive from '../../../events/icons/dms-south-active.png';
import dmsSouthIconHover from '../../../events/icons/dms-south-hover.png';
import dmsSouthIconStatic from '../../../events/icons/dms-south-static.png';

import dmsWestIconActive from '../../../events/icons/dms-west-active.png';
import dmsWestIconHover from '../../../events/icons/dms-west-hover.png';
import dmsWestIconStatic from '../../../events/icons/dms-west-static.png';

import dmsNorthIconActive from '../../../events/icons/dms-north-active.png';
import dmsNorthIconHover from '../../../events/icons/dms-north-hover.png';
import dmsNorthIconStatic from '../../../events/icons/dms-north-static.png';

export const dmsEastStyles = {
  static: new Style({
    image: new Icon({
      scale: 0.25,
      src: dmsEastIconStatic,
    }),
  }),
  hover: new Style({
    image: new Icon({
      scale: 0.25,
      src: dmsEastIconHover,
    }),
  }),
  active: new Style({
    image: new Icon({
      scale: 0.25,
      src: dmsEastIconActive,
    }),
  }),
};

export const dmsSouthStyles = {
  static: new Style({
    image: new Icon({
      scale: 0.25,
      src: dmsSouthIconStatic,
    }),
  }),
  hover: new Style({
    image: new Icon({
      scale: 0.25,
      src: dmsSouthIconHover,
    }),
  }),
  active: new Style({
    image: new Icon({
      scale: 0.25,
      src: dmsSouthIconActive,
    }),
  }),
};

export const dmsWestStyles = {
  static: new Style({
    image: new Icon({
      scale: 0.25,
      src: dmsWestIconStatic,
    }),
  }),
  hover: new Style({
    image: new Icon({
      scale: 0.25,
      src: dmsWestIconHover,
    }),
  }),
  active: new Style({
    image: new Icon({
      scale: 0.25,
      src: dmsWestIconActive,
    }),
  }),
};

export const dmsNorthStyles = {
  static: new Style({
    image: new Icon({
      scale: 0.25,
      src: dmsNorthIconStatic,
    }),
  }),
  hover: new Style({
    image: new Icon({
      scale: 0.25,
      src: dmsNorthIconHover,
    }),
  }),
  active: new Style({
    image: new Icon({
      scale: 0.25,
      src: dmsNorthIconActive,
    }),
  }),
};

function getStyle(sign, state) {
  switch (sign.roadway_direction) {
    case 'Eastbound':
      return dmsEastStyles[state];
    case 'Northbound':
      return dmsNorthStyles[state];
    case 'Westbound':
      return dmsWestStyles[state];
    case 'Southbound':
      return dmsSouthStyles[state];
  }
}

export function addSign(sign, map, visibleLayers) {
  sign = structuredClone(sign);
  const source = map.get('dms').getSource();
  const existing = source.get(sign.id);

  if (existing) {
    if (sign.updated_datetime_utc === existing.updated_datetime_utc) { return; }

    source.unset(sign.id, true);
    source.removeFeature(existing);
  }

  let coords = sign.location.coordinates;

  const styles = {};
  ['static', 'hover', 'active'].forEach((state) => {
    styles[state] = getStyle(sign, state);
  });

  const feature = new RideFeature({
    styles,
    type: 'sign',
    raw: sign,
    geometry: new Point(ll2g(coords)),
  });
  feature.setId(sign.id);
  feature.set('visible', visibleLayers.dms);

  source.set(sign.id, feature, true);
  source.addFeature(feature);
}

function layerStyle(feature, resolution) {
  if (!feature.get('visible')) { return null; }
  if (feature.get('selected')) { return feature.active; }
  return feature.get('hovered') ? feature.hover : feature.normal;
}

function addDmsLayer(map) {
  if (!map.get('dms')) {
    const layer = new VectorLayer({
      classname: 'dms',
      visible: true,
      source: new VectorSource({ format: new GeoJSON() }),
      style: layerStyle,
      renderBuffer: 30,
    });
    layer.listenForHover = true;
    layer.listenForClicks = true;
    map.addLayer(layer);
    map.set('dms', layer);
  }
}

export default function DmsLayer({ sign }) {
  const { map } = useContext(MapContext);
  const [ contextMenu, setContextMenu ] = useState([]);
  const [ fetchInterval, setFetchInterval ] = useState();
  const menuRef = useRef();
  const signRef = useRef(); // necessary for early-bound handler to read current prop
  signRef.current = sign;

  const status = useSelector(state => state.dms.status);
  const storeDispatch = useDispatch()
  const store = useStore();
  const visibleLayers = useSelector(state => state.visibleLayers);

  const contextHandler = (e) => {
    e.preventDefault();
    const sign = signRef.current; // updated event prop

    const feature = e.map.getFeaturesAtPixel(e.pixel, {
      layerFilter: (layer) => layer.listenForClicks,
    })[0];

    menuRef.current.style.left = (e.pixel[0] - 1) + 'px';
    menuRef.current.style.top = (e.pixel[1] - 1) + 'px';
    menuRef.current.style.visibility = undefined;

    const coordinate = e.coordinate;
    const pixel = e.pixel;
    const items = [];

    if (feature && feature.get('type') === 'sign') {
      e.stopPropagation();
      const map = e.map; // necessary to bind map for callback below

      const raw = feature.get('raw');

      items.push(
        {
          label: 'Dump feature to console',
          debugging: true,
          action: (e) => {
            console.log(feature);
            setContextMenu([]);
          }
        },
        {
          label: 'Dump sign to console',
          debugging: true,
          action: (e) => {
            console.log(feature.get('raw'));
            setContextMenu([]);
          }
        },
      );
    }

    setContextMenu(items);
  };

  const updateSignsOnMap = () => {
    const state = store.getState()
    const signIds = {};

    state.dms.ids.forEach((id) => {
      const sign = state.dms.entities[id];
      addSign(sign, map, visibleLayers);
      signIds[id] = true;
    })
  }

  useEffect(() => {
    map?.get('dms').getSource().getFeatures().forEach((feature) => {
      feature.set('visible', visibleLayers.dms);
    });
  }, [visibleLayers]);

  useEffect(() => {
    if (!map) { return; }
    map.on('contextmenu', contextHandler);
    addDmsLayer(map);
    updateSignsOnMap()
    store.subscribe(updateSignsOnMap);
    storeDispatch(refreshDms());
    if (!fetchInterval) {
      setFetchInterval(setInterval(() => storeDispatch(refreshDms()), EVENT_POLLING_REFRESH || 10000));
    }
  }, [map]);

  return (
    <ContextMenu ref={menuRef} options={contextMenu} setContextMenu={setContextMenu} />
  );
}
