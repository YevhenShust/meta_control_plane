import { Select, Typography, Space, Tag, Button } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import useSetups from '../setup/useSetups';

export default function Header() {
  const { setups, selectedId, setSelectedId, createSetup } = useSetups();
  const options = setups.map(s => ({ label: s.name ?? s.id, value: s.id }));

  return (
    <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <Space>
        <Typography.Text strong style={{ color: 'var(--slate-text)' }}>Setup:</Typography.Text>
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
        <Button
          className="slate-icon-button"
          icon={<PlusOutlined />}
          onClick={async () => {
            const name = prompt('Setup name');
            if (name) await createSetup(name);
          }}
        />
        <Typography.Text type="secondary" style={{ color: 'var(--slate-muted)' }}>Current ID:</Typography.Text>
        <Tag color="blue">{selectedId ?? '—'}</Tag>
      </Space>
    </div>
  );
}
