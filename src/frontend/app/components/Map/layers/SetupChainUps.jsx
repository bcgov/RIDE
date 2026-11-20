import { useContext, useEffect, useRef } from 'react';

import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import { Point } from 'ol/geom';
import { Icon, Style } from 'ol/style';

import { MapContext } from '../../../contexts';
import { ll2g } from '../helpers.js';
import RideFeature from '../feature.js';
import { getChainUps } from '../../../shared/data/chainups';
import { CHAINUP_ICON_SCALE, getChainupDirectionIcon } from '../../../events/icons';

const styles = Object.fromEntries(['BOTH', 'NORTHBOUND', 'SOUTHBOUND', 'EASTBOUND', 'WESTBOUND'].map((dir) => [
  dir,
  Object.fromEntries(['static', 'hover', 'active'].map((state) => [
    state,
    new Style({ image: new Icon({ scale: CHAINUP_ICON_SCALE, src: getChainupDirectionIcon(dir, state) }) }),
  ])),
]));

function layerStyle(feature) {
  if (!feature.get('visible')) { return null; }
  if (feature.get('selected')) { return feature.active; }
  return feature.get('hovered') ? feature.hover : feature.normal;
}

function applyFilter(map, filter) {
  map?.get('chainups')?.getSource().getFeatures().forEach((feature) => {
    feature.set('visible', !filter || filter(feature.get('raw')));
  });
}

export default function SetupChainUpsLayer({ filter, visible = true }) {
  const { map } = useContext(MapContext);
  const filterRef = useRef(); // features load async; apply latest filter then
  filterRef.current = filter;

  useEffect(() => {
    if (!map || map.get('chainups')) { return; }

    const source = new VectorSource();
    const layer = new VectorLayer({
      classname: 'chainups',
      source,
      style: layerStyle,
    });
    layer.listenForHover = true;
    map.addLayer(layer);
    map.set('chainups', layer);

    getChainUps().then((chainups) => {
      source.addFeatures(chainups.map((cu) => new RideFeature({
        styles: styles[cu.direction] || styles.BOTH,
        geometry: new Point(ll2g(cu.primary_point.coordinates)),
        raw: cu,
      })));
      applyFilter(map, filterRef.current);
    });
  }, [map]);

  useEffect(() => applyFilter(map, filter), [map, filter]);

  useEffect(() => { map?.get('chainups')?.setVisible(visible); }, [map, visible]);

  return null;
}
