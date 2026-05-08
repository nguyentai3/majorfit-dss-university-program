import { useEffect } from 'react';
import { Form, Input, Modal } from 'antd';

export function QuestionBankModal({
    bankModal,
    bankForm,
    setBankModal,
    saveBankMutation,
}) {
    useEffect(() => {
        if (!bankModal.open) return;
        bankForm.resetFields();
        if (bankModal.mode === 'edit' && bankModal.record) {
            bankForm.setFieldsValue({
                name: bankModal.record.name,
                version: bankModal.record.version,
                description: bankModal.record.description,
                sourceLabel: bankModal.record.sourceLabel,
                sourceUrl: bankModal.record.sourceUrl,
                sourceCitation: bankModal.record.sourceCitation,
            });
        }
    }, [bankForm, bankModal.open, bankModal.mode, bankModal.record]);

    return (
        <Modal
            open={bankModal.open}
            title={bankModal.mode === 'edit' ? 'Edit Question Bank' : 'Create Question Bank'}
            okText="Save"
            onCancel={() => {
                setBankModal({ open: false, mode: 'create', record: null });
                bankForm.resetFields();
            }}
            confirmLoading={saveBankMutation.isPending}
            onOk={() => {
                bankForm
                    .validateFields()
                    .then((values) => {
                        saveBankMutation.mutate({
                            bankId: bankModal.record?.id,
                            payload: values,
                        });
                    })
                    .catch(() => {});
            }}
        >
            <Form form={bankForm} layout="vertical">
                <Form.Item label="Bank Name" name="name" rules={[{ required: true, min: 2 }]}>
                    <Input placeholder="RIASEC Custom 48 - 2026" />
                </Form.Item>
                <Form.Item label="Version Number" name="version" extra="Leave empty to auto-generate the next version.">
                    <Input disabled={bankModal.mode === 'edit'} placeholder="Auto" />
                </Form.Item>
                <Form.Item label="Description" name="description">
                    <Input.TextArea rows={3} />
                </Form.Item>
                <Form.Item label="Source Label" name="sourceLabel">
                    <Input placeholder="IIP / O*NET / Custom thesis adaptation" />
                </Form.Item>
                <Form.Item label="Source URL" name="sourceUrl">
                    <Input placeholder="https://..." />
                </Form.Item>
                <Form.Item label="Source Citation" name="sourceCitation">
                    <Input.TextArea rows={2} />
                </Form.Item>
            </Form>
        </Modal>
    );
}
