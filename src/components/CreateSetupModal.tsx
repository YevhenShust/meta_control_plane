import { Modal, Form, Input } from 'antd';

export default function CreateSetupModal({
  open, loading, onCancel, onSubmit,
}: {
  open: boolean;
  loading?: boolean;
  onCancel: () => void;
  onSubmit: (name: string) => void;
}) {
  const [form] = Form.useForm<{ name: string }>();
  return (
    <Modal
      open={open}
      title="Create setup"
      okText="Create"
      confirmLoading={loading}
      onCancel={onCancel}
      onOk={() => {
        form.validateFields().then(({ name }) => onSubmit(name));
      }}
    >
      <Form form={form} layout="vertical" initialValues={{ name: '' }}>
        <Form.Item
          name="name"
          label="Setup name"
          rules={[{ required: true, message: 'Enter setup name' }]}
        >
          <Input placeholder="e.g. Setup 2025-09-12 12:34" />
        </Form.Item>
      </Form>
    </Modal>
  );
}
