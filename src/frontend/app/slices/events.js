import { createSlice } from '@reduxjs/toolkit';

export const slice = createSlice({
  name: 'events',
  initialState: {
    all: [],
    status: 'idle',
    error: null,
  },
  reducers: {
    add: (state, action) => {
      state.push(action.payload);
    },
    refresh: (state, action) => {
      state.all = action.payload;
    }
  }
});

export const { add, refresh } = slice.actions;
export default slice.reducer;
