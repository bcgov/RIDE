import { configureStore } from '@reduxjs/toolkit';

import {
  conditions,
  events,
  pending,
  serviceAreas,
  situations,
  trafficImpacts,
} from './slices';

export default configureStore({
  reducer: {
    conditions,
    events,
    pending,
    serviceAreas,
    situations,
    trafficImpacts,
  },
});
