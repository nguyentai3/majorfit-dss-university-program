import QuestionCircleOutlined from '@ant-design/icons/QuestionCircleOutlined';
import { Button, Card, Input, Popconfirm, Select, Space, Table, Tag, Typography } from 'antd';
import { SectionHeader } from '@frontend/features/admin/components/SectionHeader';
import { AdminLoadError } from '@frontend/features/admin/components/AdminLoadError';

const DIMENSIONS = ['R', 'I', 'A', 'S', 'E', 'C'];

export function QuestionsSection({
    error,
    loading,
    questions,
    questionColumns,
    setQuestionSearch,
    setQuestionModal,
    questionForm,
    questionBanks = [],
    questionBanksLoading = false,
    selectedBankVersion,
    setSelectedBankVersion,
    setBankModal,
    cloneBankMutation,
    publishBankMutation,
    setDefaultBankMutation,
    deleteBankMutation,
}) {
    const defaultBank = questionBanks.find((bank) => bank.isDefault);
    const activeBankVersion = selectedBankVersion ?? defaultBank?.version ?? 2;
    const selectedBank = questionBanks.find((bank) => bank.version === activeBankVersion);
    const bankOptions = questionBanks.map((bank) => ({
        value: bank.version,
        label: `${bank.name} (v${bank.version})`,
    }));
    const bankColumns = [
        {
            title: 'Question Bank',
            key: 'name',
            render: (_, row) => (
                <Space direction="vertical" size={0}>
                    <Space wrap>
                        <Typography.Text strong>{row.name}</Typography.Text>
                        <Tag>v{row.version}</Tag>
                        {row.isDefault ? <Tag color="gold">Default</Tag> : null}
                        <Tag color={row.status === 'PUBLISHED' ? 'green' : 'blue'}>{row.status}</Tag>
                    </Space>
                    <Typography.Text type="secondary">{row.description || row.sourceLabel || 'No description'}</Typography.Text>
                </Space>
            ),
        },
        {
            title: 'Validation',
            key: 'validation',
            render: (_, row) => (
                <Space direction="vertical" size={0}>
                    <Typography.Text strong>
                        {row.activeQuestionCount || 0}/48 active
                    </Typography.Text>
                    <Typography.Text type={row.isPublishable ? 'success' : 'secondary'}>
                        {DIMENSIONS.map((dimension) => `${dimension}:${row.dimensionCounts?.[dimension] || 0}`).join('  ')}
                    </Typography.Text>
                </Space>
            ),
        },
        {
            title: 'Actions',
            key: 'actions',
            render: (_, row) => (
                <Space wrap>
                    <Button
                        size="small"
                        onClick={() => {
                            setBankModal?.({ open: true, mode: 'edit', record: row });
                        }}
                    >
                        Edit
                    </Button>
                    <Button
                        size="small"
                        onClick={() => cloneBankMutation?.mutate({
                            bankId: row.id,
                            payload: { name: `${row.name} - Draft Copy` },
                        })}
                    >
                        Clone
                    </Button>
                    <Button
                        size="small"
                        disabled={!row.isPublishable}
                        onClick={() => publishBankMutation?.mutate(row.id)}
                    >
                        Publish
                    </Button>
                    <Button
                        size="small"
                        type={row.isDefault ? 'default' : 'primary'}
                        disabled={!row.isPublishable || row.isDefault}
                        onClick={() => setDefaultBankMutation?.mutate(row.id)}
                    >
                        Set Default
                    </Button>
                    <Popconfirm
                        title="Delete this draft bank and its questions?"
                        okText="Delete"
                        okButtonProps={{ danger: true }}
                        onConfirm={() => deleteBankMutation?.mutate(row.id)}
                    >
                        <Button size="small" danger disabled={row.isDefault || row.status !== 'DRAFT'}>
                            Delete
                        </Button>
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    return (
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <Card variant="borderless" className="rounded-2xl">
                <SectionHeader
                    title="Question Bank Workflow"
                    description="Create a draft bank, add 48 questions, publish after validation, then set it as the default assessment bank."
                    extra={
                        <Button
                            type="primary"
                            onClick={() => setBankModal?.({ open: true, mode: 'create', record: null })}
                        >
                            Create Bank
                        </Button>
                    }
                />
                <Table
                    rowKey="id"
                    size="small"
                    loading={questionBanksLoading}
                    columns={bankColumns}
                    dataSource={questionBanks}
                    pagination={false}
                    scroll={{ x: 980 }}
                />
            </Card>

            <Card variant="borderless" className="rounded-2xl">
                <SectionHeader
                    title="Assessment Question Management"
                    description="Admin can add, edit, delete, activate, and deactivate questions inside the selected bank."
                    extra={
                        <Space wrap>
                            {selectedBank ? (
                                <Tag color={selectedBank.isDefault ? 'gold' : 'blue'}>
                                    {selectedBank.isDefault ? 'Default' : selectedBank.status}: v{selectedBank.version}
                                </Tag>
                            ) : null}
                            <Select
                                style={{ minWidth: 300 }}
                                value={activeBankVersion}
                                options={bankOptions}
                                onChange={setSelectedBankVersion}
                            />
                            <Input.Search
                                allowClear
                                placeholder="Search question"
                                style={{ width: 240 }}
                                onSearch={setQuestionSearch}
                            />
                            <Button
                                type="primary"
                                icon={<QuestionCircleOutlined />}
                                onClick={() => {
                                    setQuestionModal({ open: true, mode: 'create', record: null });
                                    questionForm.resetFields();
                                    questionForm.setFieldsValue({
                                        active: true,
                                        order: questions.length + 1,
                                        version: activeBankVersion,
                                        dimension: 'R',
                                    });
                                }}
                            >
                                Add Question
                            </Button>
                        </Space>
                    }
                />

                <AdminLoadError error={error} />

                <Table
                    rowKey="id"
                    size="small"
                    loading={loading}
                    columns={questionColumns}
                    dataSource={questions}
                    pagination={{ pageSize: 10 }}
                    scroll={{ x: 940 }}
                />
            </Card>
        </Space>
    );
}
