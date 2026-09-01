import { createAsyncThunk, createEntityAdapter, createSlice } from '@reduxjs/toolkit';

import { API_HOST } from '../env.js';

import client from './client.js';

const adapter = createEntityAdapter({
  // sortComparer: (a, b) => { return b.name.toLowerCase() < a.name.toLowerCase() ? 1 : -1; }
})

const refreshThunk = createAsyncThunk(
  'users/refresh',
  async () => {
    const response = await client.get(`${API_HOST}/api/users`);
    return response.data;
  },
  {
    condition(arg, thunkApi) { return selectStatus(thunkApi.getState()) === 'idle'; }
  }
);

const updateThunk = createAsyncThunk(
  'users/update',
  async (user, thunkApi) => {
    try {
      const response = await client.patch(`${API_HOST}/api/users/${user.id}`, user);
      return response.data;
    } catch (err) {
      return thunkApi.rejectWithValue(err);
    }
  },
  {
    condition(arg, thunkApi) { return writeStatus(thunkApi.getState()) === 'idle'; }
  }
);

const selectStatus = (state) => state.users.status;
const writeStatus = (state) => state.users.writeStatus;

export const slice = createSlice({
  name: 'users',
  initialState: adapter.getInitialState({
    status: 'idle',
    writeStatus: 'idle',
    error: null,
  }),
  reducers: {},

  extraReducers: (builder) => {
    builder
      .addCase(updateThunk.pending, (state) => { state.writeStatus = 'pending'; })
      .addCase(updateThunk.fulfilled, (state, action) => {
        state.writeStatus = 'idle';
        adapter.setOne(state, action.payload);
      })
      .addCase(updateThunk.rejected, (state) => { state.writeStatus = 'idle'; })

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
  selectAll: selectAllUsers,
  selectById: selectUserById,
  selectIds: selectUserIds,
} = adapter.getSelectors((state) => state.users);
export {
  refreshThunk as refreshUsers,
  updateThunk as updateUser,
};

export default slice.reducer;
