import { createAsyncThunk, createEntityAdapter, createSlice } from '@reduxjs/toolkit';

import { API_HOST } from '../env.js';

import client from './client.js';

const adapter = createEntityAdapter({
  sortComparer: (a, b) => { return b.sortingOrder < a.sortingOrder ? 1 : -1; }
})

const refreshThunk = createAsyncThunk(
  'organizations/refresh',
  async () => {
    const response = await client.get(`${API_HOST}/api/organizations`);
    return response.data;
  },
  {
    condition(arg, thunkApi) {
      return selectStatus(thunkApi.getState()) === 'idle';
    }
  }
);

const selectStatus = (state) => state.organizations.status;

export const slice = createSlice({
  name: 'organizations',
  initialState: adapter.getInitialState({
    status: 'idle',
    error: null,
  }),
  reducers: {},

  extraReducers: (builder) => {
    builder
      .addCase(refreshThunk.pending, (state) => {
        state.status = 'pending';
      })
      .addCase(refreshThunk.fulfilled, (state, action) => {
        state.status = 'idle';
        adapter.setAll(state, action.payload.map((item) => ({
          name: item.name,
          id: item.id,
          sortingOrder: item.sortingOrder,
          value: item.id,
          label: `${item.sortingOrder} - ${item.name}`,
          routes: item.routes,
        })));
      })
      .addCase(refreshThunk.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.error.message ?? 'Unknown Error';
      });
  }
});

export const {
  selectAll: selectAllOrganizations,
  selectById: selectOrganizationById,
  selectIds: selectOrganizationIds,
} = adapter.getSelectors((state) => state.organizations);
export {
  refreshThunk as refreshOrganizations,
  selectStatus as selectOrganizationStatus,
};

export default slice.reducer;
