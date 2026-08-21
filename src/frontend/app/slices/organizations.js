import { createAsyncThunk, createEntityAdapter, createSlice } from '@reduxjs/toolkit';

import { API_HOST } from '../env.js';

import client from './client.js';

const adapter = createEntityAdapter({
  sortComparer: (a, b) => { return b.name.toLowerCase() < a.name.toLowerCase() ? 1 : -1; }
})

const refreshThunk = createAsyncThunk(
  'organizations/refresh',
  async () => {
    const response = await client.get(`${API_HOST}/api/organizations`);
    return response.data;
  },
  {
    condition(arg, thunkApi) { return selectStatus(thunkApi.getState()) === 'idle'; }
  }
);

const addOrUpdateThunk = createAsyncThunk(
  'organizations/addOrUpdate',
  async (org, thunkApi) => {
    try {
      let response;
      if (org.id) {
        response = await client.patch(`${API_HOST}/api/organizations/${org.id}`, org);
      } else {
        response = await client.post(`${API_HOST}/api/organizations`, org);
      }
      return response.data;
    } catch (err) {
      return thunkApi.rejectWithValue(err);
    }
  },
  {
    condition(arg, thunkApi) { return writeStatus(thunkApi.getState()) === 'idle'; }
  }
);

const deleteThunk = createAsyncThunk(
  'organizations/delete',
  async (id, thunkApi) => {
    try {
      await client.delete(`${API_HOST}/api/organizations/${id}`);
      return { id };
    } catch (err) {
      return thunkApi.rejectWithValue(err);
    }
  },
  {
    condition(arg, thunkApi) { return writeStatus(thunkApi.getState()) === 'idle'; }
  }
);

const selectStatus = (state) => state.organizations.status;
const writeStatus = (state) => state.organizations.writeStatus;

export const slice = createSlice({
  name: 'organizations',
  initialState: adapter.getInitialState({
    status: 'idle',
    writeStatus: 'idle',
    error: null,
  }),
  reducers: {},

  extraReducers: (builder) => {
    builder
      .addCase(addOrUpdateThunk.pending, (state) => { state.postStatus = 'pending'; })
      .addCase(addOrUpdateThunk.fulfilled, (state, action) => {
        state.postStatus = 'idle';
        adapter.setOne(state, action.payload);
      })
      .addCase(addOrUpdateThunk.rejected, (state) => { state.postStatus = 'idle'; })

      .addCase(deleteThunk.pending, (state) => { state.postStatus = 'pending'; })
      .addCase(deleteThunk.fulfilled, (state, action) => {
        state.postStatus = 'idle';
        adapter.removeOne(state, action.payload.id)
      })
      .addCase(deleteThunk.rejected, (state) => { state.postStatus = 'idle'; })

      .addCase(refreshThunk.pending, (state) => { state.status = 'pending'; })
      .addCase(refreshThunk.fulfilled, (state, action) => {
        state.status = 'idle';
        adapter.setAll(state, action.payload);
      })
      .addCase(refreshThunk.rejected, (state, action) => {
        state.status = 'idle';
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
  addOrUpdateThunk as addOrUpdateOrganization,
  deleteThunk as deleteOrganization,
};

export default slice.reducer;
