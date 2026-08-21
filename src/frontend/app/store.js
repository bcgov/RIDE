import { configureStore } from '@reduxjs/toolkit';

import {
  conditions,
  districts,
  districtBoundaries,
  dms,
  events,
  organizations,
  routes,
  segments,
  serviceAreas,
  serviceAreaBoundaries,
  situations,
  trafficImpacts,
  users,
  visibleLayers,
} from './slices';

export default configureStore({
  reducer: {
    conditions,
    districts,
    districtBoundaries,
    dms,
    events,
    organizations,
    routes,
    segments,
    serviceAreas,
    serviceAreaBoundaries,
    situations,
    trafficImpacts,
    users,
    visibleLayers,
  },

  middleware: (getDefaultMiddleware) => getDefaultMiddleware({
    serializableCheck: false,
  }),

  // The boundaries geometry data is huge and crashes devTools; applying
  // sanitization as directed here:
  // https://github.com/reduxjs/redux-devtools-extension/blob/master/docs/Troubleshooting.md#excessive-use-of-memory-and-cpu
  devTools: {
      actionSanitizer: (action) => {
        if (action.type === 'serviceAreaBoundaries/refresh/fulfilled' ||
            action.type === 'districtBoundaries/refresh/fulfilled'
        ) {
          const payload = action.payload.map((area) => ({ ...area, geometry: { type: 'Polygon', coordinates: '<coords>'} }));
          return { ...action, payload }
        }
        return action;
      },

      stateSanitizer: (state) => {
        let serviceAreaBoundaries = {};
        if (state.serviceAreaBoundaries) {
          serviceAreaBoundaries = {
            ...state.serviceAreaBoundaries,
            entities: Object.values(state.serviceAreaBoundaries.entities).reduce((acc, ent) => {
              acc[ent.id] = { ...ent, geometry: { type: 'Polygon', coordinates: '<coords>' } };
              return acc;
            }, {}),
          }
        }
        let districtBoundaries = {};
        if (state.districtBoundaries) {
          districtBoundaries = {
            ...state.districtBoundaries,
            entities: Object.values(state.districtBoundaries.entities).reduce((acc, ent) => {
              acc[ent.id] = { ...ent, geometry: { type: 'Polygon', coordinates: '<coords>' } };
              return acc;
            }, {}),
          }
        }
        return {
          ...state,
          serviceAreaBoundaries,
          districtBoundaries,
        };
      }
    },
});
