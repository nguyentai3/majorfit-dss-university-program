import DatabaseOutlined from '@ant-design/icons/DatabaseOutlined';
import UploadOutlined from '@ant-design/icons/UploadOutlined';
import { Button, Card, Input, Select, Space, Table } from 'antd';
import { useMemo } from 'react';
import { SectionHeader } from '@frontend/features/admin/components/SectionHeader';
import { AdminLoadError } from '@frontend/features/admin/components/AdminLoadError';

export function ProgramsSection({
    error,
    loading,
    programs,
    programColumns,
    universities,
    setProgramSearch,
    setProgramUniversityFilter,
    setProgramFocusAreaFilter,
    setProgramStatusFilter,
    programUniversityFilter,
    programFocusAreaFilter,
    programStatusFilter,
    setProgramModal,
    programForm,
    setWizardOpen,
    setBulkImportOpen,
}) {
    const universityOptions = useMemo(
        () => universities.map((row) => ({
            value: row.id,
            label: `${row.shortName || row.code} - ${row.name}`,
        })),
        [universities],
    );

    const focusAreaOptions = useMemo(
        () => Array.from(new Set(programs.map((row) => row.focusArea).filter(Boolean)))
            .sort((a, b) => a.localeCompare(b))
            .map((value) => ({ value, label: value })),
        [programs],
    );

    return (
        <Card variant="borderless" className="rounded-2xl">
            <SectionHeader
                title="Program Management"
                description="Manage program metadata, curriculum versions, and the manual AI workflow for Step 2."
                extra={
                    <Space wrap>
                        <Input.Search
                            allowClear
                            placeholder="Search program"
                            style={{ width: 240 }}
                            onSearch={setProgramSearch}
                            onChange={(event) => {
                                if (!event.target.value) setProgramSearch('');
                            }}
                        />
                        <Select
                            allowClear
                            showSearch
                            placeholder="Filter university"
                            style={{ width: 220 }}
                            optionFilterProp="label"
                            options={universityOptions}
                            value={programUniversityFilter || undefined}
                            onChange={(value) => setProgramUniversityFilter(value || '')}
                        />
                        <Select
                            allowClear
                            showSearch
                            placeholder="Filter focus area"
                            style={{ width: 180 }}
                            optionFilterProp="label"
                            options={focusAreaOptions}
                            value={programFocusAreaFilter || undefined}
                            onChange={(value) => setProgramFocusAreaFilter(value || '')}
                        />
                        <Select
                            allowClear
                            placeholder="Filter status"
                            style={{ width: 220 }}
                            value={programStatusFilter || undefined}
                            onChange={(value) => setProgramStatusFilter(value || '')}
                            options={[
                                { value: '', label: 'All Statuses' },
                                { value: 'MISSING_CURRICULUM', label: 'Missing Curriculum' },
                                { value: 'MISSING_PROFILE', label: 'Missing Published Profile' },
                                { value: 'DRAFT', label: 'Draft Programs' },
                                { value: 'PUBLISHED', label: 'Published Programs' },
                            ]}
                        />
                        <Button
                            icon={<UploadOutlined />}
                            onClick={() => setBulkImportOpen(true)}
                        >
                            Import Excel
                        </Button>
                        <Button
                            type="primary"
                            icon={<DatabaseOutlined />}
                            onClick={() => setWizardOpen(true)}
                        >
                            Add Program
                        </Button>
                    </Space>
                }
            />

            <AdminLoadError error={error} />

            <Table
                rowKey="id"
                size="small"
                loading={loading}
                columns={programColumns}
                dataSource={programs}
                pagination={{ pageSize: 10 }}
                scroll={{ x: 1080 }}
            />
        </Card>
    );
}
