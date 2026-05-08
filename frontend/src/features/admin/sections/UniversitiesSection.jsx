import HomeOutlined from '@ant-design/icons/HomeOutlined';
import { Button, Card, Input, Space, Table } from 'antd';
import { SectionHeader } from '@frontend/features/admin/components/SectionHeader';
import { AdminLoadError } from '@frontend/features/admin/components/AdminLoadError';

export function UniversitiesSection({
    error,
    loading,
    universities,
    universityColumns,
    setUniversitySearch,
    setUniversityModal,
    universityForm,
}) {
    return (
        <Card variant="borderless" className="rounded-2xl">
            <SectionHeader
                title="University Management"
                description="Manage thesis source universities that host curriculum-backed programs."
                extra={
                    <Space wrap>
                        <Input.Search
                            allowClear
                            placeholder="Search university"
                            style={{ width: 240 }}
                            onSearch={setUniversitySearch}
                        />
                        <Button
                            type="primary"
                            icon={<HomeOutlined />}
                            onClick={() => {
                                setUniversityModal({ open: true, mode: 'create', record: null });
                                universityForm.resetFields();
                            }}
                        >
                            Add University
                        </Button>
                    </Space>
                }
            />

            <AdminLoadError error={error} />

            <Table
                rowKey="id"
                size="small"
                loading={loading}
                columns={universityColumns}
                dataSource={universities}
                pagination={{ pageSize: 10 }}
                scroll={{ x: 900 }}
            />
        </Card>
    );
}
