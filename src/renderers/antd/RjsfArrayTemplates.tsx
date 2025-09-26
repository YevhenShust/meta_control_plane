// src/renderers/antd/RjsfArrayTemplates.tsx
import { Button, Stack } from '@mui/material';
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
      <Stack direction="row" spacing={1} sx={{ marginTop: 1 }}>
        <Button
          color="error"
          variant="outlined"
          disabled={disabled || readonly || !hasRemove}
          onClick={onDropIndexClick(index)}
        >
          ✖
        </Button>
      </Stack>
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
        <Stack direction="row">
          <Button variant="outlined" disabled={!canAdd} onClick={onAddClick}>
            ＋
          </Button>
        </Stack>
      </div>
    </div>
  );
}
