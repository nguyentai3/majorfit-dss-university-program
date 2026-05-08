import { useState } from 'react';
import { Alert, Button, Modal, Space, Table, Tag, Typography, Upload } from 'antd';
import DownloadOutlined from '@ant-design/icons/DownloadOutlined';
import InboxOutlined from '@ant-design/icons/InboxOutlined';
import { bulkImportPrograms, getBulkImportTemplateUrl } from '@frontend/api/services/admin';
import { getApiErrorMessage } from '@frontend/api/api';

const { Dragger } = Upload;
const { Text } = Typography;

export function BulkImportModal({ open, onClose, onSuccess }) {
    const [file, setFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [result, setResult] = useState(null);

    const handleUpload = async () => {
        if (!file) return;
        setUploading(true);
        setResult(null);
        try {
            const data = await bulkImportPrograms(file);
            setResult(data);
            if (data.created > 0 || data.updated > 0) {
                onSuccess?.();
            }
        } catch (err) {
            setResult({ error: getApiErrorMessage(err, 'Upload failed') });
        } finally {
            setUploading(false);
        }
    };

    const handleClose = () => {
        setFile(null);
        setResult(null);
        onClose();
    };

    const errorColumns = [
        { title: 'Row', dataIndex: 'row', width: 60 },
        { title: 'Error', dataIndex: 'error', ellipsis: true },
    ];

    return (
        <Modal
            title="Bulk Import Programs from Excel"
            open={open}
            onCancel={handleClose}
            width={640}
            footer={[
                <Button key="template" icon={<DownloadOutlined />} href={getBulkImportTemplateUrl()} target="_blank">
                    Download Template
                </Button>,
                <Button key="cancel" onClick={handleClose}>
                    Close
                </Button>,
                <Button key="upload" type="primary" onClick={handleUpload} loading={uploading} disabled={!file}>
                    Import
                </Button>,
            ]}
        >
            <Space direction="vertical" size={16} style={{ width: '100%' }}>
                <Alert
                    type="info"
                    showIcon
                    message="Upload an Excel (.xlsx) file to create DRAFT programs in bulk."
                    description={
                        <ul style={{ margin: '4px 0 0', paddingLeft: 16 }}>
                            <li>Required columns: <Text code>university_code</Text>, <Text code>code</Text>, <Text code>name</Text></li>
                            <li>Optional: <Text code>degreeLevel</Text>, <Text code>department</Text>, <Text code>focusArea</Text>, <Text code>summary</Text>, <Text code>sourceUrl</Text>, <Text code>durationYears</Text>, <Text code>keyCourses</Text> (semicolon-separated), <Text code>courseSourceUrl</Text></li>
                            <li>Curriculum: <Text code>curriculumText</Text> — full course list (semicolon-separated). If provided, a curriculum record will be auto-created so programs are ready for <Text strong>AI Analysis</Text></li>
                            <li>Objectives: <Text code>objectives</Text> — program objectives/goals (semicolon-separated)</li>
                            <li>All imported programs will be created as <Tag color="orange">DRAFT</Tag></li>
                            <li>Existing DRAFTs with the same code will be updated</li>
                        </ul>
                    }
                />

                <Dragger
                    accept=".xlsx,.xls"
                    maxCount={1}
                    beforeUpload={(f) => {
                        setFile(f);
                        setResult(null);
                        return false;
                    }}
                    onRemove={() => {
                        setFile(null);
                        setResult(null);
                    }}
                    fileList={file ? [file] : []}
                >
                    <p className="ant-upload-drag-icon"><InboxOutlined /></p>
                    <p className="ant-upload-text">Click or drag Excel file here</p>
                    <p className="ant-upload-hint">.xlsx or .xls files up to 10MB</p>
                </Dragger>

                {result && !result.error && (
                    <Alert
                        type={result.errors?.length > 0 ? 'warning' : 'success'}
                        showIcon
                        message={`Processed ${result.totalRows} rows`}
                        description={
                            <Space direction="vertical" size={4}>
                                <div>
                                    <Tag color="green">{result.created} created</Tag>
                                    <Tag color="blue">{result.updated} updated</Tag>
                                    <Tag color="default">{result.skipped} skipped</Tag>
                                    {result.curriculumsCreated > 0 && (
                                        <Tag color="cyan">{result.curriculumsCreated} curricula attached</Tag>
                                    )}
                                </div>
                                {result.errors?.length > 0 && (
                                    <Table
                                        dataSource={result.errors}
                                        columns={errorColumns}
                                        rowKey="row"
                                        size="small"
                                        pagination={{ pageSize: 5, size: 'small' }}
                                        style={{ marginTop: 8 }}
                                    />
                                )}
                            </Space>
                        }
                    />
                )}

                {result?.error && (
                    <Alert type="error" showIcon message={result.error} />
                )}
            </Space>
        </Modal>
    );
}
