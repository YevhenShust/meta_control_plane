import { FormGroup, HTMLSelect } from '@blueprintjs/core';
import { useListSetupsQuery } from '../store/api';
import { useContext, useEffect } from 'react';
import useCurrentSetupId from '../hooks/useCurrentSetupId';
import SetupsContext from './SetupsContext';
import type { OptionProps } from '@blueprintjs/core';

export default function SetupSelect() {
  const { data: setupsData } = useListSetupsQuery();
  const setups = (setupsData ?? []).map(s => ({ id: String(s.id), name: String((s as { name?: unknown }).name ?? s.id ?? '') }));
  const [selectedId, setSelectedIdLocal] = useCurrentSetupId();
  const ctx = useContext(SetupsContext);
  const setSelectedId = ctx?.setSelectedId ?? setSelectedIdLocal;

  useEffect(() => {
    // Normalize selectedId if it's not in the list anymore
    if (selectedId && !setups.find(s => s.id === selectedId)) {
      setSelectedId(null);
      try { localStorage.removeItem('selectedSetupId'); } catch { /* ignore */ }
    }
  }, [setups, selectedId, setSelectedId]);

  const options: OptionProps[] = [{ label: 'Select setup', value: '' }, ...setups.map(s => ({ label: s.name ?? s.id, value: s.id }))];
  return (
    <div className="small-gap">
      <FormGroup label="Setup:" inline>
        <HTMLSelect
          className="select-minwidth"
          options={options}
          value={selectedId ?? ''}
          onChange={(e) => {
            const val = String((e.target as HTMLSelectElement).value) || null;
            setSelectedId(val);
          }}
        />
      </FormGroup>
    </div>
  );
}