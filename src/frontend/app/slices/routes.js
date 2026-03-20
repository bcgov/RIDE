import { createAsyncThunk, createEntityAdapter, createSlice } from '@reduxjs/toolkit';

import { API_HOST } from '../env.js';

import client from './client.js';

const adapter = createEntityAdapter({
  sortComparer: (a, b) => { return b.sort_key < a.sort_key ? 1 : -1; }
})

const refreshThunk = createAsyncThunk(
  'routes/refresh',
  async () => {
    const response = await client.get(`${API_HOST}/api/routes`);
    return response.data;
  },
  {
    condition(arg, thunkApi) {
      return selectStatus(thunkApi.getState()) === 'idle';
    }
  }
);

const selectStatus = (state) => state.routes.status;

export const slice = createSlice({
  name: 'routes',
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
  selectAll: selectAllRoutes,
  selectById: selectRouteById,
  selectIds: selectRouteIds,
} = adapter.getSelectors((state) => state.routes);
export {
  refreshThunk as refreshRoutes,
  selectStatus as selectRoutesStatus,
};

export default slice.reducer;
