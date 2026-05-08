import { Card, Col, Row, Typography } from 'antd';
import { buildHollandCode } from '@frontend/utils/riasec';

export function ProgramSnapshotCard({ program }) {
    const onetLinkCount = program.onetLinks?.length || 0;
    return (
        <Card size="small" title="Program Snapshot">
            <Row gutter={[16, 16]}>
                <Col xs={24} md={12}>
                    <Typography.Text strong>{program.name}</Typography.Text>
                    <div>{program.university?.name}</div>
                    <div>{[program.focusArea, program.department].filter(Boolean).join(' • ')}</div>
                </Col>
                <Col xs={24} md={12}>
                    <div>Published RIASEC: {buildHollandCode(program?.latestProfile?.riasecScores) || '-'}</div>
                    <div>O*NET links: {onetLinkCount}</div>
                    <div>Curriculum versions: {program.curriculums?.length || 0}</div>
                </Col>
            </Row>
        </Card>
    );
}
