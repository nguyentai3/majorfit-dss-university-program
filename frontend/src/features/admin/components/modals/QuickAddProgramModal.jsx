import { useState } from 'react';
import {
    Alert,
    Button,
    Col,
    Form,
    Input,
    Modal,
    Row,
    Select,
    Space,
    Typography,
    message,
} from 'antd';
import { useNavigate } from 'react-router-dom';
import { getApiErrorMessage } from '@frontend/api/api';
import { createAdminProgram } from '@frontend/api/services/admin';
import { FOCUS_AREA_OPTIONS } from '@frontend/features/admin/config/focusAreaOptions';

const { Text } = Typography;

function toSlug(name) {
    return name
        .toLowerCase()
        .normalize('NFD').replace(/[̀-ͯ]/g, '')
        .replace(/đ/g, 'd')
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-');
}

export function QuickAddProgramModal({ open, onClose, universities, onSuccess }) {
    const [form] = Form.useForm();
    const [saving, setSaving] = useState(false);
    const navigate = useNavigate();

    const handleClose = () => {
        form.resetFields();
        onClose();
    };

    const handleSubmit = async () => {
        let values;
        try {
            values = await form.validateFields();
        } catch {
            return;
        }

        setSaving(true);
        try {
            const payload = { ...values, status: 'DRAFT' };
            const result = await createAdminProgram(payload);
            const created = result.item;

            if (result.resumed) {
                message.info('Resumed existing draft. Continue configuring it.');
            } else {
                message.success('Program created. Let\'s configure it.');
            }

            onSuccess?.();
            handleClose();
            navigate(`/admin/programs/${created.id}/analyze`);
        } catch (err) {
            message.error(getApiErrorMessage(err, 'Failed to create program'));
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal
            open={open}
            title={
                <Space>
                    <span>🎓 Add Program</span>
                    <Text type="secondary" style={{ fontSize: 12, fontWeight: 'normal' }}>
                        Stage 1 of 2: Registration
                    </Text>
                </Space>
            }
            width={680}
            footer={null}
            onCancel={handleClose}
            maskClosable={false}
            destroyOnClose
        >
            <Form form={form} layout="vertical" style={{ marginTop: 8 }}>
                <Row gutter={12}>
                    <Col span={12}>
                        <Form.Item
                            label="University"
                            name="universityId"
                            rules={[{ required: true, message: 'Please select a university' }]}
                        >
                            <Select
                                showSearch
                                optionFilterProp="label"
                                placeholder="Select university..."
                                options={universities.map((u) => ({
                                    value: u.id,
                                    label: `${u.shortName || u.code} — ${u.name}`,
                                }))}
                            />
                        </Form.Item>
                    </Col>
                    <Col span={12}>
                        <Form.Item label="Focus Area" name="focusArea">
                            <Select
                                showSearch
                                allowClear
                                placeholder="Select focus area..."
                                optionFilterProp="label"
                                options={FOCUS_AREA_OPTIONS}
                            />
                        </Form.Item>
                    </Col>
                </Row>

                <Form.Item
                    label="Program Name"
                    name="name"
                    rules={[{ required: true, message: 'Program name is required', min: 2 }]}
                >
                    <Input
                        placeholder="e.g. Information Technology"
                        onChange={(e) => {
                            const slug = toSlug(e.target.value);
                            form.setFieldValue('slug', slug);
                        }}
                    />
                </Form.Item>

                <Form.Item
                    label="Program Code"
                    name="code"
                    rules={[{ required: true, message: 'Code required', min: 2 }]}
                >
                    <Input placeholder="e.g. HCMIU-IT" style={{ textTransform: 'uppercase' }} />
                </Form.Item>

                <Form.Item name="slug" hidden><Input /></Form.Item>

                <Form.Item
                    label="Key Courses (optional, helps AI suggest better O*NET occupations later)"
                    name="keyCourses"
                    getValueFromEvent={(e) => e.target.value.split('\n').map((s) => s.trim()).filter(Boolean)}
                    getValueProps={(val) => ({ value: Array.isArray(val) ? val.join('\n') : val || '' })}
                >
                    <Input.TextArea
                        rows={4}
                        placeholder={'Data Structures & Algorithms\nDatabase Systems\nComputer Networks\nArtificial Intelligence'}
                    />
                </Form.Item>

                <Alert
                    type="info"
                    showIcon
                    message="DRAFT will be created"
                    description={
                        <Text style={{ fontSize: 13 }}>
                            You'll configure <strong>O*NET mapping</strong>, upload <strong>curriculum</strong>,
                            and review the <strong>RIASEC profile</strong> on the next page (Stage 2: Enrichment).
                        </Text>
                    }
                    style={{ marginTop: 4, marginBottom: 16 }}
                />

                <div style={{ textAlign: 'right' }}>
                    <Space>
                        <Button onClick={handleClose} disabled={saving}>Cancel</Button>
                        <Button type="primary" onClick={handleSubmit} loading={saving} size="large">
                            Create & Configure →
                        </Button>
                    </Space>
                </div>
            </Form>
        </Modal>
    );
}
