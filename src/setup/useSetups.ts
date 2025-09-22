import { useContext } from 'react';
import SetupsContext from './SetupsContext';

export default function useSetups() {
  const ctx = useContext(SetupsContext);
  if (!ctx) throw new Error('useSetups must be used within SetupsProvider');
  return ctx;
}
