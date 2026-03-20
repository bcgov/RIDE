import { createAsyncThunk, createEntityAdapter, createSlice } from '@reduxjs/toolkit';

import { API_HOST } from '../env.js';

import client from './client';

const adapter = createEntityAdapter({
  sortComparer: (a, b) => { return b.name < a.name ? 1 : -1; }
})

const refreshThunk = createAsyncThunk(
  'conditions/refresh',
  async () => {
    const response = await client.get(`${API_HOST}/api/conditions`);
    return response.data;
  },
  {
    condition(arg, thunkApi) {
      return selectStatus(thunkApi.getState()) === 'idle';
    }
  }
);

const selectStatus = (state) => state.conditions.status;

export const slice = createSlice({
  name: 'conditions',
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
  selectAll: selectAllConditions,
  selectById: selectConditionById,
  selectIds: selectConditionIds,
} = adapter.getSelectors((state) => state.conditions);
export {
  refreshThunk as refreshConditions,
  selectStatus as selectConditionStatus,
};

export default slice.reducer;
