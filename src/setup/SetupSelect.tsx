import useSetups from './useSetups';
import { FormGroup, HTMLSelect } from '@blueprintjs/core';
import type { OptionProps } from '@blueprintjs/core';

export default function SetupSelect() {
  const { setups, selectedId, setSelectedId } = useSetups();
  const options: OptionProps[] = [{ label: 'Select setup', value: '' }, ...setups.map(s => ({ label: s.name ?? s.id, value: s.id }))];
  return (
    <div className="small-gap">
      <FormGroup label="Setup:" inline>
        <HTMLSelect className="select-minwidth" options={options} value={selectedId ?? ''} onChange={(e) => setSelectedId(String((e.target as HTMLSelectElement).value))} />
      </FormGroup>
    </div>
  );
}