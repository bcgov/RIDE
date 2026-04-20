import { createAsyncThunk, createEntityAdapter, createSlice } from '@reduxjs/toolkit';

import { API_HOST } from '../env.js';

const adapter = createEntityAdapter({
  sortComparer: (a, b) => { return b.sortingOrder < a.sortingOrder ? 1 : -1; }
})

const url = `${API_HOST}/api/service_areas/boundaries`;
const validList = (data) => Array.isArray(data) && data.length > 1;

const refreshThunk = createAsyncThunk(
  'serviceAreaBoundaries/refresh',
  async () => {
    const cache = await caches.open('boundaries');
    let cached = await cache.match(url);
    if (cached) {
      const data = await cached.json();
      if (validList(data)) return data;
      await cache.delete(url);
    }

    const response = await fetch(url, {
      method: 'GET',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(typeof data?.detail === 'string' ? data.detail : response.statusText);
    }

    if (!validList(data)) {
      throw new Error('Invalid boundaries response');
    }

    await cache.put(
      url,
      new Response(JSON.stringify(data), {
        headers: { 'Content-Type': 'application/json' },
      })
    );

    return data;
  },
  {
    condition(arg, thunkApi) {
      return selectStatus(thunkApi.getState()) === 'idle';
    }
  }
);

const selectStatus = (state) => state.serviceAreaBoundaries.status;

export const slice = createSlice({
  name: 'serviceAreaBoundaries',
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
  selectAll: selectAllServiceAreaBoundaryIds,
  selectEntities: selectAllServiceAreaBoundaries,
  selectById: selectServiceAreaBoundaryById,
} = adapter.getSelectors((state) => state.serviceAreaBoundaries);
export {
  refreshThunk as refreshServiceAreaBoundaries,
  selectStatus as selectServiceAreaBoundariesStatus,
};

export default slice.reducer;
