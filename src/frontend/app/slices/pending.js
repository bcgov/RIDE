import { createAsyncThunk, createEntityAdapter, createSlice } from '@reduxjs/toolkit';

import { API_HOST } from '../env.js';

import client from './client';

const pendingAdapter = createEntityAdapter({
  // ordered by last update time, ascending
  sortComparer: (a, b) => { return b.last_updated < a.last_updated ? -1 : 1; }
})

const refreshThunk = createAsyncThunk(
  'pending/refresh',
  async () => {
    const response = await client.get(`${API_HOST}/api/events/pending`);
    return response.data;
  },
  {
    condition(arg, thunkApi) {
      return selectStatus(thunkApi.getState()) === 'idle';
    }
  }
);

const selectStatus = (state) => state.pending.status;
const selectLength = (state) =>
  state.pending.ids.filter((id) => state.pending.entities[id]?.editable).length;

export const slice = createSlice({
  name: 'pending',

  initialState: pendingAdapter.getInitialState({
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
        pendingAdapter.setAll(state, action.payload);
      })
      .addCase(refreshThunk.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message ?? 'Unknown Error';
      });
  }
});

export const {
  selectAll: selectAllPending,
  selectById: selectPendingById,
  selectIds: selectPendingIds,
} = pendingAdapter.getSelectors((state) => state.pending)
export {
  refreshThunk as refreshPending,
  selectStatus as selectPendingStatus,
  selectLength,
};

export default slice.reducer;
