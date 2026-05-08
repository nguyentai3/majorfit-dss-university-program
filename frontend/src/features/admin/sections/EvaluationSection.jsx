import BarChartOutlined from '@ant-design/icons/BarChartOutlined';
import { Alert, Card, Col, Row, Space, Statistic } from 'antd';
import { Doughnut } from 'react-chartjs-2';
import { AdminLoadError } from '@frontend/features/admin/components/AdminLoadError';

export function EvaluationSection({
    error,
    feedbackStats,
    feedbackLoading,
}) {
    const feedbackChartData = feedbackStats?.distribution
        ? {
              labels: ['1 ★', '2 ★', '3 ★', '4 ★', '5 ★'],
              datasets: [
                  {
                      data: [
                          feedbackStats.distribution[1] || 0,
                          feedbackStats.distribution[2] || 0,
                          feedbackStats.distribution[3] || 0,
                          feedbackStats.distribution[4] || 0,
                          feedbackStats.distribution[5] || 0,
                      ],
                      backgroundColor: ['#ef4444', '#f97316', '#eab308', '#22c55e', '#10b981'],
                      borderWidth: 0,
                  },
              ],
          }
        : null;

    return (
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
            <AdminLoadError error={error} />

            <Card
                title="User Feedback Summary"
                loading={feedbackLoading}
                variant="borderless"
                className="rounded-2xl"
            >
                {feedbackStats && feedbackStats.totalFeedbacks > 0 ? (
                    <Row gutter={[16, 16]}>
                        <Col xs={24} sm={12} xl={6}>
                            <Card variant="borderless" className="rounded-2xl bg-slate-50">
                                <Statistic title="Total Feedbacks" value={feedbackStats.totalFeedbacks} prefix={<BarChartOutlined />} />
                            </Card>
                        </Col>
                        <Col xs={24} sm={12} xl={6}>
                            <Card variant="borderless" className="rounded-2xl bg-slate-50">
                                <Statistic title="Average Rating" value={feedbackStats.averageRating ?? 0} precision={2} suffix="/ 5" />
                            </Card>
                        </Col>
                        <Col xs={24} sm={12} xl={6}>
                            <Card variant="borderless" className="rounded-2xl bg-slate-50">
                                <Statistic title="User-Perceived Precision" value={feedbackStats.userPerceivedPrecision || '0%'} />
                            </Card>
                        </Col>
                        <Col xs={24} sm={12} xl={6}>
                            <Card variant="borderless" className="rounded-2xl bg-slate-50">
                                <Statistic
                                    title="Relevance Rate"
                                    value={feedbackStats.relevanceRate != null ? Math.round(feedbackStats.relevanceRate * 100) : 0}
                                    suffix="%"
                                />
                            </Card>
                        </Col>
                        <Col xs={24} xl={12}>
                            <Card title="Rating Distribution" size="small" variant="borderless" className="rounded-2xl">
                                <div className="max-w-sm mx-auto">
                                    {feedbackChartData ? <Doughnut id="eval-feedback-dist" data={feedbackChartData} /> : null}
                                </div>
                            </Card>
                        </Col>
                    </Row>
                ) : (
                    <Alert
                        type="info"
                        showIcon
                        message="No feedback data yet"
                        description="User feedback will appear here once users submit ratings on their matching results."
                    />
                )}
            </Card>
        </Space>
    );
}
