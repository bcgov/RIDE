import { createAsyncThunk, createEntityAdapter, createSlice } from '@reduxjs/toolkit';

import { API_HOST } from '../env.js';

import client from './client';

const adapter = createEntityAdapter({
  sortComparer: (a, b) => { return b.name < a.name ? 1 : -1; }
})

const refreshThunk = createAsyncThunk(
  'serviceAreas/refresh',
  async () => {
    const response = await client.get(`${API_HOST}/api/service_areas/nogeo`);
    return response.data;
  },
  {
    condition(arg, thunkApi) {
      return selectStatus(thunkApi.getState()) === 'idle';
    }
  }
);

const selectStatus = (state) => state.serviceAreas.status;
const selectIdLabel = (state) => state.serviceAreas.entities;

export const slice = createSlice({
  name: 'serviceAreas',
  initialState: {
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
        adapter.setAll(state, action.payload);
      })
      .addCase(refreshThunk.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message ?? 'Unknown Error';
      });
  }
});

export const {
  selectAll: selectAllServiceAreas,
  selectById: selectServiceAreaById,
  selectIds: selectServiceAreaIds,
} = adapter.getSelectors((state) => state.serviceAreas);
export {
  refreshThunk as refreshServiceAreas,
  selectStatus as selectServiceAreaStatus,
  selectIdLabel as selectServiceAreasIdLabel,
};

export default slice.reducer;
