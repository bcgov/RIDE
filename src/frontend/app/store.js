import { configureStore } from '@reduxjs/toolkit';

import { eventsReducer, pendingReducer } from './slices';

export default configureStore({
  reducer: {
    events: eventsReducer,
    pending: pendingReducer,
  }
});
