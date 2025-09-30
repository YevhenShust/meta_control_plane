import React, { useEffect } from 'react';
import { Card, H5 } from '@blueprintjs/core';
import type { LayoutProps, UISchemaElement } from '@jsonforms/core';
import { withJsonFormsLayoutProps, JsonFormsDispatch } from '@jsonforms/react';

const BPGroupLayoutComp: React.FC<LayoutProps> = (props) => {
  useEffect(() => {
      console.debug('[BP-Layout] BPGroupLayout mount', { uischema: props.uischema });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // label is not defined on base UISchemaElement type; access dynamically for now
    const uischemaDynamic = props.uischema as unknown as Record<string, unknown> | undefined;
  const label = uischemaDynamic && typeof uischemaDynamic['label'] === 'string' ? (uischemaDynamic['label'] as string) : undefined;
    const maybe = props.uischema as unknown as { elements?: UISchemaElement[] } | undefined;
    const elements = maybe?.elements ?? [];

  return (
    <Card elevation={0} style={{ marginBottom: 8 }}>
      {label && <H5>{label}</H5>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {elements.map((el, i) => (
              <div key={i}>{
                <JsonFormsDispatch
                  uischema={el}
                  schema={props.schema}
                  path={props.path}
                  enabled={props.enabled}
                  renderers={props.renderers}
                  cells={props.cells}
                />
              }</div>
            ))}
      </div>
    </Card>
  );
};

export const BPGroupLayout = withJsonFormsLayoutProps(BPGroupLayoutComp);
export default BPGroupLayout;
