import { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import type { ICellEditorComp, ICellEditorParams } from 'ag-grid-community';
import { Checkbox } from '@blueprintjs/core';

const BooleanCellEditor = forwardRef<ICellEditorComp, ICellEditorParams>((props, ref) => {
  const [value, setValue] = useState(Boolean(props.value));
  const containerRef = useRef<HTMLDivElement>(null);

  useImperativeHandle(ref, () => ({
    getValue: () => value,
    getGui: () => containerRef.current!,
    isCancelBeforeStart: () => false,
    isCancelAfterEnd: () => false,
  }));

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => setValue(e.target.checked);

  return (
    <div ref={containerRef} style={{ padding: 4 }}>
      <Checkbox checked={value} onChange={handleChange} style={{ margin: 0 }} />
    </div>
  );
});

export default BooleanCellEditor;
