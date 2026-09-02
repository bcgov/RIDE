import { createAsyncThunk, createEntityAdapter, createSlice } from '@reduxjs/toolkit';

import { API_HOST } from '../env';
import { statusCode } from '../shared';

import client from './client';

const adapter = createEntityAdapter({});

const refreshThunk = createAsyncThunk(
  'users/refresh',
  async (_, thunkApi) => {
    try {
      const response = await client.get(`${API_HOST}/api/users`);
      return response.data;
    } catch (err) {
      return thunkApi.rejectWithValue(statusCode(err.status));
    }
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
const selectError = (state) => state.users.error;
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
        state.status = 'fulfilled';
        adapter.setAll(state, action.payload);
      })
      .addCase(refreshThunk.rejected, (state, action) => {
        state.status = 'error';
        state.error = action.payload ?? 'Unknown Error';
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
  selectStatus as userStatus,
  selectError as userError,
};

export default slice.reducer;
