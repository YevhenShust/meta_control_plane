import { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import type { ICellEditorComp } from 'ag-grid-community';
import { HTMLSelect } from '@blueprintjs/core';
import type { SelectEditorParams } from './types';

const SelectCellEditor = forwardRef<ICellEditorComp, SelectEditorParams>((props, ref) => {
  const [value, setValue] = useState(String(props.value ?? ''));
  const containerRef = useRef<HTMLDivElement>(null);

  useImperativeHandle(ref, () => ({
    getValue: () => value,
    getGui: () => containerRef.current!,
    isCancelBeforeStart: () => false,
    isCancelAfterEnd: () => false,
  }));

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => setValue(e.target.value);

  const opts = (props.enumValues || []).map(v => typeof v === 'string' ? v : { label: v.label, value: v.value });

  return (
    <div ref={containerRef}>
      <HTMLSelect value={value} onChange={handleChange} options={opts} fill />
    </div>
  );
});

export default SelectCellEditor;
