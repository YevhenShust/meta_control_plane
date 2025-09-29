import useSetups from './useSetups';

export default function SetupSelect() {
  const { setups, selectedId, setSelectedId } = useSetups();
  return (
    <div className="small-gap">
      <div className="muted-text">Setup:</div>
      <select value={selectedId ?? ''} onChange={(e) => setSelectedId(String(e.target.value))} className="select-minwidth">
        <option value="">Select setup</option>
        {setups.map(s => <option key={s.id} value={s.id}>{s.name ?? s.id}</option>)}
      </select>
    </div>
  );
}