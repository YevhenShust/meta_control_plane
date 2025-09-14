import { Select, Typography, Space, Tag, Button } from 'antd';
import { PlusOutlined } from '@ant-design/icons';

export type TopBarProps = {
  setups: Array<{ id: string; name: string }>;
  selectedId?: string | null;
  onChange: (id: string) => void;
  onCreate: () => void;
};

export default function TopBar({ setups, selectedId, onChange, onCreate }: TopBarProps) {
  const options = setups.map(s => ({ label: s.name ?? s.id, value: s.id }));
  return (
    <Space style={{ width: '100%', padding: '8px 16px', background: '#fafafa', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between' }}>
      <Space>
        <Typography.Text strong>Setup:</Typography.Text>
        <Select
          style={{ minWidth: 260 }}
          placeholder="Select setup"
          options={options}
          value={selectedId ?? undefined}
          onChange={onChange}
          showSearch
          optionFilterProp="label"
        />
      </Space>
      <Space>
        <Button type="primary" icon={<PlusOutlined />} onClick={onCreate}>
          New
        </Button>
        <Typography.Text type="secondary">Current ID:</Typography.Text>
        <Tag color="blue">{selectedId ?? '—'}</Tag>
      </Space>
    </Space>
  );
}
