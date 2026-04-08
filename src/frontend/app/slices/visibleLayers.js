import { createSlice } from '@reduxjs/toolkit';

import { defaultLayers } from '../events/Layers';

const layersInitial = () => {
  try {
    const stored = localStorage.getItem('visibleLayers');
    if (stored) { return JSON.parse(stored); }
  } catch (err) {
    console.log(err);
  }
  return defaultLayers;
}

export const slice = createSlice({
  name: 'visibleLayers',
  initialState: layersInitial(),
  reducers: {
    set: (state, action) => {
      const updated = {... state, ...action.payload };
      localStorage.setItem("visibleLayers", JSON.stringify(updated));
      return updated;
    }
  },
});

export const { set } = slice.actions;

export default slice.reducer;
