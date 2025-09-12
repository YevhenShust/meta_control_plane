import { Table } from "antd";

export type Vector3 = { X?: number; Y?: number; Z?: number };
export type Spawn = {
  Id?: string;
  DescriptorId?: string;
  Position?: Vector3;
  Rotation?: Vector3;
} & Record<string, unknown>;

export default function SpawnsTable({ data }: { data: Spawn[] }) {
  const columns = [
    { title: "#", key: "index", render: (_: unknown, __: unknown, idx: number) => idx + 1, width: 60 },
    { title: "Id", dataIndex: ["Id"], key: "Id" },
    { title: "DescriptorId", dataIndex: ["DescriptorId"], key: "DescriptorId" },
    { title: "Pos X", dataIndex: ["Position", "X"], key: "posx" },
    { title: "Pos Y", dataIndex: ["Position", "Y"], key: "posy" },
    { title: "Pos Z", dataIndex: ["Position", "Z"], key: "posz" },
  ];

  return (
    <Table
      columns={columns}
      dataSource={data.map((d, i) => ({ key: i, ...d }))}
      rowKey={(r) => String((r as unknown as { key: number }).key)}
      pagination={{ pageSize: 20 }}
      size="small"
    />
  );
}
