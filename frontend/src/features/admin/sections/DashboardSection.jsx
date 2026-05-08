import AppstoreOutlined from '@ant-design/icons/AppstoreOutlined';
import DatabaseOutlined from '@ant-design/icons/DatabaseOutlined';
import HomeOutlined from '@ant-design/icons/HomeOutlined';
import QuestionCircleOutlined from '@ant-design/icons/QuestionCircleOutlined';
import UserOutlined from '@ant-design/icons/UserOutlined';
import { Alert, Card, Col, Row, Space, Statistic, Tag, Typography } from 'antd';
import { Doughnut, Line } from 'react-chartjs-2';
import { AdminLoadError } from '@frontend/features/admin/components/AdminLoadError';

export function DashboardSection({
    stats,
    statsError,
    programsError,
    statsLoading,
    authenticProgramCount,
    seededProgramCount,
    contentChartData,
    fitDistributionData,
    usageChartData,
    lineOptions,
    homepageData,
    homepageLoading,
    homepageError,
}) {
    return (
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
            <AdminLoadError error={statsError} />
            <AdminLoadError error={programsError} />

            <Row gutter={[16, 16]}>
                <Col xs={24} sm={12} xl={6}>
                    <Card variant="borderless" className="rounded-2xl">
                        <Statistic title="Total Users" value={stats?.totalUsers || 0} prefix={<UserOutlined />} />
                    </Card>
                </Col>
                <Col xs={24} sm={12} xl={6}>
                    <Card variant="borderless" className="rounded-2xl">
                        <Statistic title="Active Learners (30d)" value={stats?.activeUsersLast30Days || 0} prefix={<UserOutlined />} />
                    </Card>
                </Col>
                <Col xs={24} sm={12} xl={6}>
                    <Card variant="borderless" className="rounded-2xl">
                        <Statistic title="Matching Runs" value={stats?.totalMatchingRuns || 0} prefix={<AppstoreOutlined />} />
                    </Card>
                </Col>
                <Col xs={24} sm={12} xl={6}>
                    <Card variant="borderless" className="rounded-2xl">
                        <Statistic title="Assessment Attempts" value={stats?.totalAssessments || 0} prefix={<QuestionCircleOutlined />} />
                    </Card>
                </Col>
            </Row>

            {stats?.gradeDistribution?.length ? (
                <Alert
                    type="info"
                    showIcon
                    message="Assessment cohort coverage"
                    description={`Academic profiles with school context: ${stats.studentsWithAcademicContext || 0}. Grade distribution: ${stats.gradeDistribution
                        .map((item) => `Grade ${item.gradeLevel}: ${item.count}`)
                        .join(', ')}`}
                />
            ) : null}

            <Row gutter={[16, 16]}>
                <Col xs={24} xl={8}>
                    <Card title="Content Distribution" loading={statsLoading} variant="borderless" className="rounded-2xl">
                        <div className="max-w-sm mx-auto">
                            <Doughnut id="dashboard-content-dist" data={contentChartData} />
                        </div>
                    </Card>
                </Col>
                <Col xs={24} xl={8}>
                    <Card title="Matching Fit Distribution" loading={statsLoading} variant="borderless" className="rounded-2xl">
                        <div className="max-w-sm mx-auto">
                            <Doughnut id="dashboard-fit-dist" data={fitDistributionData} />
                        </div>
                    </Card>
                </Col>
                <Col xs={24} xl={8}>
                    <Card title="Matching Analytics" loading={statsLoading} variant="borderless" className="rounded-2xl">
                        <Row gutter={[12, 12]}>
                            <Col span={12}>
                                <Statistic title="Total Runs" value={stats?.totalMatchingRuns || 0} />
                            </Col>
                            <Col span={12}>
                                <Statistic title="Avg Score" value={stats?.avgMatchScore || 0} suffix="/100" />
                            </Col>
                            <Col span={12}>
                                <Statistic title="Published Profiles" value={stats?.publishedProfiles || 0} />
                            </Col>
                            <Col span={12}>
                                <Statistic
                                    title="High Fit %"
                                    value={
                                        stats?.fitDistribution
                                            ? Math.round(
                                                  ((stats.fitDistribution.HIGH_FIT || 0) /
                                                      Math.max(
                                                          1,
                                                          (stats.fitDistribution.HIGH_FIT || 0) +
                                                              (stats.fitDistribution.MEDIUM_FIT || 0) +
                                                              (stats.fitDistribution.STRETCH || 0),
                                                      )) *
                                                      100,
                                              )
                                            : 0
                                    }
                                    suffix="%"
                                />
                            </Col>
                        </Row>
                    </Card>
                </Col>
            </Row>

            <Row gutter={[16, 16]}>
                <Col xs={24}>
                    <Card title="User Registration Trend (90 days)" loading={statsLoading} variant="borderless" className="rounded-2xl">
                        <Line id="dashboard-usage-trend" data={usageChartData} options={lineOptions} />
                    </Card>
                </Col>
            </Row>

            <Card title="Platform Summary" variant="borderless" className="rounded-2xl">
                <Row gutter={[16, 16]}>
                    <Col xs={24} md={12} xl={6}>
                        <Card size="small">
                            <Statistic title="Universities" value={stats?.totalUniversities || 0} prefix={<HomeOutlined />} />
                        </Card>
                    </Col>
                    <Col xs={24} md={12} xl={6}>
                        <Card size="small">
                            <Statistic title="Programs" value={stats?.totalPrograms || 0} prefix={<DatabaseOutlined />} />
                        </Card>
                    </Col>
                    <Col xs={24} md={12} xl={6}>
                        <Card size="small">
                            <Statistic title="Questions" value={stats?.totalQuestions || 0} prefix={<QuestionCircleOutlined />} />
                        </Card>
                    </Col>
                    <Col xs={24} md={12} xl={6}>
                        <Card size="small">
                            <Statistic title="Authentic Curriculums" value={authenticProgramCount} prefix={<DatabaseOutlined />} />
                        </Card>
                    </Col>
                    <Col xs={24} md={12} xl={6}>
                        <Card size="small">
                            <Statistic title="Seeded Curriculums" value={seededProgramCount} prefix={<DatabaseOutlined />} />
                        </Card>
                    </Col>
                </Row>
            </Card>

            <Alert
                type={seededProgramCount > 0 ? 'warning' : 'success'}
                showIcon
                message={seededProgramCount > 0 ? 'Curriculum authenticity gap detected' : 'All curriculums are authentic'}
                description={
                    seededProgramCount > 0
                        ? `There are ${seededProgramCount} seeded programs and ${authenticProgramCount} authentic programs in the current catalog. Use Program Management to replace seeded entries with official curriculum-backed data.`
                        : `All ${authenticProgramCount} programs currently have authentic curriculum-backed data.`
                }
            />

            <Card title="Homepage Visibility" loading={homepageLoading} variant="borderless" className="rounded-2xl">
                <AdminLoadError error={homepageError} />

                <Row gutter={[16, 16]}>
                    <Col xs={24} md={8}>
                        <Card size="small">
                            <Statistic title="Homepage Questions" value={homepageData?.stats?.questions || 0} prefix={<QuestionCircleOutlined />} />
                        </Card>
                    </Col>
                    <Col xs={24} md={8}>
                        <Card size="small">
                            <Statistic
                                title="Featured Universities"
                                value={homepageData?.featuredUniversities?.length || 0}
                                prefix={<HomeOutlined />}
                            />
                        </Card>
                    </Col>
                    <Col xs={24} md={8}>
                        <Card size="small">
                            <Statistic
                                title="Featured Programs"
                                value={homepageData?.featuredPrograms?.length || 0}
                                prefix={<DatabaseOutlined />}
                            />
                        </Card>
                    </Col>
                </Row>

                <Alert
                    type="info"
                    showIcon
                    style={{ marginTop: 16 }}
                    message="Homepage behavior"
                    description="The public homepage now reads live database counts and shows featured universities/programs. To control homepage content, edit the Featured toggle in University Management and Program Management."
                />

                <Row gutter={[16, 16]} style={{ marginTop: 8 }}>
                    <Col xs={24} xl={10}>
                        <Card size="small" title="Universities currently visible on homepage">
                            <Space direction="vertical" size={8} style={{ width: '100%' }}>
                                {(homepageData?.featuredUniversities || []).map((item) => (
                                    <div key={item.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2">
                                        <div>
                                            <Typography.Text strong>{item.shortName || item.name}</Typography.Text>
                                            <div>
                                                <Typography.Text type="secondary">{item.city}</Typography.Text>
                                            </div>
                                        </div>
                                        <Tag color="blue">{item.programCount} programs</Tag>
                                    </div>
                                ))}
                            </Space>
                        </Card>
                    </Col>
                    <Col xs={24} xl={14}>
                        <Card size="small" title="Programs currently visible on homepage">
                            <Space direction="vertical" size={8} style={{ width: '100%' }}>
                                {(homepageData?.featuredPrograms || []).map((item) => (
                                    <div key={item.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2">
                                        <div>
                                            <Typography.Text strong>{item.name}</Typography.Text>
                                            <div>
                                                <Typography.Text type="secondary">
                                                    {[item.university?.shortName || item.university?.name, item.focusArea].filter(Boolean).join(' • ')}
                                                </Typography.Text>
                                            </div>
                                        </div>
                                        <Tag color="purple">{item.hollandCode || 'N/A'}</Tag>
                                    </div>
                                ))}
                            </Space>
                        </Card>
                    </Col>
                </Row>
            </Card>
        </Space>
    );
}
