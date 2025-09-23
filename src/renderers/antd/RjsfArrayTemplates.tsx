// src/renderers/antd/RjsfArrayTemplates.tsx
import { Button, Space } from 'antd';
import type {
  ArrayFieldTemplateProps,
  Registry,
} from '@rjsf/utils';

type ArrayFieldItemTemplateProps = NonNullable<
  ArrayFieldTemplateProps['items']
>[number];

export function ArrayFieldItemTemplate(props: ArrayFieldItemTemplateProps) {
  const {
    children,
    disabled,
    readonly,
    hasRemove,
    onDropIndexClick,
    index,
  } = props;

  return (
    <div style={{ marginBottom: 8 }}>
      <div>{children}</div>
      <Space.Compact style={{ marginTop: 6 }}>
        <Button
          danger
          disabled={disabled || readonly || !hasRemove}
          onClick={onDropIndexClick(index)}
        >
          ✖
        </Button>
      </Space.Compact>
    </div>
  );
}

export function ArrayFieldTemplate(props: ArrayFieldTemplateProps) {
  const { items, canAdd, onAddClick, registry } = props;
  // БЕРЕМО item-template з реєстру (або наш як fallback):
  const ItemTemplate =
    (registry as Registry).templates.ArrayFieldItemTemplate ||
    ArrayFieldItemTemplate;

  return (
    <div>
      {items?.map(({ key, ...childProps }) => (
        <ItemTemplate key={key} {...childProps} />
      ))}
      <div style={{ marginTop: 8 }}>
        <Space.Compact>
          <Button type="dashed" disabled={!canAdd} onClick={onAddClick}>
            ＋
          </Button>
        </Space.Compact>
      </div>
    </div>
  );
}
