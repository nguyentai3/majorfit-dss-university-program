import AimOutlined from '@ant-design/icons/AimOutlined';
import CloudUploadOutlined from '@ant-design/icons/CloudUploadOutlined';
import ExperimentOutlined from '@ant-design/icons/ExperimentOutlined';
import { Alert, Badge, Button, Card, Col, Collapse, Descriptions, Form, Input, Popconfirm, Row, Select, Space, Tag, Upload } from 'antd';
import { useState } from 'react';
import { queryClient } from '@frontend/api/queryClient';
import { runAiCurriculumAnalysis, runAiEstimateRiasec, fetchAdminProgramDetail } from '../../../../api/services/admin';

const RELEVANCE_COLORS = { primary: 'green', strong: 'blue', moderate: 'orange', weak: 'default' };

export function CurriculumInputCard({
    programId,
    programAnalysisForm,
    extractProgramPdfMutation,
    saveProgramCurriculumMutation,
    setProgramWorkspace,
    onEstimateResult,
}) {
    const [analyzing, setAnalyzing] = useState(false);
    const [aiResult, setAiResult] = useState(null);
    const [aiError, setAiError] = useState(null);
    const [estimating, setEstimating] = useState(false);
    const [estimateError, setEstimateError] = useState(null);
    const [aiProvider, setAiProvider] = useState(null);

    const refreshProgram = async () => {
        if (!setProgramWorkspace) return;
        try {
            const refreshed = await fetchAdminProgramDetail(programId);
            setProgramWorkspace((current) => ({
                ...current,
                program: refreshed,
                onetRefreshNonce: (current.onetRefreshNonce || 0) + 1,
            }));
            await queryClient.invalidateQueries({ queryKey: ['admin'] });
        } catch (_) {  }
    };

    const handleAiAnalyze = async () => {
        setAnalyzing(true);
        setAiError(null);
        setAiResult(null);
        try {
            const result = await runAiCurriculumAnalysis(programId, 'suggest', aiProvider);
            setAiResult(result);
            await refreshProgram();
        } catch (err) {
            const msg = err?.response?.data?.error || err.message || 'AI analysis failed';
            setAiError(msg);
        } finally {
            setAnalyzing(false);
        }
    };

    const handleEstimateRiasec = async () => {
        setEstimating(true);
        setEstimateError(null);
        try {
            const result = await runAiEstimateRiasec(programId, { runConsistency: true, provider: aiProvider });
            onEstimateResult?.(result);
            await refreshProgram();
        } catch (err) {
            const msg = err?.response?.data?.error || err.message || 'AI estimation failed';
            setEstimateError(msg);
        } finally {
            setEstimating(false);
        }
    };

    const handleApplyLinks = async () => {
        setAnalyzing(true);
        try {
            const result = await runAiCurriculumAnalysis(programId, 'apply', aiProvider);
            setAiResult(result);
            await refreshProgram();
        } catch (err) {
            setAiError(err?.response?.data?.error || err.message);
        } finally {
            setAnalyzing(false);
        }
    };

    return (
        <Card size="small" title="Curriculum Input">
            <Upload.Dragger
                accept="application/pdf"
                maxCount={1}
                showUploadList={false}
                customRequest={({ file, onSuccess, onError }) => {
                    extractProgramPdfMutation.mutate(
                        { programId, file },
                        { onSuccess: () => onSuccess?.(), onError: (err) => onError?.(err) },
                    );
                }}
                style={{ marginBottom: 16 }}
            >
                <p className="ant-upload-drag-icon">
                    <CloudUploadOutlined />
                </p>
                <p className="ant-upload-text">
                    {extractProgramPdfMutation.isPending ? 'Extracting PDF...' : 'Click or drag PDF file to upload'}
                </p>
                <p className="ant-upload-hint">Supports single PDF file. Text will be extracted automatically.</p>
            </Upload.Dragger>
            <Form.Item label="Curriculum Title" name="title">
                <Input placeholder="Program curriculum 2026" />
            </Form.Item>
            <Row gutter={12}>
                <Col span={12}>
                    <Form.Item label="Source Type" name="sourceType">
                        <Select
                            options={[
                                { value: 'TEXT', label: 'TEXT' },
                                { value: 'PDF', label: 'PDF' },
                                { value: 'URL', label: 'URL' },
                                { value: 'SEEDED', label: 'SEEDED' },
                            ]}
                        />
                    </Form.Item>
                </Col>
                <Col span={12}>
                    <Form.Item label="Source URL" name="sourceUrl">
                        <Input />
                    </Form.Item>
                </Col>
            </Row>
            <Form.Item label="Curriculum Text" name="curriculumText" rules={[{ required: true, min: 20 }]}>
                <Input.TextArea rows={8} />
            </Form.Item>
            <Form.Item label="Objectives (comma separated)" name="objectives">
                <Input />
            </Form.Item>
            <Form.Item label="Course List (comma separated)" name="courseList">
                <Input />
            </Form.Item>
            <Form.Item label="Notes" name="notes">
                <Input.TextArea rows={2} />
            </Form.Item>

            <div style={{ marginBottom: 16, padding: '12px 16px', background: '#f0f5ff', borderRadius: 8, border: '1px solid #adc6ff', display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontWeight: 600, color: '#2f54eb' }}>AI Engine:</span>
                <Select
                    value={aiProvider}
                    onChange={setAiProvider}
                    style={{ width: 200 }}
                    placeholder="Auto (Default fallback)"
                    options={[
                        { value: null, label: 'Auto (Default + Fallback)' },
                        { value: 'openai-compatible', label: 'OpenAI-Compatible (e.g. Gemini/GPT)' },
                        { value: 'groq', label: 'Groq (Llama 3 Fast)' }
                    ]}
                />
                <span style={{ fontSize: 12, color: '#8c8c8c' }}>Select a specific provider if you want to retry/compare results.</span>
            </div>

            <Space>
                <Button
                    type="primary"
                    loading={saveProgramCurriculumMutation.isPending}
                    onClick={() => {
                        programAnalysisForm
                            .validateFields(['title', 'sourceType', 'sourceUrl', 'curriculumText', 'objectives', 'courseList', 'notes'])
                            .then((values) =>
                                saveProgramCurriculumMutation.mutate({
                                    programId,
                                    payload: values,
                                }),
                            )
                            .catch(() => {});
                    }}
                >
                    Save Curriculum Version
                </Button>
                <Popconfirm
                    title="AI Suggest O*NET Links"
                    description="This will use 1 AI API call. Continue?"
                    onConfirm={handleAiAnalyze}
                    okText="Yes, run AI"
                    cancelText="Cancel"
                    disabled={analyzing}
                >
                    <Button
                        type="default"
                        icon={<ExperimentOutlined />}
                        loading={analyzing}
                        style={{ borderColor: '#722ed1', color: '#722ed1' }}
                    >
                        {analyzing ? 'AI Suggesting O*NET Links...' : 'AI Suggest O*NET Links'}
                    </Button>
                </Popconfirm>
                <Popconfirm
                    title="Estimate RIASEC (Tầng 2)"
                    description="This will use 1-2 AI API calls (with consistency check). Continue?"
                    onConfirm={handleEstimateRiasec}
                    okText="Yes, estimate"
                    cancelText="Cancel"
                    disabled={estimating}
                >
                    <Button
                        type="default"
                        icon={<AimOutlined />}
                        loading={estimating}
                        style={{ borderColor: '#13c2c2', color: '#13c2c2' }}
                    >
                        {estimating ? 'Estimating RIASEC...' : 'Estimate RIASEC (Tầng 2)'}
                    </Button>
                </Popconfirm>
            </Space>

            {estimateError && (
                <Alert
                    type="error"
                    message="RIASEC Estimation Failed"
                    description={estimateError}
                    showIcon
                    closable
                    onClose={() => setEstimateError(null)}
                    style={{ marginTop: 16 }}
                />
            )}

            {aiError && (
                <Alert
                    type="error"
                    message="AI Analysis Failed"
                    description={aiError}
                    showIcon
                    closable
                    onClose={() => setAiError(null)}
                    style={{ marginTop: 16 }}
                />
            )}

            {aiResult && (
                <Card
                    size="small"
                    title={
                        <Space>
                            <ExperimentOutlined style={{ color: '#722ed1' }} />
                            <span>AI O*NET Suggestions</span>
                            <Tag color="purple">{aiResult.provider}/{aiResult.model}</Tag>
                            {aiResult.tokensUsed && <Tag>{aiResult.tokensUsed} tokens</Tag>}
                        </Space>
                    }
                    style={{ marginTop: 16, borderColor: '#d3adf7' }}
                >
                    {aiResult.preprocessor && (
                        <div style={{ marginBottom: 12 }}>
                            <Tag color={aiResult.preprocessor.dataQualityLevel === 'GOOD' ? 'green' : aiResult.preprocessor.dataQualityLevel === 'FAIR' ? 'orange' : 'red'}>
                                Data Quality: {aiResult.preprocessor.dataQualityLevel}
                            </Tag>
                            <Tag>{aiResult.preprocessor.courseCount} courses detected</Tag>
                        </div>
                    )}

                    <Alert
                        type="info"
                        showIcon
                        style={{ marginBottom: 12 }}
                        message="Preview only"
                        description="This step only suggests O*NET occupations from the curriculum. Use Apply to persist the links so the system can derive a public program profile."
                    />

                    <Descriptions column={1} size="small" style={{ marginBottom: 12 }}>
                        <Descriptions.Item label="Focus Areas">
                            <Space wrap>
                                {aiResult.interpretation.focusAreas.map((fa, i) => (
                                    <Tag key={i} color="blue">{fa}</Tag>
                                ))}
                            </Space>
                        </Descriptions.Item>
                        {aiResult.interpretation.careerOutcomes.length > 0 && (
                            <Descriptions.Item label="Career Outcomes">
                                {aiResult.interpretation.careerOutcomes.join(', ')}
                            </Descriptions.Item>
                        )}
                    </Descriptions>

                    <Collapse
                        size="small"
                        defaultActiveKey={['occupations']}
                        items={[{
                            key: 'occupations',
                            label: <span>Suggested O*NET Occupations ({aiResult.interpretation.suggestedOccupations.length})</span>,
                            children: (
                                <div>
                                    {aiResult.interpretation.suggestedOccupations.map((occ, i) => (
                                        <div key={i} style={{ marginBottom: 12, padding: 8, background: '#fafafa', borderRadius: 6 }}>
                                            <div style={{ marginBottom: 4 }}>
                                                <Badge color={RELEVANCE_COLORS[occ.relevanceLevel] === 'default' ? 'grey' : RELEVANCE_COLORS[occ.relevanceLevel]} />
                                                <strong style={{ marginLeft: 4 }}>{occ.title}</strong>
                                                <Tag style={{ marginLeft: 8 }}>{occ.onetCode}</Tag>
                                                <Tag color={RELEVANCE_COLORS[occ.relevanceLevel]}>{occ.relevanceLevel} (weight: {occ.numericWeight})</Tag>
                                            </div>
                                            <div style={{ fontSize: 12, color: '#666', paddingLeft: 18 }}>
                                                {occ.evidence.map((e, j) => (
                                                    <div key={j}>- {e}</div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ),
                        }]}
                    />

                    {aiResult.previewProfile && (
                        <div style={{ marginTop: 12 }}>
                            <Descriptions column={3} size="small" title="Preview RIASEC Profile" bordered>
                                {['R', 'I', 'A', 'S', 'E', 'C'].map(d => (
                                    <Descriptions.Item key={d} label={d}>
                                        <strong>{aiResult.previewProfile.riasecScores?.[d] ?? '-'}</strong>
                                    </Descriptions.Item>
                                ))}
                                <Descriptions.Item label="Holland Code">
                                    <Tag color="purple">{aiResult.previewProfile.hollandCode}</Tag>
                                </Descriptions.Item>
                                <Descriptions.Item label="Confidence">
                                    {aiResult.previewProfile.confidence}%
                                </Descriptions.Item>
                            </Descriptions>
                        </div>
                    )}

                    {aiResult.interpretation.notes && (
                        <Alert
                            type="info"
                            message={aiResult.interpretation.notes}
                            style={{ marginTop: 12 }}
                        />
                    )}

                    {!aiResult.linkResult && (
                        <div style={{ marginTop: 12, textAlign: 'right' }}>
                            <Button
                                type="primary"
                                onClick={handleApplyLinks}
                                loading={analyzing}
                                style={{ background: '#722ed1', borderColor: '#722ed1' }}
                            >
                                Apply: Create O*NET Links from AI Suggestions
                            </Button>
                        </div>
                    )}

                    {aiResult.linkResult && (
                        <Alert
                            type="success"
                            message={`O*NET Links Applied: ${aiResult.linkResult.created?.length || 0} created, ${aiResult.linkResult.updated?.length || 0} updated, ${aiResult.linkResult.skipped?.length || 0} skipped`}
                            style={{ marginTop: 12 }}
                        />
                    )}
                </Card>
            )}
        </Card>
    );
}
