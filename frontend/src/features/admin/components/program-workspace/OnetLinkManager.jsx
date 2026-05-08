import { useCallback, useEffect, useState } from 'react';
import { Button, Card, Col, Input, InputNumber, message, Popconfirm, Row, Slider, Space, Statistic, Switch, Table, Tag, Tooltip, Typography } from 'antd';
import { Radar } from 'react-chartjs-2';
import DeleteOutlined from '@ant-design/icons/DeleteOutlined';
import LinkOutlined from '@ant-design/icons/LinkOutlined';
import PlusOutlined from '@ant-design/icons/PlusOutlined';
import SearchOutlined from '@ant-design/icons/SearchOutlined';
import StarFilled from '@ant-design/icons/StarFilled';
import StarOutlined from '@ant-design/icons/StarOutlined';
import ThunderboltOutlined from '@ant-design/icons/ThunderboltOutlined';
import {
    addOnetLink,
    deleteOnetLink,
    fetchOnetLinks,
    suggestOnetOccupations,
    updateOnetLink,
} from '@frontend/api/services/admin';
import { getApiErrorMessage } from '@frontend/api/api';

const RIASEC_COLORS = { R: '#e74c3c', I: '#3498db', A: '#9b59b6', S: '#2ecc71', E: '#f39c12', C: '#1abc9c' };
const RIASEC_LABELS = { R: 'Realistic', I: 'Investigative', A: 'Artistic', S: 'Social', E: 'Enterprising', C: 'Conventional' };

function RiasecRadar({ scores, size = 160 }) {
    if (!scores) return null;
    const dims = ['R', 'I', 'A', 'S', 'E', 'C'];
    const data = {
        labels: dims,
        datasets: [{
            label: 'RIASEC',
            data: dims.map((d) => scores[d] || 0),
            backgroundColor: 'rgba(24,144,255,0.18)',
            borderColor: '#1890ff',
            borderWidth: 2,
            pointBackgroundColor: dims.map((d) => RIASEC_COLORS[d]),
            pointRadius: 3,
        }],
    };
    const options = {
        responsive: true,
        maintainAspectRatio: true,
        plugins: { legend: { display: false }, tooltip: { enabled: true } },
        scales: {
            r: {
                beginAtZero: true,
                min: 0,
                max: 100,
                ticks: { stepSize: 25, font: { size: 9 }, display: false },
                pointLabels: { font: { size: 11, weight: 'bold' } },
                grid: { color: '#e8e8e8' },
                angleLines: { color: '#e8e8e8' },
            },
        },
    };
    return (
        <div style={{ width: size, height: size }}>
            <Radar data={data} options={options} />
        </div>
    );
}

function RiasecMiniBar({ scores }) {
    if (!scores) return <Typography.Text type="secondary">N/A</Typography.Text>;
    const max = Math.max(...Object.values(scores), 1);
    return (
        <div style={{ display: 'flex', gap: 3, alignItems: 'end', height: 32 }}>
            {['R', 'I', 'A', 'S', 'E', 'C'].map((dim) => {
                const val = scores[dim] || 0;
                return (
                    <Tooltip key={dim} title={`${RIASEC_LABELS[dim]}: ${val}`}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 18 }}>
                            <div
                                style={{
                                    width: 14,
                                    height: Math.max(3, (val / max) * 28),
                                    backgroundColor: RIASEC_COLORS[dim],
                                    borderRadius: 2,
                                }}
                            />
                            <span style={{ fontSize: 9, color: '#888' }}>{dim}</span>
                        </div>
                    </Tooltip>
                );
            })}
        </div>
    );
}

export function OnetLinkManager({
    programId,
    programWorkspace,
    setProgramWorkspace,
    estimateResult,
    refreshSignal = 0,
    onQuickPublish,
    quickPublishLoading = false,
    canQuickPublish = false,
    quickPublishHint = '',
}) {
    const [links, setLinks] = useState([]);
    const [derivedProfile, setDerivedProfile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [searching, setSearching] = useState(false);
    const [autoSuggesting, setAutoSuggesting] = useState(false);
    const [mutating, setMutating] = useState(null);

    const program = programWorkspace?.program;

    const loadLinks = useCallback(async () => {
        if (!programId) return;
        setLoading(true);
        try {
            const data = await fetchOnetLinks(programId);
            setLinks(data.links || []);
            setDerivedProfile(data.derivedProfile || null);
        } catch (err) {
            message.error(getApiErrorMessage(err, 'Failed to load O*NET links'));
        } finally {
            setLoading(false);
        }
    }, [programId]);

    useEffect(() => { loadLinks(); }, [loadLinks, refreshSignal]);

    const handleSearch = async () => {
        const q = searchQuery.trim();
        if (!q || q.length < 2) { message.warning('Enter at least 2 characters'); return; }
        setSearching(true);
        try {
            const data = await suggestOnetOccupations(programId, q);
            const existingCodes = new Set(links.map((l) => l.occupation?.onetCode || l.occupationId));
            setSearchResults((data.suggestions || []).filter((s) => !existingCodes.has(s.onetCode)));
        } catch (err) {
            message.error(getApiErrorMessage(err, 'Search failed'));
        } finally {
            setSearching(false);
        }
    };

    const handleAutoSuggest = async () => {
        setAutoSuggesting(true);
        try {
            const queries = new Set();
            if (program?.focusArea) queries.add(program.focusArea);
            if (program?.name) queries.add(program.name);

            const keyCourses = Array.isArray(program?.keyCourses) ? program.keyCourses : [];
            for (const course of keyCourses.slice(0, 5)) {
                if (course && course.length >= 3) queries.add(course);
            }
            if (queries.size === 0) queries.add('');

            const allResults = new Map();
            const existing = new Set(links.map((l) => l.occupation?.onetCode || l.occupationId));

            for (const q of queries) {
                try {
                    const data = await suggestOnetOccupations(programId, q);
                    for (const s of (data.suggestions || [])) {
                        if (!existing.has(s.onetCode) && !allResults.has(s.onetCode)) {
                            allResults.set(s.onetCode, s);
                        }
                    }
                } catch {  }
            }

            const results = [...allResults.values()].slice(0, 20);
            setSearchResults(results);
            if (results.length === 0) {
                message.info('No matching occupations found. Try manual search.');
            } else {
                message.success(`Found ${results.length} suggested occupations`);
            }
        } catch (err) {
            message.error(getApiErrorMessage(err, 'Auto-suggest failed'));
        } finally {
            setAutoSuggesting(false);
        }
    };

    const handleAdd = async (occ) => {
        setMutating(occ.onetCode);
        try {
            await addOnetLink(programId, {
                onetCode: occ.onetCode,
                relevance: 7,
                isPrimary: links.length === 0,
            });
            message.success(`Added: ${occ.title}`);
            setSearchResults((prev) => prev.filter((s) => s.onetCode !== occ.onetCode));
            await loadLinks();
        } catch (err) {
            message.error(getApiErrorMessage(err, 'Failed to add'));
        } finally {
            setMutating(null);
        }
    };

    const handleUpdate = async (linkId, field, value) => {
        setMutating(linkId);
        try {
            await updateOnetLink(programId, linkId, { [field]: value });
            await loadLinks();
        } catch (err) {
            message.error(getApiErrorMessage(err, 'Failed to update'));
        } finally {
            setMutating(null);
        }
    };

    const handleDelete = async (linkId) => {
        setMutating(linkId);
        try {
            await deleteOnetLink(programId, linkId);
            message.success('Link removed');
            await loadLinks();
        } catch (err) {
            message.error(getApiErrorMessage(err, 'Failed to delete'));
        } finally {
            setMutating(null);
        }
    };

    const linkColumns = [
        {
            title: 'O*NET Code',
            dataIndex: ['occupation', 'onetCode'],
            width: 110,
            render: (code) => <Tag color="blue">{code}</Tag>,
        },
        {
            title: 'Occupation',
            dataIndex: ['occupation', 'title'],
            ellipsis: true,
        },
        {
            title: 'Holland',
            dataIndex: ['occupation', 'hollandCode'],
            width: 60,
            render: (code) => code ? <Tag>{code}</Tag> : '-',
        },
        {
            title: 'Outlook',
            dataIndex: ['occupation', 'jobOutlook'],
            width: 85,
            render: (val, record) => {
                const bright = record.occupation?.brightOutlook;
                if (bright) return <Tag color="green">Bright</Tag>;
                if (val === 'Average') return <Tag color="gold">Average</Tag>;
                if (val) return <Tag>{val}</Tag>;
                return <span style={{ color: '#bbb' }}>—</span>;
            },
        },
        {
            title: 'Relevance',
            dataIndex: 'relevance',
            width: 130,
            render: (val, record) => (
                <Slider
                    min={1}
                    max={10}
                    value={val}
                    onChange={(v) => handleUpdate(record.id, 'relevance', v)}
                    disabled={mutating === record.id}
                    style={{ margin: 0 }}
                />
            ),
        },
        {
            title: 'Primary',
            dataIndex: 'isPrimary',
            width: 60,
            align: 'center',
            render: (val, record) => (
                <Button
                    type="text"
                    size="small"
                    icon={val ? <StarFilled style={{ color: '#faad14' }} /> : <StarOutlined />}
                    onClick={() => handleUpdate(record.id, 'isPrimary', !val)}
                    loading={mutating === record.id}
                />
            ),
        },
        {
            title: '',
            width: 40,
            render: (_, record) => (
                <Popconfirm title="Remove this link?" onConfirm={() => handleDelete(record.id)} okText="Yes" cancelText="No">
                    <Button type="text" size="small" danger icon={<DeleteOutlined />} loading={mutating === record.id} />
                </Popconfirm>
            ),
        },
    ];

    const searchColumns = [
        { title: 'Code', dataIndex: 'onetCode', width: 110, render: (c) => <Tag>{c}</Tag> },
        { title: 'Title', dataIndex: 'title', ellipsis: true },
        { title: 'Holland', dataIndex: 'hollandCode', width: 60, render: (c) => c ? <Tag color="purple">{c}</Tag> : '-' },
        {
            title: 'Outlook',
            dataIndex: 'brightOutlook',
            width: 75,
            render: (bright, record) => {
                if (bright) return <Tag color="green">Bright</Tag>;
                if (record.jobOutlook) return <Tag color="gold">{record.jobOutlook?.slice(0, 3)}</Tag>;
                return '—';
            },
        },
        {
            title: '',
            width: 70,
            render: (_, record) => (
                <Button
                    type="primary"
                    size="small"
                    icon={<PlusOutlined />}
                    onClick={() => handleAdd(record)}
                    loading={mutating === record.onetCode}
                >
                    Add
                </Button>
            ),
        },
    ];

    return (
        <Card
            size="small"
            title={
                <Space>
                    <LinkOutlined />
                    <span>O*NET Career Links</span>
                    <Tag color={links.length > 0 ? 'green' : 'default'}>{links.length} linked</Tag>
                </Space>
            }
        >
            <Space direction="vertical" size={12} style={{ width: '100%' }}>
                {derivedProfile && (
                    <Card size="small" style={{ background: '#f6ffed', borderColor: '#b7eb8f' }}>
                        <Row gutter={16} align="middle">
                            <Col flex="170px">
                                <RiasecRadar scores={derivedProfile.riasecScores} size={150} />
                            </Col>
                            <Col flex="auto">
                                <Space direction="vertical" size={6} style={{ width: '100%' }}>
                                    <Space wrap>
                                        <Statistic title="Holland Code" value={derivedProfile.hollandCode || '—'} valueStyle={{ fontSize: 20, fontWeight: 'bold' }} />
                                        <Statistic title="Confidence" value={`${derivedProfile.confidence || 0}%`} valueStyle={{ fontSize: 14 }} />
                                        <Tag color="green" style={{ fontSize: 11 }}>O*NET-Derived • Tier 1</Tag>
                                    </Space>
                                    <RiasecMiniBar scores={derivedProfile.riasecScores} />
                                    {onQuickPublish && (
                                        <div style={{ marginTop: 4 }}>
                                            {canQuickPublish ? (
                                                <Popconfirm
                                                    title="Approve this profile and publish program?"
                                                    description="The profile will be marked PUBLISHED, and the program will become visible to students."
                                                    okText="Approve & Publish"
                                                    cancelText="Cancel"
                                                    onConfirm={onQuickPublish}
                                                >
                                                    <Button type="primary" loading={quickPublishLoading}>
                                                        ✅ Approve Profile & Publish Program
                                                    </Button>
                                                </Popconfirm>
                                            ) : (
                                                <Tooltip title={quickPublishHint || 'Already published'}>
                                                    <Button disabled>
                                                        ✅ Approve Profile & Publish Program
                                                    </Button>
                                                </Tooltip>
                                            )}
                                        </div>
                                    )}
                                </Space>
                            </Col>
                        </Row>
                    </Card>
                )}

                {!derivedProfile && estimateResult && (
                    <Card size="small" style={{ background: '#f9f0ff', borderColor: '#d3adf7' }}>
                        <Row gutter={16} align="middle">
                            <Col flex="170px">
                                <RiasecRadar scores={estimateResult.riasecScores} size={150} />
                            </Col>
                            <Col flex="auto">
                                <Space direction="vertical" size={6} style={{ width: '100%' }}>
                                    <Space wrap>
                                        <Statistic title="Holland Code" value={estimateResult.hollandCode || '—'} valueStyle={{ fontSize: 20, fontWeight: 'bold', color: '#722ed1' }} />
                                        <Statistic title="Confidence" value={`${estimateResult.confidence || 0}%`} valueStyle={{ fontSize: 14 }} />
                                        <Tag color="purple" style={{ fontSize: 11 }}>AI-Estimated • Tier 2</Tag>
                                    </Space>
                                    <RiasecMiniBar scores={estimateResult.riasecScores} />
                                    {onQuickPublish && (
                                        <div style={{ marginTop: 4 }}>
                                            {canQuickPublish ? (
                                                <Popconfirm
                                                    title="Approve this profile and publish program?"
                                                    description="The Tier 2 profile will be saved as PUBLISHED, and the program will become visible to students."
                                                    okText="Approve & Publish"
                                                    cancelText="Cancel"
                                                    onConfirm={onQuickPublish}
                                                >
                                                    <Button type="primary" loading={quickPublishLoading}>
                                                        ✅ Approve Profile & Publish Program
                                                    </Button>
                                                </Popconfirm>
                                            ) : (
                                                <Tooltip title={quickPublishHint || 'Already published'}>
                                                    <Button disabled>
                                                        ✅ Approve Profile & Publish Program
                                                    </Button>
                                                </Tooltip>
                                            )}
                                        </div>
                                    )}
                                </Space>
                            </Col>
                        </Row>
                    </Card>
                )}

                <Table
                    dataSource={links}
                    columns={linkColumns}
                    rowKey="id"
                    size="small"
                    pagination={false}
                    loading={loading}
                    locale={{ emptyText: 'No O*NET occupations linked. Search and add below.' }}
                />

                <Card size="small" title={<><SearchOutlined /> Find O*NET Occupations</>} style={{ borderStyle: 'dashed' }}>
                    <div style={{ marginBottom: 10 }}>
                        <Button
                            type="primary"
                            ghost
                            icon={<ThunderboltOutlined />}
                            onClick={handleAutoSuggest}
                            loading={autoSuggesting}
                            block
                        >
                            Auto-Suggest from {program?.focusArea || program?.name || 'Program Info'}
                        </Button>
                        <Typography.Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 4 }}>
                            Uses program name, focus area, and key courses to suggest matching occupations.
                        </Typography.Text>
                    </div>
                    <Space.Compact style={{ width: '100%', marginBottom: searchResults.length ? 8 : 0 }}>
                        <Input
                            placeholder="Or search manually: Software Developer, Data Analyst..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onPressEnter={handleSearch}
                            allowClear
                        />
                        <Button icon={<SearchOutlined />} onClick={handleSearch} loading={searching}>
                            Search
                        </Button>
                    </Space.Compact>

                    {searchResults.length > 0 && (
                        <Table
                            dataSource={searchResults}
                            columns={searchColumns}
                            rowKey="onetCode"
                            size="small"
                            pagination={{ pageSize: 5, size: 'small' }}
                        />
                    )}
                </Card>
            </Space>
        </Card>
    );
}
