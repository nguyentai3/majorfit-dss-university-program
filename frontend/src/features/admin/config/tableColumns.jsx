import DeleteOutlined from '@ant-design/icons/DeleteOutlined';
import EditOutlined from '@ant-design/icons/EditOutlined';
import { Button, Popconfirm, Space, Tag, Typography } from 'antd';
import { formatAssessmentContext } from '@frontend/features/admin/utils/formatters';
import { buildHollandCode } from '@frontend/utils/riasec';

export function createUserColumns({ openStudentReport }) {
    return [
        {
            title: 'User',
            key: 'user',
            render: (_, row) => (
                <Space direction="vertical" size={0}>
                    <Space>
                        <Typography.Text strong>{row.email}</Typography.Text>
                        {row.isAdmin ? <Tag color="gold">Admin</Tag> : null}
                    </Space>
                    <Typography.Text type="secondary">
                        {[row.firstName, row.lastName].filter(Boolean).join(' ') || 'No profile name'}
                    </Typography.Text>
                </Space>
            ),
        },
        {
            title: 'Role',
            dataIndex: 'role',
            key: 'role',
            render: (role) => <Tag color={role === 'ADMIN' ? 'gold' : 'default'}>{role || 'USER'}</Tag>,
        },
        {
            title: 'Academic Context',
            key: 'academicContext',
            render: (_, row) => (
                <Space direction="vertical" size={0}>
                    <Typography.Text>{row.gradeLevel ? `Grade ${row.gradeLevel}` : 'Grade -'}</Typography.Text>
                    <Typography.Text type="secondary">
                        {[row.classCode, row.academicYear].filter(Boolean).join(' • ') || row.schoolName || 'No school context'}
                    </Typography.Text>
                </Space>
            ),
        },
        {
            title: 'Assessment Tracking',
            key: 'assessmentTracking',
            render: (_, row) => (
                <Space direction="vertical" size={0}>
                    <Typography.Text strong>{row.assessmentCount || 0} attempts</Typography.Text>
                    <Typography.Text type="secondary">
                        {row.lastAssessmentAt ? `Last: ${new Date(row.lastAssessmentAt).toLocaleDateString()}` : 'No attempts yet'}
                    </Typography.Text>
                </Space>
            ),
        },
        {
            title: 'Latest Profile',
            key: 'latestProfile',
            render: (_, row) => (
                <Space direction="vertical" size={0}>
                    <Typography.Text strong>{row.latestHollandCode || '-'}</Typography.Text>
                    <Typography.Text type="secondary">
                        Confidence {typeof row.confidenceScore === 'number' ? `${row.confidenceScore}/100` : '-'}
                    </Typography.Text>
                </Space>
            ),
        },
        {
            title: 'Actions',
            key: 'actions',
            render: (_, row) => (
                <Button size="small" onClick={() => openStudentReport(row.id)}>
                    View Assessment Report
                </Button>
            ),
        },
    ];
}

export function createUniversityColumns({
    setUniversityModal,
    universityForm,
    deleteUniversityMutation,
}) {
    return [
        {
            title: 'University',
            key: 'university',
            render: (_, row) => (
                <Space direction="vertical" size={0}>
                    <Typography.Text strong>{row.name}</Typography.Text>
                    <Typography.Text type="secondary">
                        {[row.shortName, row.city, row.state].filter(Boolean).join(' • ') || row.code}
                    </Typography.Text>
                </Space>
            ),
        },
        {
            title: 'Programs',
            key: 'programCount',
            render: (_, row) => <Typography.Text strong>{row.programCount || 0}</Typography.Text>,
        },
        {
            title: 'Website',
            dataIndex: 'website',
            key: 'website',
            render: (value) =>
                value ? (
                    <Typography.Link href={value} target="_blank" rel="noreferrer">
                        {value}
                    </Typography.Link>
                ) : (
                    '-'
                ),
        },
        {
            title: 'Actions',
            key: 'actions',
            render: (_, row) => (
                <Space>
                    <Button
                        size="small"
                        icon={<EditOutlined />}
                        onClick={() => {
                            universityForm.resetFields();
                            setUniversityModal({ open: true, mode: 'edit', record: row });
                            universityForm.setFieldsValue({
                                code: row.code ?? undefined,
                                shortName: row.shortName ?? undefined,
                                name: row.name ?? undefined,
                                city: row.city ?? undefined,
                                state: row.state ?? undefined,
                                country: row.country ?? undefined,
                                website: row.website ?? undefined,
                                overview: row.overview ?? undefined,
                                featured: row.featured ?? false,
                            });
                        }}
                    >
                        Edit
                    </Button>
                    <Popconfirm
                        title="Delete this university?"
                        okText="Delete"
                        okButtonProps={{ danger: true }}
                        onConfirm={() => deleteUniversityMutation.mutate(row.id)}
                    >
                        <Button size="small" danger icon={<DeleteOutlined />}>
                            Delete
                        </Button>
                    </Popconfirm>
                </Space>
            ),
        },
    ];
}

export function createProgramColumns({
    openProgramWorkspace,
    setProgramModal,
    programForm,
    deleteProgramMutation,
}) {
    return [
        {
            title: 'Program',
            key: 'program',
            render: (_, row) => (
                <Space direction="vertical" size={0}>
                    <Typography.Text strong>{row.name}</Typography.Text>
                    <Typography.Text type="secondary">
                        {[row.university?.shortName || row.university?.name, row.focusArea].filter(Boolean).join(' • ')}
                    </Typography.Text>
                </Space>
            ),
        },
        {
            title: 'Lifecycle',
            key: 'lifecycle',
            render: (_, row) => {
                const programStatus = String(row.status || 'DRAFT').toUpperCase();
                const hasOnetLinks = (row.onetLinkCount ?? 0) > 0;
                const hasPublishedProfile = row.latestProfile?.reviewStatus === 'PUBLISHED';
                const stage = programStatus === 'ACTIVE' && hasPublishedProfile
                    ? 'PUBLISHED'
                    : hasOnetLinks || row.latestProfile
                        ? 'ANALYZED'
                        : 'DRAFT';
                const color = stage === 'PUBLISHED' ? 'green' : stage === 'ANALYZED' ? 'blue' : 'gold';
                return <Tag color={color} style={{ fontWeight: 600 }}>{stage}</Tag>;
            },
        },
        {
            title: 'Department',
            dataIndex: 'department',
            key: 'department',
            render: (value) => value || '-',
        },
        {
            title: 'Published Profile',
            key: 'profile',
            render: (_, row) => (
                <Space direction="vertical" size={0}>
                    <Typography.Text strong>{buildHollandCode(row?.latestProfile?.riasecScores) || '-'}</Typography.Text>
                    {row.latestProfile?.reviewStatus ? (
                        <Tag
                            color={
                                { PUBLISHED: 'green', REVIEW: 'orange', DRAFT: 'default', REJECTED: 'red' }[
                                    row.latestProfile.reviewStatus
                                ] || 'default'
                            }
                        >
                            {row.latestProfile.reviewStatus}
                        </Tag>
                    ) : (
                        <Tag color="red" style={{ fontWeight: 'bold' }}>MISSING AI PROFILE</Tag>
                    )}
                </Space>
            ),
        },
        {
            title: 'Curriculum',
            key: 'curriculum',
            render: (_, row) => (
                <Space direction="vertical" size={0}>
                    {row.curriculumCount > 0 ? (
                        <>
                            <Typography.Text strong>{row.curriculumCount} versions</Typography.Text>
                            <Typography.Text type="secondary">{row.latestCurriculum?.sourceType}</Typography.Text>
                        </>
                    ) : (
                        <Tag color="red" style={{ fontWeight: 'bold' }}>MISSING CURRICULUM</Tag>
                    )}
                </Space>
            ),
        },
        {
            title: 'Actions',
            key: 'actions',
            render: (_, row) => (
                <Space wrap>
                    <Button size="small" onClick={() => openProgramWorkspace(row.id)}>
                        Analyze
                    </Button>
                    <Button
                        size="small"
                        icon={<EditOutlined />}
                        onClick={() => {
                            programForm.resetFields();
                            setProgramModal({ open: true, mode: 'edit', record: row });
                            programForm.setFieldsValue({
                                universityId: row.university?.id ?? undefined,
                                code: row.code ?? undefined,
                                slug: row.slug ?? undefined,
                                name: row.name ?? undefined,
                                degreeLevel: row.degreeLevel ?? undefined,
                                department: row.department ?? undefined,
                                focusArea: row.focusArea ?? undefined,
                                summary: row.summary ?? undefined,
                                sourceUrl: row.sourceUrl ?? undefined,
                                durationYears: row.durationYears ?? undefined,
                                status: row.status ?? undefined,
                                featured: row.featured ?? false,
                                keyCourses: row.keyCourses ?? undefined,
                                courseSourceUrl: row.courseSourceUrl ?? undefined,
                            });
                        }}
                    >
                        Edit
                    </Button>
                    <Popconfirm
                        title="Delete this program?"
                        okText="Delete"
                        okButtonProps={{ danger: true }}
                        onConfirm={() => deleteProgramMutation.mutate(row.id)}
                    >
                        <Button size="small" danger icon={<DeleteOutlined />}>
                            Delete
                        </Button>
                    </Popconfirm>
                </Space>
            ),
        },
    ];
}

export function createQuestionColumns({
    setQuestionModal,
    questionForm,
    deleteQuestionMutation,
}) {
    return [
        {
            title: 'Question',
            dataIndex: 'prompt',
            key: 'question',
            render: (value) => (
                <Typography.Paragraph ellipsis={{ rows: 2 }} style={{ marginBottom: 0 }}>
                    {value}
                </Typography.Paragraph>
            ),
        },
        { title: 'Code', dataIndex: 'code', key: 'code' },
        { title: 'Dimension', dataIndex: 'dimension', key: 'dimension' },
        { title: 'Version', dataIndex: 'version', key: 'version' },
        { title: 'Order', dataIndex: 'order', key: 'order' },
        {
            title: 'Status',
            dataIndex: 'active',
            key: 'active',
            render: (value) => <Tag color={value ? 'green' : 'red'}>{value ? 'Active' : 'Inactive'}</Tag>,
        },
        {
            title: 'Actions',
            key: 'actions',
            render: (_, row) => (
                <Space>
                    <Button
                        size="small"
                        icon={<EditOutlined />}
                        onClick={() => {
                            questionForm.resetFields();
                            setQuestionModal({ open: true, mode: 'edit', record: row });
                            questionForm.setFieldsValue({
                                question: row.prompt ?? undefined,
                                prompt: row.prompt ?? undefined,
                                type: row.type ?? undefined,
                                category: row.category ?? undefined,
                                dimension: row.dimension ?? undefined,
                                code: row.code ?? undefined,
                                version: row.version ?? undefined,
                                options: row.options ?? undefined,
                                weight: row.weight ?? undefined,
                                order: row.order ?? undefined,
                                active: row.active ?? true,
                            });
                        }}
                    >
                        Edit
                    </Button>
                    <Popconfirm
                        title="Delete this question?"
                        okText="Delete"
                        okButtonProps={{ danger: true }}
                        onConfirm={() => deleteQuestionMutation.mutate(row.id)}
                    >
                        <Button size="small" danger icon={<DeleteOutlined />}>
                            Delete
                        </Button>
                    </Popconfirm>
                </Space>
            ),
        },
    ];
}
