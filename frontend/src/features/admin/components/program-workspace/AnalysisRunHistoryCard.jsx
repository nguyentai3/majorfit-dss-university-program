import AimOutlined from '@ant-design/icons/AimOutlined';
import HistoryOutlined from '@ant-design/icons/HistoryOutlined';
import WarningOutlined from '@ant-design/icons/WarningOutlined';
import { useMemo, useState } from 'react';
import { Button, Card, Popconfirm, Space, Switch, Tag, Tooltip, Typography } from 'antd';

const RIASEC_COLORS = { R: '#e74c3c', I: '#3498db', A: '#9b59b6', S: '#2ecc71', E: '#f39c12', C: '#1abc9c' };

function summarizeError(message = '') {
    const cleaned = String(message || '').replace(/\s+/g, ' ').trim();
    if (!cleaned) return '';
    if (cleaned.includes('429') || cleaned.toLowerCase().includes('quota')) {
        return 'AI quota/rate limit error. This failed run can be safely cleared.';
    }
    if (cleaned.toLowerCase().includes('fetch failed')) {
        return 'Network/provider fetch failed. This failed run can be safely cleared.';
    }
    return cleaned.length > 260 ? `${cleaned.slice(0, 260)}...` : cleaned;
}

export function AnalysisRunHistoryCard({
    analysisRuns,
    onClearFailed,
    clearFailedLoading = false,
}) {
    const [showFailed, setShowFailed] = useState(false);
    const runs = useMemo(() => analysisRuns || [], [analysisRuns]);
    const failedRuns = runs.filter((run) => run.status === 'FAILED');
    const visibleRuns = showFailed ? runs : runs.filter((run) => run.status !== 'FAILED');

    return (
        <Card
            size="small"
            title={<span><HistoryOutlined className="mr-1" />Analysis Run History</span>}
            extra={
                <Space wrap>
                    <Tag color={failedRuns.length ? 'red' : 'green'}>{failedRuns.length} failed hidden</Tag>
                    <Space size={6}>
                        <Typography.Text type="secondary">Show failed</Typography.Text>
                        <Switch size="small" checked={showFailed} onChange={setShowFailed} />
                    </Space>
                    {onClearFailed ? (
                        <Popconfirm
                            title="Clear failed analysis runs?"
                            description="Only FAILED runs without generated profiles will be deleted."
                            okText="Clear"
                            okButtonProps={{ danger: true }}
                            onConfirm={onClearFailed}
                        >
                            <Button size="small" danger disabled={!failedRuns.length} loading={clearFailedLoading}>
                                Clear failed
                            </Button>
                        </Popconfirm>
                    ) : null}
                </Space>
            }
        >
            <Space direction="vertical" size={12} style={{ width: '100%' }}>
                {visibleRuns.length ? (
                    visibleRuns.map((run) => {
                        const isEstimate = run.promptVersion?.startsWith('estimate-riasec');
                        const est = isEstimate ? run.parsedResult : null;
                        return (
                        <div key={run.id} className="rounded-lg border border-slate-200 px-4 py-3" style={isEstimate ? { borderColor: '#d3adf7', background: '#faf5ff' } : undefined}>
                            <div className="flex flex-wrap items-center gap-2">
                                <Tag color={run.status === 'FAILED' ? 'red' : run.status === 'PROFILE_PUBLISHED' ? 'green' : 'blue'}>
                                    {run.status}
                                </Tag>
                                {isEstimate && <Tag color="purple" icon={<AimOutlined />}>Tầng 2</Tag>}
                                <Tag>{run.mode}</Tag>
                                <Tag>{run.provider || 'manual-ai'}</Tag>
                                {run.model ? <Tag>{run.model}</Tag> : null}
                                {run.promptVersion ? <Tag>{run.promptVersion}</Tag> : null}
                            </div>
                            <Typography.Text type="secondary">{new Date(run.createdAt).toLocaleString()}</Typography.Text>

                            {est?.riasecScores && (
                                <div className="mt-2 flex gap-2 flex-wrap items-center">
                                    <div style={{ display: 'flex', gap: 3 }}>
                                        {['R', 'I', 'A', 'S', 'E', 'C'].map(d => (
                                            <Tooltip key={d} title={`${d}: ${est.riasecScores[d] || 0}`}>
                                                <div style={{
                                                    width: 26, textAlign: 'center', fontSize: 10, borderRadius: 3,
                                                    background: `${RIASEC_COLORS[d]}20`, color: RIASEC_COLORS[d], fontWeight: 600,
                                                }}>
                                                    {est.riasecScores[d] || 0}
                                                </div>
                                            </Tooltip>
                                        ))}
                                    </div>
                                    {est.hollandCode && <Tag color="purple">{est.hollandCode}</Tag>}
                                    <Tag color={est.confidenceLevel === 'high' ? 'green' : est.confidenceLevel === 'medium' ? 'orange' : 'red'}>
                                        Confidence: {est.confidence}% ({est.confidenceLevel?.toUpperCase()})
                                    </Tag>
                                    {est.anchorPrograms?.length > 0 && (
                                        <Tag>{est.anchorPrograms.length} anchors</Tag>
                                    )}
                                    {est.needsReview && <Tag color="orange" icon={<WarningOutlined />}>Needs Review</Tag>}
                                </div>
                            )}

                            {run.parsedResult?.verification_report ? (
                                <div className="mt-2 flex gap-2 flex-wrap">
                                    <Tag color={run.parsedResult.verification_report.adjusted_confidence >= 60 ? 'green' : 'red'}>
                                        Confidence: {run.parsedResult.verification_report.adjusted_confidence}
                                    </Tag>
                                    <Tag color={run.parsedResult.verification_report.evidence_verification_rate >= 0.5 ? 'green' : 'orange'}>
                                        Evidence Rate: {(run.parsedResult.verification_report.evidence_verification_rate * 100).toFixed(0)}%
                                    </Tag>
                                    {(run.parsedResult.verification_report.score_sanity_warnings || []).length > 0 ? (
                                        <Tag color="orange" icon={<WarningOutlined />}>
                                            {run.parsedResult.verification_report.score_sanity_warnings.length} warning(s)
                                        </Tag>
                                    ) : null}
                                    {(run.parsedResult?.clamp_warnings || []).length > 0 ? (
                                        <Tag color="red" icon={<WarningOutlined />}>
                                            {run.parsedResult.clamp_warnings.length} score(s) clamped
                                        </Tag>
                                    ) : null}
                                </div>
                            ) : null}
                            {run.reviewNotes ? (
                                <Typography.Paragraph style={{ marginTop: 8, marginBottom: 0 }}>
                                    {run.reviewNotes}
                                </Typography.Paragraph>
                            ) : null}
                            {run.errorMessage ? (
                                <Typography.Paragraph type="danger" style={{ marginTop: 8, marginBottom: 0 }}>
                                    {summarizeError(run.errorMessage)}
                                </Typography.Paragraph>
                            ) : null}
                        </div>
                    );})
                ) : failedRuns.length ? (
                    <Typography.Text type="secondary">
                        Failed runs are hidden. Enable "Show failed" only when you need to inspect provider errors.
                    </Typography.Text>
                ) : (
                    <Typography.Text type="secondary">No analysis runs yet.</Typography.Text>
                )}
            </Space>
        </Card>
    );
}
