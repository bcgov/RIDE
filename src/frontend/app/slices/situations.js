import { createAsyncThunk, createEntityAdapter, createSlice } from '@reduxjs/toolkit';

import { API_HOST } from '../env.js';

import client from './client';

const adapter = createEntityAdapter({
  sortComparer: (a, b) => { return b.name < a.name ? 1 : -1; }
})

const refreshThunk = createAsyncThunk(
  'situations/refresh',
  async () => {
    const response = await client.get(`${API_HOST}/api/traffic-impacts`);
    return response.data;
  },
  {
    condition(arg, thunkApi) {
      return selectStatus(thunkApi.getState()) === 'idle';
    }
  }
);

const selectStatus = (state) => state.situations.status;

export const slice = createSlice({
  name: 'situations',
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
  selectAll: selectAllSituations,
  selectById: selectSituationById,
  selectIds: selectSituationIds,
} = adapter.getSelectors((state) => state.situations);
export {
  refreshThunk as refreshSituations,
  selectStatus as selectSituationStatus,
};

export default slice.reducer;
