import React, { useEffect } from 'react';
import { Classes } from '@blueprintjs/core';
import type { LayoutProps, UISchemaElement } from '@jsonforms/core';
import { withJsonFormsLayoutProps, JsonFormsDispatch } from '@jsonforms/react';

const BPHorizontalLayoutComp: React.FC<LayoutProps> = (props) => {
  useEffect(() => {
    console.debug('[BP-Layout] BPHorizontalLayout mount', { uischema: props.uischema });
  }, [props.uischema]);

    const maybe = props.uischema as unknown as { elements?: UISchemaElement[] } | undefined;
    const elements = maybe?.elements ?? [];
  return (
    <div className={`${Classes.ELEVATION_0} bp-layout-horizontal`}>
          {elements.map((el, i) => (
            <div key={i} className="bp-layout-horizontal-item">
              <JsonFormsDispatch
                uischema={el}
                schema={props.schema}
                path={props.path}
                enabled={props.enabled}
                renderers={props.renderers}
                cells={props.cells}
              />
            </div>
          ))}
    </div>
  );
};

export const BPHorizontalLayout = withJsonFormsLayoutProps(BPHorizontalLayoutComp);
export default BPHorizontalLayout;
