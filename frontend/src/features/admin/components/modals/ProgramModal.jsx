import { Col, Form, Input, Modal, Row, Select, Switch } from 'antd';
import { FOCUS_AREA_OPTIONS } from '@frontend/features/admin/config/focusAreaOptions';

export function ProgramModal({
    programModal,
    setProgramModal,
    programForm,
    saveProgramMutation,
    universities,
}) {
    return (
        <Modal
            open={programModal.open}
            title={programModal.mode === 'edit' ? 'Edit Program' : 'Add Program'}
            okText="Save"
            width={820}
            onCancel={() => {
                setProgramModal({ open: false, mode: 'create', record: null });
                programForm.resetFields();
            }}
            confirmLoading={saveProgramMutation.isPending}
            onOk={() => {
                programForm
                    .validateFields()
                    .then((values) => {
                        saveProgramMutation.mutate({
                            programId: programModal.record?.id,
                            payload: values,
                        });
                    })
                    .catch(() => {});
            }}
        >
            <Form form={programForm} layout="vertical">
                <Row gutter={12}>
                    <Col span={12}>
                        <Form.Item label="University" name="universityId" rules={[{ required: true }]}>
                            <Select
                                showSearch
                                optionFilterProp="label"
                                options={universities.map((row) => ({
                                    value: row.id,
                                    label: `${row.shortName || row.code} - ${row.name}`,
                                }))}
                            />
                        </Form.Item>
                    </Col>
                    <Col span={12}>
                        <Form.Item label="Focus Area" name="focusArea">
                            <Select
                                showSearch
                                allowClear
                                placeholder="Select or search..."
                                optionFilterProp="label"
                                options={FOCUS_AREA_OPTIONS}
                            />
                        </Form.Item>
                    </Col>
                </Row>
                <Row gutter={12}>
                    <Col span={8}>
                        <Form.Item label="Code" name="code" rules={[{ required: true, min: 2 }]}>
                            <Input placeholder="HCMIU-IT" />
                        </Form.Item>
                    </Col>
                    <Col span={8}>
                        <Form.Item label="Slug" name="slug">
                            <Input placeholder="hcmiu-information-technology" />
                        </Form.Item>
                    </Col>
                    <Col span={8}>
                        <Form.Item label="Degree Level" name="degreeLevel">
                            <Input placeholder="Bachelor" />
                        </Form.Item>
                    </Col>
                </Row>
                <Form.Item label="Program Name" name="name" rules={[{ required: true, min: 2 }]}>
                    <Input />
                </Form.Item>
                <Row gutter={12}>
                    <Col span={16}>
                        <Form.Item label="Department" name="department">
                            <Input />
                        </Form.Item>
                    </Col>
                    <Col span={8}>
                        <Form.Item label="Duration Years" name="durationYears">
                            <Input placeholder="4" />
                        </Form.Item>
                    </Col>
                </Row>
                <Form.Item label="Source URL" name="sourceUrl">
                    <Input />
                </Form.Item>
                <Form.Item label="Summary" name="summary">
                    <Input.TextArea rows={3} />
                </Form.Item>
                <Form.Item
                    label="Key Courses (one per line — copy from official curriculum)"
                    name="keyCourses"
                    getValueFromEvent={(e) => e.target.value.split('\n').map((s) => s.trim()).filter(Boolean)}
                    getValueProps={(val) => ({ value: Array.isArray(val) ? val.join('\n') : val || '' })}
                >
                    <Input.TextArea
                        rows={5}
                        placeholder={'Lập trình C++\nCấu trúc dữ liệu & Giải thuật\nMạng máy tính\nCơ sở dữ liệu\nTrí tuệ nhân tạo'}
                    />
                </Form.Item>
                <Form.Item label="Curriculum Source URL (official university page)" name="courseSourceUrl">
                    <Input placeholder="https://bku.edu.vn/ctdt/cntt" />
                </Form.Item>
                <Row gutter={12}>
                    <Col span={12}>
                        <Form.Item label="Status" name="status">
                            <Select
                                options={[
                                    { value: 'ACTIVE', label: 'ACTIVE' },
                                    { value: 'ARCHIVED', label: 'ARCHIVED' },
                                    { value: 'DRAFT', label: 'DRAFT' },
                                ]}
                            />
                        </Form.Item>
                    </Col>
                    <Col span={12}>
                        <Form.Item label="Featured" name="featured" valuePropName="checked">
                            <Switch />
                        </Form.Item>
                    </Col>
                </Row>
            </Form>
        </Modal>
    );
}
