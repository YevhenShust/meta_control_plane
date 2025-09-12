import { Table } from 'antd';
import type { ColumnsType } from 'antd/es/table';

type KV = { key: string; value: string };

export default function LocationTable({ data }: { data: Record<string, unknown> }) {
  const rows: KV[] = Object.entries(data)
    .map(([k, v]) => ({ key: k, value: typeof v === 'object' ? JSON.stringify(v, null, 2) : String(v) }));

  const columns: ColumnsType<KV> = [
    { title: 'Property', dataIndex: 'key', key: 'key', width: 200 },
    { title: 'Value', dataIndex: 'value', key: 'value' },
  ];

  return (
    <Table columns={columns} dataSource={rows.map((r) => ({ ...r, key: r.key }))} pagination={false} size="small" />
  );
}
