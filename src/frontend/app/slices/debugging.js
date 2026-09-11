import { createSlice } from '@reduxjs/toolkit';

const defaultDebugging = {
  alternateRoutes: false,
}

const debuggingInitial = () => {
  if (globalThis.localStorage) {
    try {
      const stored = localStorage.getItem('debuggingSwitches');
      if (stored) { return JSON.parse(stored); }
    } catch (err) {
      console.log(err);
    }
  }
  return defaultDebugging;
}

export const slice = createSlice({
  name: 'debugging',
  initialState: debuggingInitial(),
  reducers: {
    setDebugging: (state, action) => {
      const updated = {... state, ...action.payload };
      localStorage.setItem("debuggingSwitches", JSON.stringify(updated));
      return updated;
    }
  },
});

export const { setDebugging } = slice.actions;

export default slice.reducer;
