import { Col, Form, Input, Modal, Row, Select, Switch } from 'antd';

export function QuestionModal({
    questionModal,
    setQuestionModal,
    questionForm,
    saveQuestionMutation,
    questionBanks = [],
}) {
    const bankOptions = questionBanks.map((bank) => ({
        value: bank.version,
        label: `${bank.name} (v${bank.version})`,
    }));

    return (
        <Modal
            open={questionModal.open}
            title={questionModal.mode === 'edit' ? 'Edit Question' : 'Add Question'}
            okText="Save"
            onCancel={() => {
                setQuestionModal({ open: false, mode: 'create', record: null });
                questionForm.resetFields();
            }}
            confirmLoading={saveQuestionMutation.isPending}
            onOk={() => {
                questionForm
                    .validateFields()
                    .then((values) => {
                        saveQuestionMutation.mutate({
                            questionId: questionModal.record?.id,
                            payload: values,
                        });
                    })
                    .catch(() => {});
            }}
        >
            <Form form={questionForm} layout="vertical">
                <Form.Item label="Question Prompt" name="question" rules={[{ required: true, min: 5 }]}>
                    <Input.TextArea rows={3} />
                </Form.Item>
                <Row gutter={12}>
                    <Col span={12}>
                        <Form.Item label="Code" name="code" rules={[{ required: true, min: 2 }]}>
                            <Input placeholder="R1 / I3 / A5" />
                        </Form.Item>
                    </Col>
                    <Col span={12}>
                        <Form.Item label="Dimension" name="dimension" rules={[{ required: true, min: 1 }]}>
                            <Select
                                options={[
                                    { value: 'R', label: 'R - Realistic' },
                                    { value: 'I', label: 'I - Investigative' },
                                    { value: 'A', label: 'A - Artistic' },
                                    { value: 'S', label: 'S - Social' },
                                    { value: 'E', label: 'E - Enterprising' },
                                    { value: 'C', label: 'C - Conventional' },
                                ]}
                            />
                        </Form.Item>
                    </Col>
                </Row>
                <Row gutter={12}>
                    <Col span={12}>
                        <Form.Item label="Question Bank" name="version">
                            {bankOptions.length ? (
                                <Select options={bankOptions} />
                            ) : (
                                <Input placeholder="2" />
                            )}
                        </Form.Item>
                    </Col>
                    <Col span={12}>
                        <Form.Item label="Order" name="order">
                            <Input placeholder="1" />
                        </Form.Item>
                    </Col>
                </Row>
                <Form.Item label="Active" name="active" valuePropName="checked" initialValue>
                    <Switch />
                </Form.Item>
            </Form>
        </Modal>
    );
}
