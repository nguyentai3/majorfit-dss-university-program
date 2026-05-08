import AppstoreOutlined from '@ant-design/icons/AppstoreOutlined';
import BarChartOutlined from '@ant-design/icons/BarChartOutlined';
import DatabaseOutlined from '@ant-design/icons/DatabaseOutlined';
import HomeOutlined from '@ant-design/icons/HomeOutlined';
import QuestionCircleOutlined from '@ant-design/icons/QuestionCircleOutlined';
import UserOutlined from '@ant-design/icons/UserOutlined';

export const ADMIN_SECTIONS = [
    {
        title: 'OVERVIEW',
        items: [{ key: 'dashboard', label: 'Dashboard', icon: <AppstoreOutlined /> }],
    },
    {
        title: 'ASSESSMENT',
        items: [
            { key: 'questions', label: 'Question Bank', icon: <QuestionCircleOutlined /> },
        ],
    },
    {
        title: 'USER MANAGEMENT',
        items: [{ key: 'users', label: 'Users', icon: <UserOutlined /> }],
    },
    {
        title: 'ANALYTICS',
        items: [
            { key: 'evaluation', label: 'User Feedback', icon: <BarChartOutlined /> },
        ],
    },
    {
        title: 'CAREER DATA',
        items: [
            { key: 'universities', label: 'Universities', icon: <HomeOutlined /> },
            { 
                key: 'programs', 
                label: 'Programs', 
                icon: <DatabaseOutlined />,
                children: [
                    { key: 'analyze', label: 'Analyze', icon: <BarChartOutlined /> }
                ]
            },
        ],
    },
];

export const ADMIN_SECTION_META = {
    dashboard: {
        title: 'Dashboard',
        description: 'Platform overview and usage analytics.',
    },
    questions: {
        title: 'Assessment - Question Bank',
        description: 'Manage the RIASEC assessment question bank.',
    },
    users: {
        title: 'User Management',
        description: 'Review user accounts and platform access.',
    },
    universities: {
        title: 'University Management',
        description: 'Manage Step 2 university sources for curriculum analysis.',
    },
    programs: {
        title: 'Program Management',
        description: 'Manage curriculum-backed programs, prompts, and published program profiles.',
    },
    evaluation: {
        title: 'User Feedback',
        description: 'Aggregated user ratings and relevance feedback on matching results.',
    },
};
