import { createAsyncThunk, createEntityAdapter, createSlice } from '@reduxjs/toolkit';

import { API_HOST } from '../env.js';

import client from './client.js';

const adapter = createEntityAdapter({
  sortComparer: (a, b) => { return b.sortingOrder < a.sortingOrder ? 1 : -1; }
})

const url = `${API_HOST}/api/districts/boundaries`;

const refreshThunk = createAsyncThunk(
  'districtBoundaries/refresh',
  async () => {
    const cache = await caches.open('boundaries');
    let cached = await cache.match(url);
    if (cached) {
      const data = await cached.json();
      return data;
    }

    const response = await fetch(url, {
      method: 'GET',
      credentials: "include",
      headers: { 'Content-Type': 'application/json' }
    })
    await cache.put(url, response);
    cached = await cache.match(url);
    const data = await cached.json();
    return data;
  },
  {
    condition(arg, thunkApi) {
      return selectStatus(thunkApi.getState()) === 'idle';
    }
  }
);

const selectStatus = (state) => state.districtBoundaries.status;

export const slice = createSlice({
  name: 'districtBoundaries',
  initialState: {
    status: 'idle',
    error: null,
    ids: [],
    entities: {},
  },
  reducers: {},

  extraReducers: (builder) => {
    builder
      .addCase(refreshThunk.pending, (state, action) => {
        state.status = 'pending';
      })
      .addCase(refreshThunk.fulfilled, (state, action) => {
        state.status = 'idle';
        adapter.setAll(state, action.payload);
      })
      .addCase(refreshThunk.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message ?? 'Unknown Error';
      });
  }
});

export const {
  selectAll: selectAllDistrictBoundaryIds,
  selectEntities: selectAllDistrictBoundaries,
  selectById: selectDistrictBoundaryById,
} = adapter.getSelectors((state) => state.districtBoundaries);
export {
  refreshThunk as refreshDistrictBoundaries,
  selectStatus as selectDistrictBoundariesStatus,
};

export default slice.reducer;
