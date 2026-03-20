import { configureStore } from '@reduxjs/toolkit';

import {
  conditions,
  events,
  pending,
  routes,
  segments,
  serviceAreas,
  situations,
  trafficImpacts,
} from './slices';

export default configureStore({
  reducer: {
    conditions,
    events,
    pending,
    routes,
    segments,
    serviceAreas,
    situations,
    trafficImpacts,
  },
});
