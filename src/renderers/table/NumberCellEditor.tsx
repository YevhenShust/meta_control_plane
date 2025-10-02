import { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import type { ICellEditorComp, ICellEditorParams } from 'ag-grid-community';
import { NumericInput } from '@blueprintjs/core';

const NumberCellEditor = forwardRef<ICellEditorComp, ICellEditorParams>((props, ref) => {
  const [value, setValue] = useState(props.value as number | undefined);
  const containerRef = useRef<HTMLDivElement>(null);

  useImperativeHandle(ref, () => ({
    getValue: () => value,
    getGui: () => containerRef.current!,
    isCancelBeforeStart: () => false,
    isCancelAfterEnd: () => false,
  }));

  const handleChange = (val: number) => setValue(val);

  return (
    <div ref={containerRef}>
      <NumericInput value={value} onValueChange={handleChange} fill buttonPosition="none" small />
    </div>
  );
});

export default NumberCellEditor;
