import { createAsyncThunk, createEntityAdapter, createSlice } from '@reduxjs/toolkit';

import { API_HOST } from '../env.js';

import client from './client.js';

const adapter = createEntityAdapter({
  sortComparer: (a, b) => { return b.sorting_order < a.sorting_order ? 1 : -1; }
})

const refreshThunk = createAsyncThunk(
  'segments/refresh',
  async () => {
    const response = await client.get(`${API_HOST}/api/segments`);
    return response.data;
  },
  {
    condition(arg, thunkApi) {
      return selectStatus(thunkApi.getState()) === 'idle';
    }
  }
);

const selectStatus = (state) => state.segments.status;

export const slice = createSlice({
  name: 'segments',
  initialState: {
    ids: [],
    entities: {},
    status: 'idle',
    error: null,
  },
  reducers: {},

  extraReducers: (builder) => {
    builder
      .addCase(refreshThunk.pending, (state, action) => {
        state.status = 'pending';
      })
      .addCase(refreshThunk.fulfilled, (state, action) => {
        state.status = 'idle';
        adapter.setAll(state, action.payload.map((item) => ({
          name: item.name,
          sort_key: item.sort_key,
          id: item.id,
          value: item.id,
          label: item.name,
        })));
      })
      .addCase(refreshThunk.rejected, (state, action) => {
        state.status = 'failed';
        console.log(action);
        state.error = action.error.message ?? 'Unknown Error';
      });
  }
});

export const {
  selectAll: selectAllSegments,
  selectById: selectSegmentById,
  selectIds: selectSegmentIds,
} = adapter.getSelectors((state) => state.routes);
export {
  refreshThunk as refreshSegments,
  selectStatus as selectSegmentsStatus,
};

export default slice.reducer;
