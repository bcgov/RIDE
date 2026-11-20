import { useContext, useEffect } from 'react';

import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';

import { MapContext } from '../../../contexts';

// shortcut: empty layer, no features loaded yet
export default function SetupSegmentsLayer({ visible = true }) {
  const { map } = useContext(MapContext);

  useEffect(() => {
    if (!map || map.get('segments')) { return; }

    const layer = new VectorLayer({ classname: 'segments', source: new VectorSource() });
    map.addLayer(layer);
    map.set('segments', layer);
  }, [map]);

  useEffect(() => { map?.get('segments')?.setVisible(visible); }, [map, visible]);

  return null;
}
