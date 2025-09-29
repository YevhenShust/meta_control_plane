type Props = { schemaKey: string; uiSchema?: Record<string, unknown> };

// Minimal stub TableRenderer to avoid antd dependency while migrating to Blueprint.
export default function TableRenderer({ schemaKey }: Props) {
  return (
    <div className="content-padding">TableRenderer placeholder for schema: <strong>{schemaKey}</strong></div>
  );
}
