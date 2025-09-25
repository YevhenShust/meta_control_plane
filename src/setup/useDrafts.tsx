import { useContext } from 'react';
import DraftsContext from './DraftsContext';

export default function useDrafts() {
  const ctx = useContext(DraftsContext);
  if (!ctx) throw new Error('useDrafts must be used within DraftsProvider');
  return ctx;
}
