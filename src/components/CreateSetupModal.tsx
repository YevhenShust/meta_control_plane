import { useState } from 'react';

export default function CreateSetupModal({
  open, loading, onCancel, onSubmit,
}: {
  open: boolean;
  loading?: boolean;
  onCancel: () => void;
  onSubmit: (name: string) => void;
}) {
  const [name, setName] = useState('');
  if (!open) return null;
  return (
    <div role="dialog" aria-modal="true" className="modal-overlay">
      <div className="modal-panel">
        <div className="modal-title">Create setup</div>
        <div>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Setup name (e.g. My Setup)" className="input-full" />
        </div>
        <div className="modal-actions">
          <button onClick={onCancel}>Cancel</button>
          <button onClick={() => onSubmit(name)} disabled={loading || !name}>{loading ? 'Creating' : 'Create'}</button>
        </div>
      </div>
    </div>
  );
}
