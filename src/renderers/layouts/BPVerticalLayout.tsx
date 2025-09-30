import React, { useEffect } from 'react';
import { Classes } from '@blueprintjs/core';
import type { LayoutProps, UISchemaElement } from '@jsonforms/core';
import { withJsonFormsLayoutProps, JsonFormsDispatch } from '@jsonforms/react';

const BPVerticalLayoutComp: React.FC<LayoutProps> = (props) => {
  useEffect(() => {
    console.debug('[BP-Layout] BPVerticalLayout mount', { uischema: props.uischema });
  }, [props.uischema]);

  const maybe = props.uischema as unknown as { elements?: UISchemaElement[] } | undefined;
  const elements = maybe?.elements ?? [];

  return (
    <div className={Classes.ELEVATION_0} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {elements.map((el, i) => (
        <JsonFormsDispatch
          key={i}
          uischema={el}
          schema={props.schema}
          path={props.path}
          enabled={props.enabled}
          renderers={props.renderers}
          cells={props.cells}
        />
      ))}
    </div>
  );
};

export const BPVerticalLayout = withJsonFormsLayoutProps(BPVerticalLayoutComp);
export default BPVerticalLayout;
