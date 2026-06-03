import { createAsyncThunk, createEntityAdapter, createSlice } from '@reduxjs/toolkit';

import { DMS_API_URL } from '../env';
import client from './client';


const adapter = createEntityAdapter({
  sortComparer: (a, b) => { return b.name < a.name ? 1 : -1; }
})

const refreshThunk = createAsyncThunk(
  'dms/refresh',
  async () => {
    const response = await client.get(DMS_API_URL, { credentials: 'omit' });
    return response.data;
  },
  {
    condition(arg, thunkApi) {
      return selectStatus(thunkApi.getState()) === 'idle';
    }
  }
);

const selectStatus = (state) => state.dms.status;

export const slice = createSlice({
  name: 'dms',
  initialState: adapter.getInitialState({
    status: 'idle',
    error: null,
  }),
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
  selectAll: selectAllDms,
  selectById: selectDmsById,
  selectIds: selectDmsIds,
} = adapter.getSelectors((state) => state.dms);
export {
  refreshThunk as refreshDms,
  selectStatus as selectDmsStatus,
};

export default slice.reducer;
