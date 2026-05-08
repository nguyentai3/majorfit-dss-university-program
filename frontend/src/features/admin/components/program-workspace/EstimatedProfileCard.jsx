import AimOutlined from '@ant-design/icons/AimOutlined';
import CheckCircleOutlined from '@ant-design/icons/CheckCircleOutlined';
import CloseCircleOutlined from '@ant-design/icons/CloseCircleOutlined';
import ExperimentOutlined from '@ant-design/icons/ExperimentOutlined';
import InfoCircleOutlined from '@ant-design/icons/InfoCircleOutlined';
import SaveOutlined from '@ant-design/icons/SaveOutlined';
import SendOutlined from '@ant-design/icons/SendOutlined';
import WarningOutlined from '@ant-design/icons/WarningOutlined';
import { Alert, Button, Card, Col, Collapse, Descriptions, Divider, message, Popconfirm, Progress, Row, Space, Statistic, Table, Tag, Tooltip, Typography } from 'antd';
import { useState } from 'react';
import { acceptEstimateAsProfile } from '../../../../api/services/admin';

const RIASEC_COLORS = { R: '#e74c3c', I: '#3498db', A: '#9b59b6', S: '#2ecc71', E: '#f39c12', C: '#1abc9c' };
const RIASEC_LABELS = { R: 'Realistic', I: 'Investigative', A: 'Artistic', S: 'Social', E: 'Enterprising', C: 'Conventional' };

const CONFIDENCE_CONFIG = {
    high: { color: '#52c41a', tag: 'green', label: 'HIGH', icon: <CheckCircleOutlined /> },
    medium: { color: '#faad14', tag: 'orange', label: 'MEDIUM', icon: <WarningOutlined /> },
    low: { color: '#ff4d4f', tag: 'red', label: 'LOW', icon: <CloseCircleOutlined /> },
};

export function EstimatedProfileCard({ estimateResult, programId, onAccepted }) {
    const [accepting, setAccepting] = useState(false);

    if (!estimateResult) return null;

    const {
        riasecScores,
        hollandCode,
        confidence,
        confidenceLevel,
        needsReview,
        reasoning,
        mostSimilarAnchor,
        keyDifferences,
        anchorPrograms,
        validation,
        provider,
        model,
        source,
    } = estimateResult;

    const confConfig = CONFIDENCE_CONFIG[confidenceLevel] || CONFIDENCE_CONFIG.medium;

    const handleAccept = async (publishImmediately) => {
        if (!programId) {
            message.error('Program ID is missing.');
            return;
        }
        setAccepting(true);
        try {
            await acceptEstimateAsProfile(programId, {
                riasecScores,
                hollandCode,
                confidence,
                reasoning: reasoning ? JSON.stringify(reasoning) : null,
                provider,
                model,
                publishImmediately,
            });
            message.success(publishImmediately ? 'Profile created and published!' : 'Profile saved as draft.');
            onAccepted?.();
        } catch (err) {
            message.error(err?.response?.data?.error || err.message || 'Failed to save profile.');
        } finally {
            setAccepting(false);
        }
    };

    const sortedRiasec = Object.entries(riasecScores || {})
        .sort((a, b) => b[1] - a[1]);

    return (
        <Card
            size="small"
            title={
                <Space>
                    <AimOutlined style={{ color: '#722ed1' }} />
                    <span>Tầng 2: AI-Estimated RIASEC Profile</span>
                    <Tag color="purple">ANCHOR_BASED</Tag>
                    {provider && model && <Tag>{provider}/{model}</Tag>}
                </Space>
            }
            style={{ borderColor: '#d3adf7' }}
        >
            {needsReview && (
                <Alert
                    type="warning"
                    showIcon
                    icon={<WarningOutlined />}
                    message="Admin Review Required"
                    description="This profile was estimated by AI using similar programs as anchors. Please review before publishing."
                    style={{ marginBottom: 16 }}
                />
            )}

            <Row gutter={[16, 16]} align="middle">
                <Col xs={24} md={14}>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {sortedRiasec.map(([dim, score]) => (
                            <Tooltip key={dim} title={`${RIASEC_LABELS[dim]}: ${score}`}>
                                <div style={{
                                    textAlign: 'center',
                                    padding: '8px 12px',
                                    borderRadius: 8,
                                    border: `2px solid ${RIASEC_COLORS[dim]}`,
                                    background: `${RIASEC_COLORS[dim]}10`,
                                    minWidth: 60,
                                }}>
                                    <div style={{ fontSize: 11, fontWeight: 600, color: RIASEC_COLORS[dim] }}>{dim}</div>
                                    <div style={{ fontSize: 20, fontWeight: 700 }}>{score}</div>
                                </div>
                            </Tooltip>
                        ))}
                    </div>
                </Col>
                <Col xs={12} md={5}>
                    <Statistic
                        title="Holland Code"
                        value={hollandCode || sortedRiasec.slice(0, 3).map(([d]) => d).join('')}
                        valueStyle={{ fontSize: 22, fontWeight: 'bold', color: '#722ed1' }}
                    />
                </Col>
                <Col xs={12} md={5}>
                    <div style={{ textAlign: 'center' }}>
                        <div className="text-xs text-slate-500 mb-1">Confidence</div>
                        <Progress
                            type="circle"
                            size={64}
                            percent={confidence}
                            strokeColor={confConfig.color}
                            format={() => (
                                <span style={{ fontSize: 14, fontWeight: 600 }}>{confidence}%</span>
                            )}
                        />
                        <div style={{ marginTop: 4 }}>
                            <Tag color={confConfig.tag} icon={confConfig.icon}>{confConfig.label}</Tag>
                        </div>
                    </div>
                </Col>
            </Row>

            {anchorPrograms?.length > 0 && (
                <div style={{ marginTop: 16 }}>
                    <Collapse
                        size="small"
                        defaultActiveKey={['anchors']}
                        items={[{
                            key: 'anchors',
                            label: (
                                <span>
                                    <InfoCircleOutlined className="mr-1" />
                                    {`Reference Anchor Programs (${anchorPrograms.length})`}
                                    {mostSimilarAnchor && (
                                        <Tag color="blue" className="ml-2">Most similar: {mostSimilarAnchor}</Tag>
                                    )}
                                </span>
                            ),
                            children: (
                                <Table
                                    dataSource={anchorPrograms}
                                    rowKey="code"
                                    size="small"
                                    pagination={false}
                                    columns={[
                                        {
                                            title: 'Program',
                                            dataIndex: 'name',
                                            ellipsis: true,
                                            render: (name, record) => (
                                                <div>
                                                    <div style={{ fontWeight: 500 }}>{name}</div>
                                                    <div style={{ fontSize: 11, color: '#888' }}>{record.code}</div>
                                                </div>
                                            ),
                                        },
                                        {
                                            title: 'Similarity',
                                            dataIndex: 'similarity',
                                            width: 100,
                                            render: (val) => (
                                                <Progress
                                                    percent={Math.round((val || 0) * 100)}
                                                    size="small"
                                                    strokeColor={val >= 0.6 ? '#52c41a' : val >= 0.4 ? '#faad14' : '#ff4d4f'}
                                                />
                                            ),
                                        },
                                        {
                                            title: 'RIASEC',
                                            dataIndex: 'riasecScores',
                                            width: 180,
                                            render: (scores) => scores ? (
                                                <div style={{ display: 'flex', gap: 2 }}>
                                                    {['R', 'I', 'A', 'S', 'E', 'C'].map(d => (
                                                        <Tooltip key={d} title={`${RIASEC_LABELS[d]}: ${scores[d] || 0}`}>
                                                            <div style={{
                                                                width: 24,
                                                                textAlign: 'center',
                                                                fontSize: 10,
                                                                borderRadius: 3,
                                                                background: `${RIASEC_COLORS[d]}20`,
                                                                color: RIASEC_COLORS[d],
                                                                fontWeight: 600,
                                                            }}>
                                                                {scores[d] || 0}
                                                            </div>
                                                        </Tooltip>
                                                    ))}
                                                </div>
                                            ) : '-',
                                        },
                                        {
                                            title: 'Holland',
                                            dataIndex: 'hollandCode',
                                            width: 70,
                                            render: (code) => code ? <Tag color="purple">{code}</Tag> : '-',
                                        },
                                    ]}
                                />
                            ),
                        }]}
                    />
                </div>
            )}

            {validation && (
                <div style={{ marginTop: 16 }}>
                    <Collapse
                        size="small"
                        items={[
                            validation.anchorBounds && {
                                key: 'anchor-bounds',
                                label: (
                                    <span>
                                        {validation.anchorBounds.withinBounds
                                            ? <CheckCircleOutlined style={{ color: '#52c41a' }} className="mr-1" />
                                            : <WarningOutlined style={{ color: '#faad14' }} className="mr-1" />
                                        }
                                        Anchor Bounds Validation
                                        {validation.anchorBounds.withinBounds
                                            ? <Tag color="green" className="ml-2">All Within Bounds</Tag>
                                            : <Tag color="orange" className="ml-2">
                                                {validation.anchorBounds.flaggedDimensions?.length || 0} flagged
                                            </Tag>
                                        }
                                    </span>
                                ),
                                children: validation.anchorBounds.details ? (
                                    <div className="grid grid-cols-3 md:grid-cols-6 gap-3 text-center">
                                        {Object.entries(validation.anchorBounds.details).map(([dim, info]) => (
                                            <div
                                                key={dim}
                                                style={{
                                                    padding: 8,
                                                    borderRadius: 6,
                                                    border: `1px solid ${info.status === 'OK' ? '#b7eb8f' : '#ffd591'}`,
                                                    background: info.status === 'OK' ? '#f6ffed' : '#fff7e6',
                                                }}
                                            >
                                                <div style={{ fontWeight: 600, color: RIASEC_COLORS[dim] }}>{dim}</div>
                                                <div style={{ fontSize: 16, fontWeight: 700 }}>{info.estimate}</div>
                                                <div style={{ fontSize: 10, color: '#888' }}>
                                                    Range: [{info.range?.[0]}, {info.range?.[1]}]
                                                </div>
                                                <Tag
                                                    color={info.status === 'OK' ? 'green' : 'orange'}
                                                    style={{ fontSize: 10, marginTop: 4 }}
                                                >
                                                    {info.status}
                                                </Tag>
                                            </div>
                                        ))}
                                    </div>
                                ) : <Typography.Text type="secondary">No details available</Typography.Text>,
                            },
                            validation.consistency && {
                                key: 'consistency',
                                label: (
                                    <span>
                                        <ExperimentOutlined className="mr-1" />
                                        Consistency Check (2-run)
                                        <Tag
                                            color={
                                                validation.consistency.consistency === 'very_consistent' ? 'green'
                                                    : validation.consistency.consistency === 'consistent' ? 'blue'
                                                    : validation.consistency.consistency === 'moderate' ? 'orange'
                                                    : 'red'
                                            }
                                            className="ml-2"
                                        >
                                            {validation.consistency.consistency}
                                        </Tag>
                                    </span>
                                ),
                                children: (
                                    <Descriptions column={2} size="small" bordered>
                                        <Descriptions.Item label="Max Deviation">
                                            {validation.consistency.maxDeviation ?? validation.consistency.maxDifference ?? '-'}
                                        </Descriptions.Item>
                                        <Descriptions.Item label="Confidence Adjust">
                                            <span style={{
                                                color: (validation.consistency.confidenceAdjust || 0) >= 0 ? '#52c41a' : '#ff4d4f',
                                                fontWeight: 600,
                                            }}>
                                                {(validation.consistency.confidenceAdjust || 0) >= 0 ? '+' : ''}
                                                {validation.consistency.confidenceAdjust || 0}
                                            </span>
                                        </Descriptions.Item>
                                    </Descriptions>
                                ),
                            },
                        ].filter(Boolean)}
                    />
                </div>
            )}

            {reasoning && typeof reasoning === 'object' && (
                <div style={{ marginTop: 16 }}>
                    <Collapse
                        size="small"
                        items={[{
                            key: 'reasoning',
                            label: (
                                <span>
                                    <InfoCircleOutlined className="mr-1" />
                                    AI Reasoning (per dimension)
                                </span>
                            ),
                            children: (
                                <div className="space-y-2">
                                    {Object.entries(reasoning).map(([dim, text]) => (
                                        <div key={dim} style={{
                                            padding: '8px 12px',
                                            borderRadius: 6,
                                            borderLeft: `3px solid ${RIASEC_COLORS[dim.toUpperCase()] || '#ccc'}`,
                                            background: '#fafafa',
                                        }}>
                                            <span style={{
                                                fontWeight: 600,
                                                color: RIASEC_COLORS[dim.toUpperCase()] || '#333',
                                                marginRight: 8,
                                            }}>
                                                {dim.toUpperCase()} ({RIASEC_LABELS[dim.toUpperCase()] || dim}):
                                            </span>
                                            <span className="text-sm text-slate-700">{text}</span>
                                        </div>
                                    ))}
                                </div>
                            ),
                        }]}
                    />
                </div>
            )}

            {keyDifferences?.length > 0 && (
                <div style={{ marginTop: 16 }}>
                    <Alert
                        type="info"
                        showIcon
                        icon={<InfoCircleOutlined />}
                        message="Key Differences from Anchor Programs"
                        description={
                            <ul style={{ marginBottom: 0, paddingLeft: 20 }}>
                                {keyDifferences.map((diff, i) => (
                                    <li key={i} className="text-sm">{diff}</li>
                                ))}
                            </ul>
                        }
                    />
                </div>
            )}
            {programId && (
                <div style={{ marginTop: 16 }}>
                    <Divider style={{ margin: '12px 0' }} />
                    <Space>
                        <Popconfirm
                            title="Accept as Draft"
                            description="Save this estimate as a draft profile. It will NOT be visible to students until published."
                            onConfirm={() => handleAccept(false)}
                            okText="Save as Draft"
                            cancelText="Cancel"
                        >
                            <Button
                                icon={<SaveOutlined />}
                                loading={accepting}
                            >
                                Accept as Draft
                            </Button>
                        </Popconfirm>
                        <Popconfirm
                            title="Accept & Publish"
                            description="Save and immediately publish this profile. Students will see it right away."
                            onConfirm={() => handleAccept(true)}
                            okText="Publish Now"
                            cancelText="Cancel"
                            okButtonProps={{ danger: false }}
                        >
                            <Button
                                type="primary"
                                icon={<SendOutlined />}
                                loading={accepting}
                                style={{ background: '#52c41a', borderColor: '#52c41a' }}
                            >
                                Accept &amp; Publish
                            </Button>
                        </Popconfirm>
                    </Space>
                </div>
            )}
        </Card>
    );
}
