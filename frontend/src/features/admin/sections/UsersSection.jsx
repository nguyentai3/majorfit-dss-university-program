import DatabaseOutlined from '@ant-design/icons/DatabaseOutlined';
import { Button, Card, Input, Space, Table } from 'antd';
import { SectionHeader } from '@frontend/features/admin/components/SectionHeader';
import { AdminLoadError } from '@frontend/features/admin/components/AdminLoadError';

export function UsersSection({
    error,
    loading,
    users,
    userColumns,
    setUserSearch,
    exportAssessmentCsv,
}) {
    return (
        <Card variant="borderless" className="rounded-2xl">
            <SectionHeader
                title="User Management"
                description="Review registered users, academic context, and assessment progression."
                extra={
                    <Space wrap>
                        <Input.Search
                            allowClear
                            placeholder="Search user email/name"
                            style={{ width: 260 }}
                            onSearch={setUserSearch}
                        />
                        <Button icon={<DatabaseOutlined />} onClick={exportAssessmentCsv}>
                            Export Assessment CSV
                        </Button>
                    </Space>
                }
            />

            <AdminLoadError error={error} />

            <Table
                rowKey="id"
                size="small"
                loading={loading}
                columns={userColumns}
                dataSource={users}
                pagination={{ pageSize: 12 }}
                scroll={{ x: 900 }}
            />
        </Card>
    );
}
