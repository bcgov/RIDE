import { createAsyncThunk, createEntityAdapter, createSlice } from '@reduxjs/toolkit';

import { API_HOST } from '../env.js';

import client from './client';

const eventsAdapter = createEntityAdapter({
  sortComparer: (a, b) => { return b.last_updated < a.last_updated ? 1 : -1; }
})

export const refreshThunk = createAsyncThunk(
  'events/refresh',
  async () => {
    const response = await client.get(`${API_HOST}/api/events`);
    return response.data;
  },
  {
    condition(arg, thunkApi) {
      return selectStatus(thunkApi.getState()) === 'idle';
    }
  }
);

const selectStatus = (state) => state.conditions.status;
const selectIdLabel = (state) => state.conditions.entities;

export const slice = createSlice({
  name: 'events',

  initialState: eventsAdapter.getInitialState({
    status: 'idle',
    error: null
  }),

  reducers: {},

  extraReducers: (builder) => {
    builder
      .addCase(refreshThunk.pending, (state, action) => {
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
  refreshThunk as refreshEvents,
  selectStatus as selectEventsStatus,
  selectIdLabel as selectEventsIdLabel,
};

export default slice.reducer;
