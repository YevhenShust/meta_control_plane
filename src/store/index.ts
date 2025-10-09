import { configureStore } from '@reduxjs/toolkit';
import uiSlice from './uiSlice';
import { apiSlice } from './api';

export const store = configureStore({
  reducer: {
    ui: uiSlice,
    [apiSlice.reducerPath]: apiSlice.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(apiSlice.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
