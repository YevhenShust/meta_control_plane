import SpawnsTable from '../../components/SpawnsTable';

export default function AtlasChestsScreen({ params }: { params?: Record<string, string> }) {
  return (
    <div>
      <h3>Atlas Chests</h3>
      <div>Location: {params?.locationId ?? '-'}</div>
      <div style={{ marginTop: 8 }}>
        <em>no data yet</em>
      </div>
      <SpawnsTable data={[]} />
    </div>
  );
}
