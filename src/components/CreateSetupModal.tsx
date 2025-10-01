import { useState } from 'react';
import { Dialog, Button, InputGroup, Classes } from '@blueprintjs/core';

export default function CreateSetupModal({
  open, loading, onCancel, onSubmit,
}: {
  open: boolean;
  loading?: boolean;
  onCancel: () => void;
  onSubmit: (name: string) => void;
}) {
  const [name, setName] = useState('');
  return (
    <Dialog isOpen={open} onClose={onCancel} title="Create setup" canEscapeKeyClose canOutsideClickClose>
      <div className={Classes.DIALOG_BODY}>
        <InputGroup
          placeholder="Setup name (e.g. My Setup)"
          value={name}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
          fill
        />
      </div>
      <div className={Classes.DIALOG_FOOTER}>
        <div className={Classes.DIALOG_FOOTER_ACTIONS}>
          <Button onClick={onCancel}>Cancel</Button>
          <Button intent="primary" onClick={() => onSubmit(name)} disabled={!!loading || !name} loading={!!loading}>Create</Button>
        </div>
      </div>
    </Dialog>
  );
}
