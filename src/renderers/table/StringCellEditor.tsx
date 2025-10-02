import { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import type { ICellEditorComp, ICellEditorParams } from 'ag-grid-community';
import { InputGroup } from '@blueprintjs/core';

const StringCellEditor = forwardRef<ICellEditorComp, ICellEditorParams>((props, ref) => {
  const [value, setValue] = useState(String(props.value ?? ''));
  const containerRef = useRef<HTMLDivElement>(null);

  useImperativeHandle(ref, () => ({
    getValue: () => value,
    getGui: () => containerRef.current!,
    isCancelBeforeStart: () => false,
    isCancelAfterEnd: () => false,
  }));

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => setValue(e.target.value);

  return (
    <div ref={containerRef}>
      <InputGroup value={value} onChange={handleChange} fill small />
    </div>
  );
});

export default StringCellEditor;
