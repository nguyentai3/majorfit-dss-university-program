import { Col, Form, Input, Modal, Row, Switch } from 'antd';

export function UniversityModal({
    universityModal,
    setUniversityModal,
    universityForm,
    saveUniversityMutation,
}) {
    return (
        <Modal
            open={universityModal.open}
            title={universityModal.mode === 'edit' ? 'Edit University' : 'Add University'}
            okText="Save"
            onCancel={() => {
                setUniversityModal({ open: false, mode: 'create', record: null });
                universityForm.resetFields();
            }}
            confirmLoading={saveUniversityMutation.isPending}
            onOk={() => {
                universityForm
                    .validateFields()
                    .then((values) => {
                        saveUniversityMutation.mutate({
                            universityId: universityModal.record?.id,
                            payload: values,
                        });
                    })
                    .catch(() => {});
            }}
        >
            <Form form={universityForm} layout="vertical">
                <Row gutter={12}>
                    <Col span={12}>
                        <Form.Item label="Code" name="code" rules={[{ required: true, min: 2 }]}>
                            <Input placeholder="HCMIU" />
                        </Form.Item>
                    </Col>
                    <Col span={12}>
                        <Form.Item label="Short Name" name="shortName">
                            <Input placeholder="HCMIU" />
                        </Form.Item>
                    </Col>
                </Row>
                <Form.Item label="University Name" name="name" rules={[{ required: true, min: 2 }]}>
                    <Input />
                </Form.Item>
                <Row gutter={12}>
                    <Col span={12}>
                        <Form.Item label="City" name="city">
                            <Input />
                        </Form.Item>
                    </Col>
                    <Col span={12}>
                        <Form.Item label="State" name="state">
                            <Input />
                        </Form.Item>
                    </Col>
                </Row>
                <Row gutter={12}>
                    <Col span={12}>
                        <Form.Item label="Country" name="country">
                            <Input />
                        </Form.Item>
                    </Col>
                    <Col span={12}>
                        <Form.Item label="Website" name="website">
                            <Input />
                        </Form.Item>
                    </Col>
                </Row>
                <Form.Item label="Overview" name="overview">
                    <Input.TextArea rows={3} />
                </Form.Item>
                <Form.Item label="Featured" name="featured" valuePropName="checked">
                    <Switch />
                </Form.Item>
            </Form>
        </Modal>
    );
}
