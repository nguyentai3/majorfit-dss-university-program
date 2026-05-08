import CheckCircleOutlined from '@ant-design/icons/CheckCircleOutlined';
import CloseCircleOutlined from '@ant-design/icons/CloseCircleOutlined';
import CodeOutlined from '@ant-design/icons/CodeOutlined';
import DatabaseOutlined from '@ant-design/icons/DatabaseOutlined';
import EditOutlined from '@ant-design/icons/EditOutlined';
import EyeOutlined from '@ant-design/icons/EyeOutlined';
import SafetyCertificateOutlined from '@ant-design/icons/SafetyCertificateOutlined';
import WarningOutlined from '@ant-design/icons/WarningOutlined';
import {
    Alert,
    Button,
    Card,
    Col,
    Collapse,
    Divider,
    Form,
    InputNumber,
    Popconfirm,
    Row,
    Select,
    Space,
    Spin,
    Statistic,
    Tag,
    Tooltip as AntTooltip,
    Typography,
} from 'antd';

export function ProgramProfileReviewCard({
    profiles,
    analysisRuns,
    selectedProfileIndex,
    programWorkspace,
    setProgramWorkspace,
    updateProfileMutation,
    expertReviewsQuery,
}) {
    const selectedIdx = Math.min(Math.max(Number(selectedProfileIndex) || 0, 0), profiles.length - 1);
    const profile = profiles[selectedIdx] || profiles[0];

    if (!profile) {
        return null;
    }

    const matchingRun = (analysisRuns || []).find(
        (run) =>
            run.parsedResult &&
            new Date(run.createdAt).getTime() <= new Date(profile.createdAt).getTime() + 5000 &&
            new Date(run.createdAt).getTime() >= new Date(profile.createdAt).getTime() - 60000,
    );
    const verificationReport = matchingRun?.parsedResult?.verification_report || null;
    const clampWarnings = matchingRun?.parsedResult?.clamp_warnings || [];
    const onetCrossValidation = matchingRun?.parsedResult?.onet_cross_validation || null;
    const reviewStatusColor = {
        PUBLISHED: 'green',
        REVIEW: 'orange',
        DRAFT: 'default',
        REJECTED: 'red',
    };
    const isOnetDerivedProfile =
        profile.sourceType === 'ONET_DERIVED' ||
        profile.modelName === 'deterministic' ||
        String(profile.promptVersion || '').startsWith('onet-');
    const isArchivedProfile =
        profile.reviewStatus === 'REJECTED' ||
        (profile.reviewStatus === 'PUBLISHED' && profile.isPublished === false);
    const sourceLabel = isOnetDerivedProfile ? 'O*NET-derived deterministic profile' : 'AI/manual stored profile';
    const profileTitle = isArchivedProfile
        ? 'Archived Stored Profile'
        : profile.isPublished
            ? 'Published Program Profile'
            : 'Stored Program Profile';
    const hasRawAiResponse = Boolean(!isOnetDerivedProfile && matchingRun?.aiResponseText);
    const getProfileOptionLabel = (item, index) => {
        const isOnet = item.sourceType === 'ONET_DERIVED' || item.modelName === 'deterministic' || String(item.promptVersion || '').startsWith('onet-');
        const itemIsArchived = item.reviewStatus === 'REJECTED' || (item.reviewStatus === 'PUBLISHED' && item.isPublished === false);
        const state = itemIsArchived ? 'Archived' : item.isPublished ? 'Current published' : item.reviewStatus || 'Stored';
        const source = isOnet ? 'O*NET deterministic' : item.sourceType || item.promptVersion || 'AI/manual';
        return `${state} — ${source} — ${new Date(item.createdAt).toLocaleDateString()}`;
    };

    return (
        <Card
            size="small"
            title={
                <div className="flex items-center justify-between flex-wrap gap-2">
                    <span>
                        <SafetyCertificateOutlined className="mr-2" />
                        {profileTitle}
                    </span>
                    <Space size={8} wrap>
                        {profiles.length > 1 && (
                            <Select
                                size="small"
                                style={{ width: 260 }}
                                value={selectedIdx}
                                onChange={(idx) =>
                                    setProgramWorkspace((current) => ({
                                        ...current,
                                        selectedProfileIndex: idx,
                                        editingScores: false,
                                    }))
                                }
                                options={profiles.map((item, index) => ({
                                    value: index,
                                    label: getProfileOptionLabel(item, index),
                                }))}
                            />
                        )}
                        <Tag color={isOnetDerivedProfile ? 'cyan' : 'purple'}>
                            {isOnetDerivedProfile ? 'O*NET DETERMINISTIC' : profile.sourceType || 'PROFILE'}
                        </Tag>
                        {isArchivedProfile ? <Tag color="default">ARCHIVED</Tag> : null}
                        <Tag color={reviewStatusColor[profile.reviewStatus] || 'default'}>{profile.reviewStatus}</Tag>
                        {profile.isPublished && profile.reviewStatus !== 'PUBLISHED' ? <Tag color="green">PUBLISHED</Tag> : null}
                    </Space>
                </div>
            }
        >
            <Alert
                className="mb-4"
                type={isOnetDerivedProfile ? 'info' : 'warning'}
                showIcon
                message={sourceLabel}
                description={
                    isOnetDerivedProfile
                        ? 'This profile is calculated from linked O*NET occupations and relevance weights. Update O*NET Career Links above when you want the deterministic profile to change.'
                        : 'This stored profile was generated or edited separately. Review it before publishing.'
                }
            />

            <div className="mb-4 flex flex-wrap gap-2 items-center">
                {profile.reviewStatus !== 'PUBLISHED' && (
                    <Popconfirm
                        title="Approve & Publish this profile?"
                        description="This will publish this profile and unpublish any other published version."
                        onConfirm={() =>
                            updateProfileMutation.mutate({
                                profileId: profile.id,
                                payload: { reviewStatus: 'PUBLISHED', isPublished: true },
                            })
                        }
                    >
                        <Button type="primary" size="small" icon={<CheckCircleOutlined />} loading={updateProfileMutation.isPending}>
                            Approve & Publish
                        </Button>
                    </Popconfirm>
                )}
                {profile.reviewStatus !== 'REJECTED' && (
                    <Popconfirm
                        title="Reject this profile?"
                        description="The profile will be marked as REJECTED and unpublished."
                        onConfirm={() =>
                            updateProfileMutation.mutate({
                                profileId: profile.id,
                                payload: { reviewStatus: 'REJECTED', isPublished: false },
                            })
                        }
                    >
                        <Button danger size="small" icon={<CloseCircleOutlined />} loading={updateProfileMutation.isPending}>
                            Reject
                        </Button>
                    </Popconfirm>
                )}
                {profile.reviewStatus === 'PUBLISHED' && !profile.isPublished && (
                    <Popconfirm
                        title="Publish this profile version?"
                        onConfirm={() =>
                            updateProfileMutation.mutate({
                                profileId: profile.id,
                                payload: { isPublished: true },
                            })
                        }
                    >
                        <Button size="small" icon={<CheckCircleOutlined />}>
                            Publish
                        </Button>
                    </Popconfirm>
                )}
                {profile.isPublished && (
                    <Popconfirm
                        title="Unpublish this profile?"
                        onConfirm={() =>
                            updateProfileMutation.mutate({
                                profileId: profile.id,
                                payload: { isPublished: false },
                            })
                        }
                    >
                        <Button size="small">Unpublish</Button>
                    </Popconfirm>
                )}
                <Button
                    size="small"
                    icon={<EditOutlined />}
                    onClick={() =>
                        setProgramWorkspace((current) => ({
                            ...current,
                            editingScores: !current.editingScores,
                        }))
                    }
                >
                    {programWorkspace.editingScores ? 'Cancel Edit' : 'Edit Scores'}
                </Button>
                {hasRawAiResponse ? (
                    <Button
                        size="small"
                        icon={<CodeOutlined />}
                        onClick={() =>
                            setProgramWorkspace((current) => ({
                                ...current,
                                showRawResponse: !current.showRawResponse,
                            }))
                        }
                    >
                        {programWorkspace.showRawResponse ? 'Hide Raw' : 'Raw AI Response'}
                    </Button>
                ) : null}
            </div>

            <Row gutter={[16, 16]}>
                <Col xs={12} md={6}>
                    <Statistic
                        title="RIASEC Code"
                        value={Object.entries(profile.riasecScores || {})
                            .sort((a, b) => b[1] - a[1])
                            .slice(0, 3)
                            .map(([dimension]) => dimension)
                            .join('') || '-'}
                    />
                </Col>
                <Col xs={12} md={6}>
                    <Statistic title="Confidence" value={profile.confidenceScore || 0} suffix="/100" />
                </Col>
                <Col xs={12} md={6}>
                    <Statistic title="Evidence Items" value={profile.evidenceMap?.length || 0} />
                </Col>
                <Col xs={12} md={6}>
                    <div className="text-slate-500 text-xs">Created</div>
                    <div className="font-medium text-sm">{new Date(profile.createdAt).toLocaleString()}</div>
                    <div className="text-slate-500 text-xs mt-1">
                        {profile.promptVersion || '-'} / {profile.modelName || '-'}
                    </div>
                </Col>
            </Row>

            {verificationReport && (
                <div className="mt-4">
                    <Alert
                        type={verificationReport.score_sanity_warnings?.length > 0 ? 'warning' : 'success'}
                        showIcon
                        icon={
                            verificationReport.score_sanity_warnings?.length > 0 ? (
                                <WarningOutlined />
                            ) : (
                                <SafetyCertificateOutlined />
                            )
                        }
                        message="Verification Report"
                        description={
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-2">
                                <div>
                                    <div className="text-xs text-slate-500">Adjusted Confidence</div>
                                    <div className="font-semibold">{verificationReport.adjusted_confidence}</div>
                                </div>
                                <div>
                                    <div className="text-xs text-slate-500">AI Reported</div>
                                    <div className="font-semibold">{verificationReport.ai_reported_confidence}</div>
                                </div>
                                <div>
                                    <div className="text-xs text-slate-500">Evidence Verification Rate</div>
                                    <div className="font-semibold">{(verificationReport.evidence_verification_rate * 100).toFixed(0)}%</div>
                                </div>
                                <div>
                                    <div className="text-xs text-slate-500">Unverified Evidence</div>
                                    <div className="font-semibold">{verificationReport.unverified_evidence_count}</div>
                                </div>
                                {verificationReport.score_sanity_warnings?.length > 0 && (
                                    <div className="col-span-full">
                                        <div className="text-xs text-slate-500 mb-1">Score Sanity Warnings</div>
                                        {verificationReport.score_sanity_warnings.map((warning, index) => (
                                            <Tag key={index} color="orange" className="mb-1">
                                                {warning}
                                            </Tag>
                                        ))}
                                    </div>
                                )}
                            </div>
                        }
                    />
                </div>
            )}

            {clampWarnings.length > 0 && (
                <div className="mt-4">
                    <Alert
                        type="error"
                        showIcon
                        icon={<WarningOutlined />}
                        message="Score Clamp Warnings"
                        description={
                            <div className="mt-1">
                                <div className="text-xs text-slate-600 mb-2">
                                    AI returned scores outside valid range [0-100]. These were automatically clamped:
                                </div>
                                {clampWarnings.map((warning, index) => (
                                    <Tag key={index} color="red" className="mb-1">
                                        {warning}
                                    </Tag>
                                ))}
                            </div>
                        }
                    />
                </div>
            )}

            {onetCrossValidation && (
                <div className="mt-4">
                    <Collapse
                        size="small"
                        items={[
                            {
                                key: 'onet',
                                label: (
                                    <span>
                                        <DatabaseOutlined className="mr-1" />
                                        O*NET Cross-Validation
                                        {onetCrossValidation.aligned ? (
                                            <Tag color="green" className="ml-2">
                                                Aligned
                                            </Tag>
                                        ) : (
                                            <Tag color="orange" className="ml-2">
                                                {onetCrossValidation.deviation_count} deviation(s)
                                            </Tag>
                                        )}
                                    </span>
                                ),
                                children: (
                                    <div>
                                        {typeof onetCrossValidation.occupations_used === 'number' ? (
                                            <div className="mb-3">
                                                <div className="text-xs text-slate-500 mb-1">Matched O*NET Occupations</div>
                                                <Tag>{onetCrossValidation.occupations_used} occupations used for cross-validation</Tag>
                                            </div>
                                        ) : onetCrossValidation.occupations_used?.length > 0 ? (
                                            <div className="mb-3">
                                                <div className="text-xs text-slate-500 mb-1">Matched O*NET Occupations</div>
                                                {onetCrossValidation.occupations_used.map((occupation, index) => (
                                                    <Tag key={index} className="mb-1">
                                                        {typeof occupation === 'string'
                                                            ? occupation
                                                            : occupation?.title || occupation?.code || JSON.stringify(occupation)}
                                                    </Tag>
                                                ))}
                                            </div>
                                        ) : null}
                                        {onetCrossValidation.onet_avg && (
                                            <div className="mb-3">
                                                <div className="text-xs text-slate-500 mb-1">O*NET Average vs AI Scores</div>
                                                <div className="grid grid-cols-6 gap-2 text-center text-sm">
                                                    {Object.entries(onetCrossValidation.onet_avg).map(([dimension, average]) => (
                                                        <div key={dimension} className="rounded border p-2">
                                                            <div className="font-bold">{dimension}</div>
                                                            <div className="text-slate-500">O*NET: {Number(average).toFixed(0)}</div>
                                                            <div>AI: {profile.riasecScores?.[dimension] ?? '-'}</div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                        {onetCrossValidation.deviations?.length > 0 && (
                                            <div>
                                                <div className="text-xs text-slate-500 mb-1">Deviations</div>
                                                {onetCrossValidation.deviations.map((deviation, index) => (
                                                    <Tag key={index} color="orange" className="mb-1">
                                                        {deviation.dimension}: AI={deviation.aiScore} vs O*NET=
                                                        {Number(deviation.onetAvgScore).toFixed(0)} (gap={Number(deviation.gap).toFixed(0)},{' '}
                                                        {deviation.direction === 'AI_HIGHER' ? '↑' : '↓'})
                                                    </Tag>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ),
                            },
                        ]}
                    />
                </div>
            )}

            {profile.reviewNotes ? (
                <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
                    <div className="text-sm font-medium text-amber-900">Review Notes</div>
                    <div className="mt-1 text-amber-800">{profile.reviewNotes}</div>
                </div>
            ) : null}

            {profile.reasoning ? (
                <Collapse
                    className="mt-4"
                    size="small"
                    items={[
                        {
                            key: 'reasoning',
                            label: (
                                <span>
                                    <EyeOutlined className="mr-1" />
                                    {isOnetDerivedProfile ? 'Profile Method & Reasoning' : 'AI Reasoning & Analysis Steps'}
                                </span>
                            ),
                            children: <div className="whitespace-pre-wrap text-sm text-slate-700">{profile.reasoning}</div>,
                        },
                    ]}
                />
            ) : null}

            {profile.aiSummary ? (
                <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
                    <div className="text-sm font-medium text-blue-900">
                        {isOnetDerivedProfile ? 'Profile Summary' : 'AI Summary'}
                    </div>
                    <div className="mt-1 text-blue-800 text-sm">{profile.aiSummary}</div>
                </div>
            ) : null}

            {programWorkspace.editingScores && (
                <div className="mt-4 rounded-lg border-2 border-blue-300 bg-blue-50 p-4">
                    <Typography.Title level={5} className="!mb-3">
                        <EditOutlined className="mr-1" /> Edit RIASEC Scores
                    </Typography.Title>
                    <Form
                        layout="inline"
                        initialValues={profile.riasecScores || {}}
                        onFinish={(values) => {
                            updateProfileMutation.mutate({
                                profileId: profile.id,
                                payload: { riasecScores: values },
                            });
                        }}
                    >
                        <div className="grid grid-cols-3 md:grid-cols-6 gap-3 w-full mb-3">
                            {['R', 'I', 'A', 'S', 'E', 'C'].map((dimension) => (
                                <Form.Item key={dimension} name={dimension} label={dimension}>
                                    <InputNumber min={0} max={100} style={{ width: 70 }} />
                                </Form.Item>
                            ))}
                        </div>
                        <Button type="primary" htmlType="submit" size="small" loading={updateProfileMutation.isPending}>
                            Save RIASEC Scores
                        </Button>
                    </Form>
                </div>
            )}

            <div className="mt-4 flex flex-wrap gap-2">
                {(profile.extractedSkills || []).map((skill) => {
                    const evidence = (profile.evidenceMap || []).find(
                        (entry) => entry.targetType === 'SKILL' && entry.targetKey.toLowerCase() === skill.toLowerCase(),
                    );
                    const tooltipContent = evidence ? (
                        <div style={{ maxWidth: 300 }}>
                            <div style={{ fontWeight: 600, paddingBottom: 4 }}>Evidence Excerpt:</div>
                            <div style={{ fontStyle: 'italic', paddingBottom: 4 }}>"{evidence.sourceExcerpt}"</div>
                            {evidence.rationale && (
                                <div>
                                    <span style={{ fontWeight: 600 }}>Rationale:</span> {evidence.rationale}
                                </div>
                            )}
                        </div>
                    ) : null;

                    return evidence ? (
                        <AntTooltip key={skill} title={tooltipContent} color="#1e293b">
                            <Tag className="cursor-help cursor-pointer">{skill}</Tag>
                        </AntTooltip>
                    ) : (
                        <Tag key={skill}>{skill}</Tag>
                    );
                })}
            </div>

            {expertReviewsQuery.isLoading && (
                <div className="mt-4">
                    <Spin /> Loading Expert Reviews...
                </div>
            )}
            {!expertReviewsQuery.isLoading && expertReviewsQuery.data?.reviews?.length > 0 && (
                <div className="mt-6 border-t border-slate-200 pt-4">
                    <Typography.Title level={5} className="!mb-4">
                        Expert Reviews ({expertReviewsQuery.data.summary.totalReviews})
                    </Typography.Title>
                    <Row gutter={[16, 16]} className="mb-4">
                        <Col span={12}>
                            <div className="text-sm text-slate-500">Avg Overall Score</div>
                            <div className="text-xl font-semibold text-emerald-600">
                                {expertReviewsQuery.data.summary.averageOverallScore}/10
                            </div>
                        </Col>
                        <Col span={12}>
                            <div className="text-sm text-slate-500">Summary Accuracy</div>
                            <div className="text-xl font-semibold text-emerald-600">
                                {expertReviewsQuery.data.summary.averageSummaryAccuracyScore}/5
                            </div>
                        </Col>
                    </Row>
                    <div className="max-h-60 overflow-y-auto pr-2">
                        {expertReviewsQuery.data.reviews.map((review) => (
                            <div key={review.id} className="mb-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
                                <div className="flex justify-between items-start mb-1">
                                    <Typography.Text strong>{review.reviewerName || review.reviewerEmail}</Typography.Text>
                                    <div className="flex gap-2 text-xs">
                                        <Tag color="green">Score: {review.overallScore}/10</Tag>
                                        <Tag color="blue">Summary: {review.summaryAccuracyScore}/5</Tag>
                                        <Tag color="purple">Evidence: {review.evidenceValidityScore}/5</Tag>
                                    </div>
                                </div>
                                <div className="text-xs text-slate-500 mb-2">Role: {review.reviewerRole || 'Expert'}</div>
                                {review.comments && (
                                    <div className="text-sm text-slate-700 italic border-l-2 border-slate-300 pl-2">"{review.comments}"</div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {(profile.evidenceMap || []).length ? (
                <div className="mt-6 space-y-3">
                    <Typography.Title level={5} style={{ marginBottom: 0 }}>
                        Evidence Mapping
                    </Typography.Title>
                    {profile.evidenceMap.map((entry, index) => (
                        <div key={`${entry.targetKey}-${index}`} className="rounded-lg border border-slate-200 px-4 py-3">
                            <div className="flex flex-wrap items-center gap-2">
                                <Tag color="blue">{entry.targetType}</Tag>
                                <Tag>{entry.targetKey}</Tag>
                                <Typography.Text type="secondary">Signal {entry.signalStrength}/100</Typography.Text>
                            </div>
                            <Typography.Paragraph style={{ marginTop: 8, marginBottom: 8 }}>
                                "{entry.sourceExcerpt}"
                            </Typography.Paragraph>
                            <Typography.Text type="secondary">{entry.rationale || 'No rationale provided.'}</Typography.Text>
                        </div>
                    ))}
                </div>
            ) : null}

            {programWorkspace.showRawResponse && hasRawAiResponse && (
                <div className="mt-4">
                    <Card
                        size="small"
                        title={
                            <span>
                                <CodeOutlined className="mr-1" />
                                Raw AI Response
                            </span>
                        }
                        type="inner"
                    >
                        <pre className="text-xs bg-slate-900 text-green-400 p-4 rounded-lg overflow-auto max-h-96 whitespace-pre-wrap">
                            {matchingRun.aiResponseText}
                        </pre>
                    </Card>
                </div>
            )}
        </Card>
    );
}
