import { Select, Typography, Space, Tag, Button } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import useSetups from '../setup/useSetups';

export default function TopBar() {
  const { setups, selectedId, setSelectedId, createSetup } = useSetups();
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
          onChange={id => setSelectedId(id as string)}
          showSearch
          optionFilterProp="label"
        />
      </Space>
      <Space>
        <Button type="primary" icon={<PlusOutlined />} onClick={async () => {
          const name = prompt('Setup name');
          if (name) await createSetup(name);
        }}>
          New
        </Button>
        <Typography.Text type="secondary">Current ID:</Typography.Text>
        <Tag color="blue">{selectedId ?? '—'}</Tag>
      </Space>
    </Space>
  );
}
