type Props = { setupId: string; schemaKey: string; draftId?: string };

export default function FormRenderer(props: Props) {
  const { setupId, schemaKey, draftId } = props;

  return (
    <div className="content-padding">
      <strong>Form renderer (stub)</strong>
      <div className="mt-sm">Schema: <code>{schemaKey}</code></div>
      <div className="mt-sm">Draft id: <code>{draftId ?? '<none>'}</code></div>
      <div className="mt-sm">Setup id: <code>{setupId}</code></div>
      <div className="mt-sm text-muted-quiet">This is a placeholder renderer mounted during the migration.</div>
    </div>
  );
}
