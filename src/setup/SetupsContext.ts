import { createContext } from 'react';

export type SetupsContextValue = {
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
} | null;

const SetupsContext = createContext<SetupsContextValue>(null);
export default SetupsContext;
