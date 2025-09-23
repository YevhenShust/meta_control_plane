import { Select } from 'antd';
import useSetups from './useSetups';

export default function SetupSelect() {
  const { setups, selectedId, setSelectedId } = useSetups();
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ color: '#666' }}>Setup:</span>
      <Select
        value={selectedId ?? undefined}
        onChange={(v) => setSelectedId(String(v))}
        options={(setups ?? []).map(s => ({ label: s.name ?? s.id, value: s.id }))}
        style={{ minWidth: 200 }}
      />
    </div>
  );
}
