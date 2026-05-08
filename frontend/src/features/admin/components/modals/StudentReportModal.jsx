import { Card, Col, Modal, Row, Space, Statistic, Table, Typography } from 'antd';
import { formatAssessmentContext } from '@frontend/features/admin/utils/formatters';

export function StudentReportModal({
    studentReportModal,
    setStudentReportModal,
}) {
    return (
        <Modal
            open={studentReportModal.open}
            title="Student Assessment Report"
            footer={null}
            onCancel={() => setStudentReportModal({ open: false, loading: false, report: null })}
            width={960}
        >
            {studentReportModal.loading ? (
                <Typography.Paragraph>Loading report...</Typography.Paragraph>
            ) : studentReportModal.report ? (
                <Space direction="vertical" size={16} style={{ width: '100%' }}>
                    <Card size="small">
                        <Row gutter={[16, 16]}>
                            <Col xs={24} md={12}>
                                <Typography.Text strong>{studentReportModal.report.user.email}</Typography.Text>
                                <div>
                                    {[studentReportModal.report.user.firstName, studentReportModal.report.user.lastName]
                                        .filter(Boolean)
                                        .join(' ') || 'No student name'}
                                </div>
                            </Col>
                            <Col xs={24} md={12}>
                                <div>{studentReportModal.report.academicProfile?.schoolName || 'No school name'}</div>
                                <div>
                                    {[
                                        studentReportModal.report.academicProfile?.classCode,
                                        studentReportModal.report.academicProfile?.academicYear,
                                        studentReportModal.report.academicProfile?.currentSemester,
                                    ]
                                        .filter(Boolean)
                                        .join(' • ') || 'No academic context'}
                                </div>
                            </Col>
                        </Row>
                    </Card>

                    <Row gutter={[16, 16]}>
                        <Col xs={24} md={8}>
                            <Card size="small">
                                <Statistic title="Latest Holland Code" value={studentReportModal.report.riasecProfile?.latestHollandCode || '-'} />
                            </Card>
                        </Col>
                        <Col xs={24} md={8}>
                            <Card size="small">
                                <Statistic title="Total Attempts" value={studentReportModal.report.riasecProfile?.totalAttempts || 0} />
                            </Card>
                        </Col>
                        <Col xs={24} md={8}>
                            <Card size="small">
                                <Statistic
                                    title="Confidence Score"
                                    value={
                                        typeof studentReportModal.report.riasecProfile?.confidenceScore === 'number'
                                            ? `${studentReportModal.report.riasecProfile.confidenceScore}/100`
                                            : '-'
                                    }
                                />
                            </Card>
                        </Col>
                    </Row>

                    <Card size="small" title="Recent Attempts">
                        <Table
                            rowKey="id"
                            size="small"
                            pagination={false}
                            dataSource={studentReportModal.report.attempts || []}
                            columns={[
                                {
                                    title: 'Submitted',
                                    dataIndex: 'submittedAt',
                                    key: 'submittedAt',
                                    render: (value) => new Date(value).toLocaleString(),
                                },
                                {
                                    title: 'Context',
                                    key: 'context',
                                    render: (_, row) => formatAssessmentContext(row) || '-',
                                },
                                {
                                    title: 'Holland',
                                    dataIndex: 'hollandCode',
                                    key: 'hollandCode',
                                },
                                {
                                    title: 'Duration',
                                    dataIndex: 'durationSeconds',
                                    key: 'durationSeconds',
                                    render: (value) => (value ? `${value}s` : '-'),
                                },
                            ]}
                        />
                    </Card>
                </Space>
            ) : (
                <Typography.Paragraph>No report data available.</Typography.Paragraph>
            )}
        </Modal>
    );
}
