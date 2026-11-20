import { useContext, useEffect } from 'react';

import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';

import { MapContext } from '../../../contexts';

// shortcut: empty layer, no features loaded yet
export default function SetupAvalancheAreasLayer({ visible = true }) {
  const { map } = useContext(MapContext);

  useEffect(() => {
    if (!map || map.get('avalancheAreas')) { return; }

    const layer = new VectorLayer({ classname: 'avalancheAreas', source: new VectorSource() });
    map.addLayer(layer);
    map.set('avalancheAreas', layer);
  }, [map]);

  useEffect(() => { map?.get('avalancheAreas')?.setVisible(visible); }, [map, visible]);

  return null;
}
