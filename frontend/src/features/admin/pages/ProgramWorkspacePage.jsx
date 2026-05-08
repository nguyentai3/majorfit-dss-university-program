import { Alert, Button, Col, Form, Input, Modal, Row, Select, Skeleton, Space, Typography } from 'antd';
import EditOutlined from '@ant-design/icons/EditOutlined';
import { FOCUS_AREA_OPTIONS } from '@frontend/features/admin/config/focusAreaOptions';
import { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import ArrowLeftOutlined from '@ant-design/icons/ArrowLeftOutlined';
import { getApiErrorMessage } from '@frontend/api/api';
import { queryClient } from '@frontend/api/queryClient';
import { useRouter, useParams } from '@frontend/routes/navigation';
import {
    fetchAdminProgramDetail,
    fetchAdminProgramExpertReviews,
    clearAdminProgramFailedAnalysisRuns,
    createAdminProgramCurriculum,
    extractAdminProgramCurriculumPdf,
    updateAdminProgram,
    updateAdminProgramProfile,
} from '@frontend/api/services';
import { Popconfirm } from 'antd';
import { AnalysisRunHistoryCard } from '@frontend/features/admin/components/program-workspace/AnalysisRunHistoryCard';
import { CurriculumInputCard } from '@frontend/features/admin/components/program-workspace/CurriculumInputCard';
import { EstimatedProfileCard } from '@frontend/features/admin/components/program-workspace/EstimatedProfileCard';
import { OnetLinkManager } from '@frontend/features/admin/components/program-workspace/OnetLinkManager';
import { ProgramProfileReviewCard } from '@frontend/features/admin/components/program-workspace/ProgramProfileReviewCard';
import { ProgramSnapshotCard } from '@frontend/features/admin/components/program-workspace/ProgramSnapshotCard';
import { message } from 'antd';

function isArchivedProfile(profile) {
    return (
        profile?.reviewStatus === 'REJECTED' ||
        (profile?.reviewStatus === 'PUBLISHED' && profile?.isPublished === false)
    );
}

function findLatestEstimateFromRuns(analysisRuns) {
    if (!analysisRuns?.length) return null;
    const estimateRun = analysisRuns.find(
        (run) => run.status === 'SUCCESS' && run.promptVersion?.startsWith('estimate-riasec'),
    );
    if (!estimateRun?.parsedResult?.riasecScores) return null;
    const r = estimateRun.parsedResult;
    return {
        source: 'AI_ESTIMATED',
        riasecScores: r.riasecScores,
        hollandCode: r.hollandCode,
        confidence: r.confidence,
        confidenceLevel: r.confidenceLevel,
        needsReview: r.needsReview,
        reasoning: r.reasoning,
        mostSimilarAnchor: r.mostSimilarAnchor,
        keyDifferences: r.keyDifferences,
        anchorPrograms: r.anchorPrograms,
        validation: r.validation,
        provider: r.provider || estimateRun.provider,
        model: r.model || estimateRun.model,
        runDate: estimateRun.createdAt,
    };
}

export function ProgramWorkspacePage() {
    const router = useRouter();
    const { programId } = useParams();

    const [programAnalysisForm] = Form.useForm();
    const [estimateResult, setEstimateResult] = useState(null);
    const [onetRefreshNonce, setOnetRefreshNonce] = useState(0);
    const [profileReviewState, setProfileReviewState] = useState({
        selectedProfileIndex: 0,
        editingScores: false,
        showRawResponse: false,
    });

    const invalidateAdmin = () => queryClient.invalidateQueries({ queryKey: ['admin'] });

    const programQuery = useQuery({
        queryKey: ['admin', 'programDetail', programId],
        queryFn: () => fetchAdminProgramDetail(programId),
        enabled: !!programId,
    });

    const expertReviewsQuery = useQuery({
        queryKey: ['admin', 'expert-reviews', programId],
        queryFn: () => fetchAdminProgramExpertReviews(programId),
        enabled: !!programId,
    });

    const program = programQuery.data;
    const allProfiles = program?.profiles || [];
    const visibleProfiles = useMemo(
        () => allProfiles.filter((profile) => !isArchivedProfile(profile)),
        [allProfiles],
    );

    useEffect(() => {
        if (program) {
            const latestCurriculum = program.curriculums?.[0];
            programAnalysisForm.setFieldsValue({
                title: latestCurriculum?.title,
                sourceType: latestCurriculum?.sourceType || 'TEXT',
                sourceUrl: latestCurriculum?.sourceUrl,
                curriculumText: latestCurriculum?.curriculumText || latestCurriculum?.extractedText,
                objectives: (latestCurriculum?.objectives || []).join(', '),
                courseList: (latestCurriculum?.courseList || []).join(', '),
                notes: latestCurriculum?.notes,
                reviewStatus: program.latestProfile?.reviewStatus || 'REVIEW',
                reviewNotes: program.latestProfile?.reviewNotes || '',
            });
        }
    }, [program, programAnalysisForm]);

    const currentEstimateResult = useMemo(() => {
        if (estimateResult) return estimateResult;
        return findLatestEstimateFromRuns(program?.analysisRuns);
    }, [estimateResult, program?.analysisRuns]);

    useEffect(() => {
        setProfileReviewState((current) => {
            if (!visibleProfiles.length) {
                return current.selectedProfileIndex === 0 ? current : { ...current, selectedProfileIndex: 0 };
            }
            if (current.selectedProfileIndex < visibleProfiles.length) {
                return current;
            }
            return { ...current, selectedProfileIndex: 0 };
        });
    }, [visibleProfiles.length]);

    const saveProgramCurriculumMutation = useMutation({
        mutationFn: ({ programId, payload }) => createAdminProgramCurriculum(programId, payload),
        onSuccess: async () => {
            message.success('Curriculum version saved');
            await programQuery.refetch();
            await invalidateAdmin();
        },
        onError: (error) => message.error(getApiErrorMessage(error, 'Curriculum save failed')),
    });

    const extractProgramPdfMutation = useMutation({
        mutationFn: ({ programId, file }) => extractAdminProgramCurriculumPdf(programId, file),
        onSuccess: (data) => {
            message.success('PDF extracted');
            programAnalysisForm.setFieldsValue({
                title: data.fileName || programAnalysisForm.getFieldValue('title'),
                sourceType: 'PDF',
                curriculumText: data.extractedText || '',
            });
        },
        onError: (error) => message.error(getApiErrorMessage(error, 'PDF extraction failed')),
    });

    const updateProfileMutation = useMutation({
        mutationFn: ({ profileId, payload }) => updateAdminProgramProfile(profileId, payload),
        onSuccess: async () => {
            message.success('Profile updated');
            await programQuery.refetch();
            await invalidateAdmin();
        },
        onError: (error) => message.error(getApiErrorMessage(error, 'Profile update failed')),
    });

    const clearFailedAnalysisRunsMutation = useMutation({
        mutationFn: () => clearAdminProgramFailedAnalysisRuns(programId),
        onSuccess: async (data) => {
            message.success(`Cleared ${data.deletedCount || 0} failed run(s)`);
            await programQuery.refetch();
            await invalidateAdmin();
        },
        onError: (error) => message.error(getApiErrorMessage(error, 'Clear failed runs failed')),
    });

    const programWorkspaceMock = useMemo(() => ({
        open: true,
        loading: programQuery.isLoading,
        program,
        selectedProfileIndex: profileReviewState.selectedProfileIndex,
        editingScores: profileReviewState.editingScores,
        showRawResponse: profileReviewState.showRawResponse,
        onetRefreshNonce,
    }), [programQuery.isLoading, program, profileReviewState, onetRefreshNonce]);

    const setProgramWorkspaceMock = (updater) => {
        if (typeof updater === 'function') {
            const current = programWorkspaceMock;
            const next = updater(current);
            if (next.estimateResult !== undefined) setEstimateResult(next.estimateResult);
            if (next.onetRefreshNonce !== undefined) setOnetRefreshNonce(next.onetRefreshNonce);
            setProfileReviewState((currentState) => ({
                ...currentState,
                selectedProfileIndex: next.selectedProfileIndex ?? currentState.selectedProfileIndex,
                editingScores: next.editingScores ?? currentState.editingScores,
                showRawResponse: next.showRawResponse ?? currentState.showRawResponse,
            }));
            if (next.program !== current.program) {
                programQuery.refetch();
            }
        }
    };

    const togglePublishMutation = useMutation({
        mutationFn: (newStatus) => updateAdminProgram(programId, { status: newStatus }),
        onSuccess: (_, newStatus) => {
            message.success(newStatus === 'ACTIVE' ? 'Program published — visible to students.' : 'Program reverted to DRAFT.');
            invalidateAdmin();
            programQuery.refetch();
        },
        onError: (err) => message.error(getApiErrorMessage(err, 'Failed to update program status')),
    });

    const [editOpen, setEditOpen] = useState(false);
    const [editForm] = Form.useForm();
    const updateBasicInfoMutation = useMutation({
        mutationFn: (payload) => updateAdminProgram(programId, payload),
        onSuccess: () => {
            message.success('Program info updated.');
            setEditOpen(false);
            invalidateAdmin();
            programQuery.refetch();
        },
        onError: (err) => message.error(getApiErrorMessage(err, 'Failed to update program')),
    });

    const openEditModal = () => {
        editForm.setFieldsValue({
            name: program?.name,
            code: program?.code,
            focusArea: program?.focusArea,
            department: program?.department,
            keyCourses: program?.keyCourses || [],
        });
        setEditOpen(true);
    };

    const handleEditSubmit = async () => {
        try {
            const values = await editForm.validateFields();
            updateBasicInfoMutation.mutate(values);
        } catch { }
    };

    const quickPublishMutation = useMutation({
        mutationFn: async () => {
            const currentStatus = String(program?.status || 'DRAFT').toUpperCase();
            const draftProfile = (program?.profiles || [])
                .filter((p) => p.reviewStatus !== 'REJECTED' && !p.isPublished)
                .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))[0];

            if (draftProfile) {
                await updateAdminProgramProfile(draftProfile.id, {
                    reviewStatus: 'PUBLISHED',
                    isPublished: true,
                });
            }
            if (currentStatus !== 'ACTIVE') {
                await updateAdminProgram(programId, { status: 'ACTIVE' });
            }
        },
        onSuccess: () => {
            message.success('Profile approved and program published — visible to students.');
            invalidateAdmin();
            programQuery.refetch();
        },
        onError: (err) => message.error(getApiErrorMessage(err, 'Quick publish failed')),
    });

    if (programQuery.isLoading) {
        return (
            <div style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>
                <Skeleton active paragraph={{ rows: 10 }} />
            </div>
        );
    }

    if (programQuery.isError || !program) {
        return (
            <div style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>
                <Alert type="error" message="Error loading program workspace" description="The program could not be found." />
                <Button onClick={() => router.push('/admin/programs')} style={{ marginTop: 16 }}>Back to Programs</Button>
            </div>
        );
    }

    const programStatus = String(program.status || 'DRAFT').toUpperCase();
    const careerOutcomesCount = (program.careerOutcomes || []).length;
    const hasOnetLinks = careerOutcomesCount > 0;
    const hasDerivedProfile = Boolean(program.latestProfile?.riasecScores);
    const hasPublishedProfile = visibleProfiles.some((p) => p.isPublished);
    const draftProfileExists = (program.profiles || []).some(
        (p) => p.reviewStatus !== 'REJECTED' && !p.isPublished,
    );
    const hasAnyProfile = hasOnetLinks || hasDerivedProfile || draftProfileExists || hasPublishedProfile;
    const isAlreadyPublished = programStatus === 'ACTIVE' && (hasOnetLinks || hasPublishedProfile);
    const canQuickPublish = !isAlreadyPublished && hasAnyProfile;
    const quickPublishHint = !hasAnyProfile
        ? 'Link O*NET occupations or run AI estimation to generate a profile first'
        : isAlreadyPublished
            ? 'Already published — visible to students'
            : '';
    const lifecycleLabel = isAlreadyPublished
        ? 'PUBLISHED'
        : hasAnyProfile
            ? 'ANALYZED'
            : 'DRAFT';
    const statusColor = lifecycleLabel === 'PUBLISHED'
        ? '#10b981'
        : lifecycleLabel === 'ANALYZED'
            ? '#3b82f6'
            : '#f59e0b';

    return (
        <div style={{ padding: '24px 24px 64px 24px', maxWidth: 1100, margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8, gap: 8 }}>
                <Button
                    icon={<ArrowLeftOutlined />}
                    onClick={() => router.push('/admin/programs')}
                >
                    Back
                </Button>
                <Typography.Title level={4} style={{ margin: 0, flex: 1, minWidth: 0 }}>
                    {program.name}
                </Typography.Title>
                <Button
                    icon={<EditOutlined />}
                    onClick={openEditModal}
                >
                    Edit info
                </Button>
                <span
                    style={{
                        fontSize: 11,
                        fontWeight: 700,
                        letterSpacing: 0.6,
                        padding: '4px 10px',
                        borderRadius: 999,
                        background: `${statusColor}15`,
                        color: statusColor,
                        border: `1px solid ${statusColor}40`,
                    }}
                >
                    {lifecycleLabel}
                </span>
                {programStatus === 'ACTIVE' && (
                    <Popconfirm
                        title="Revert to DRAFT?"
                        description="Program will no longer be visible to students."
                        okText="Revert"
                        cancelText="Cancel"
                        okButtonProps={{ danger: true }}
                        onConfirm={() => togglePublishMutation.mutate('DRAFT')}
                    >
                        <Button size="small" loading={togglePublishMutation.isPending}>
                            Revert to Draft
                        </Button>
                    </Popconfirm>
                )}
            </div>
            <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 16, fontSize: 12, paddingLeft: 56 }}>
                Stage 2 of 2: Enrichment — link O*NET, upload curriculum, review profile
            </Typography.Text>

            {!hasAnyProfile && (
                <Alert
                    type="info"
                    showIcon
                    style={{ marginBottom: 16 }}
                    message="👉 Next: Use Auto-Suggest or Search below to link 2-3 O*NET occupations. The RIASEC profile is computed automatically."
                />
            )}

            <Space direction="vertical" size={16} style={{ width: '100%' }}>
                <details
                    open={!hasAnyProfile}
                    style={{
                        background: 'linear-gradient(135deg, #eef2ff 0%, #f0f9ff 100%)',
                        border: '1px solid #c7d2fe',
                        borderRadius: 8,
                        padding: '10px 14px',
                    }}
                >
                    <summary style={{ cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#3730a3' }}>
                        ℹ️ How this program gets its RIASEC profile (2-Tier Architecture)
                    </summary>
                    <div style={{ marginTop: 10, fontSize: 12, color: '#4338ca', lineHeight: 1.7 }}>
                        <div style={{ marginBottom: 8 }}>
                            <strong>Tier 1 — O*NET Bridge</strong> <em>(Primary, deterministic)</em><br />
                            Link 2-5 O*NET occupations → weighted RIASEC from U.S. Department of Labor data.
                            Use when the program maps clearly to known career outcomes.
                        </div>
                        <div style={{ marginBottom: 8 }}>
                            <strong>Tier 2 — AI Curriculum Estimation</strong> <em>(Fallback)</em><br />
                            Upload curriculum → AI estimates RIASEC from anchor programs (TF-IDF similarity).
                            Use when the program is in a new field with insufficient O*NET matches.
                        </div>
                        <div style={{ color: '#6366f1' }}>
                            <strong>Tip:</strong> Try Tier 1 first. Switch to Tier 2 only if you cannot find ≥ 3 strong O*NET matches.
                        </div>
                    </div>
                </details>

                <ProgramSnapshotCard program={program} />

                <OnetLinkManager
                    programId={programId}
                    programWorkspace={programWorkspaceMock}
                    setProgramWorkspace={setProgramWorkspaceMock}
                    estimateResult={currentEstimateResult}
                    refreshSignal={onetRefreshNonce}
                    onQuickPublish={() => quickPublishMutation.mutate()}
                    quickPublishLoading={quickPublishMutation.isPending}
                    canQuickPublish={canQuickPublish}
                    quickPublishHint={quickPublishHint}
                />

                <Form form={programAnalysisForm} layout="vertical">
                    <CurriculumInputCard
                        programId={programId}
                        programAnalysisForm={programAnalysisForm}
                        extractProgramPdfMutation={extractProgramPdfMutation}
                        saveProgramCurriculumMutation={saveProgramCurriculumMutation}
                        setProgramWorkspace={setProgramWorkspaceMock}
                        onEstimateResult={setEstimateResult}
                    />
                </Form>

                {visibleProfiles.length > 0 ? (
                    <ProgramProfileReviewCard
                        profiles={visibleProfiles}
                        analysisRuns={program.analysisRuns || []}
                        selectedProfileIndex={profileReviewState.selectedProfileIndex}
                        programWorkspace={programWorkspaceMock}
                        setProgramWorkspace={setProgramWorkspaceMock}
                        updateProfileMutation={updateProfileMutation}
                        expertReviewsQuery={expertReviewsQuery}
                    />
                ) : null}

                {currentEstimateResult && (
                    <EstimatedProfileCard
                        estimateResult={currentEstimateResult}
                        programId={programId}
                        onAccepted={async () => {
                            setEstimateResult(null);
                            await programQuery.refetch();
                        }}
                    />
                )}

                <AnalysisRunHistoryCard
                    analysisRuns={program.analysisRuns}
                    onClearFailed={() => clearFailedAnalysisRunsMutation.mutate()}
                    clearFailedLoading={clearFailedAnalysisRunsMutation.isPending}
                />
            </Space>

            <Modal
                open={editOpen}
                title="Edit Program Info"
                onCancel={() => setEditOpen(false)}
                onOk={handleEditSubmit}
                confirmLoading={updateBasicInfoMutation.isPending}
                okText="Save Changes"
                width={680}
                destroyOnClose
            >
                <Form form={editForm} layout="vertical" style={{ marginTop: 8 }}>
                    <Form.Item
                        label="Program Name"
                        name="name"
                        rules={[{ required: true, message: 'Program name is required', min: 2 }]}
                    >
                        <Input placeholder="e.g. Information Technology" />
                    </Form.Item>
                    <Row gutter={12}>
                        <Col span={12}>
                            <Form.Item
                                label="Program Code"
                                name="code"
                                rules={[{ required: true, message: 'Code required', min: 2 }]}
                            >
                                <Input placeholder="e.g. HUST-IT" style={{ textTransform: 'uppercase' }} />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item label="Focus Area" name="focusArea">
                                <Select
                                    showSearch
                                    allowClear
                                    placeholder="Select focus area..."
                                    optionFilterProp="label"
                                    options={FOCUS_AREA_OPTIONS}
                                />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Form.Item label="Department" name="department">
                        <Input placeholder="e.g. School of Computing" />
                    </Form.Item>
                    <Form.Item
                        label="Key Courses (one per line — used by O*NET Auto-Suggest)"
                        name="keyCourses"
                        getValueFromEvent={(e) => e.target.value.split('\n').map((s) => s.trim()).filter(Boolean)}
                        getValueProps={(val) => ({ value: Array.isArray(val) ? val.join('\n') : val || '' })}
                    >
                        <Input.TextArea
                            rows={4}
                            placeholder={'Data Structures\nDatabase Systems\nMachine Learning'}
                        />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
}
