import { createAsyncThunk, createEntityAdapter, createSelector, createSlice } from '@reduxjs/toolkit';

import { API_HOST } from '../env.js';

import client from './client';

const eventsAdapter = createEntityAdapter({
  selectId: (event) => `${event.id}v${event.version}`,
  sortComparer: (a, b) => { return b.last_updated < a.last_updated ? 1 : -1; }
})

export const refreshThunk = createAsyncThunk(
  'events/refresh',
  async () => {
    const response = await client.get(`${API_HOST}/api/events/relevant`);
    return response.data;
  },
  {
    condition(arg, thunkApi) {
      return selectStatus(thunkApi.getState()) === 'idle';
    }
  }
);

const selectStatus = (state) => state.events.status;
const selectPending = (state) => {
  return Object.values(state.events.entities).filter(
    (e) => e.latest && !e.latest_approved
  );
}

const memoizedPending = createSelector(
  state => state.events.entities,
  (events) =>  Object.values(events).filter((event) => event.latest && !event.latest_approved),
);

export const slice = createSlice({
  name: 'events',

  initialState: eventsAdapter.getInitialState({
    status: 'idle',
    error: null
  }),

  reducers: {},

  extraReducers: (builder) => {
    builder
      .addCase(refreshThunk.pending, (state) => {
        state.status = 'pending';
      })
      .addCase(refreshThunk.fulfilled, (state, action) => {
        state.status = 'idle';
        eventsAdapter.setAll(state, action.payload);
      })
      .addCase(refreshThunk.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message ?? 'Unknown Error';
      });
  }
});

export const {
  selectAll: selectAllEvents,
  selectById: selectEventById,
  selectIds: selectEventIds,
} = eventsAdapter.getSelectors((state) => state.events)
export {
  memoizedPending,
  refreshThunk as refreshEvents,
  selectStatus as selectEventsStatus,
  selectPending,
};

export default slice.reducer;
