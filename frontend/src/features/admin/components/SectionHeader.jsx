import { Typography } from 'antd';

export function SectionHeader({ title, description, extra }) {
    return (
        <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
            <div>
                <Typography.Title level={4} style={{ marginBottom: 4 }}>
                    {title}
                </Typography.Title>
                {description ? (
                    <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
                        {description}
                    </Typography.Paragraph>
                ) : null}
            </div>
            {extra}
        </div>
    );
}
