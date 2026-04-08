import { configureStore } from '@reduxjs/toolkit';

import {
  conditions,
  districts,
  districtBoundaries,
  events,
  pending,
  routes,
  segments,
  serviceAreas,
  serviceAreaBoundaries,
  situations,
  trafficImpacts,
  visibleLayers,
} from './slices';

export default configureStore({
  reducer: {
    conditions,
    districts,
    districtBoundaries,
    events,
    pending,
    routes,
    segments,
    serviceAreas,
    serviceAreaBoundaries,
    situations,
    trafficImpacts,
    visibleLayers,
  },
  middleware: (getDefaultMiddleware) => getDefaultMiddleware({
    serializableCheck: false,
  }),
});
