import { Button } from 'antd';
import { NavLink, Outlet, useNavigate, useLocation, matchPath } from 'react-router-dom';
import HomeOutlined from '@ant-design/icons/HomeOutlined';
import LogoutOutlined from '@ant-design/icons/LogoutOutlined';
import { APP_ROUTES } from '@frontend/constants/routes';
import { useAuth } from '@frontend/contexts/AuthContext';
import { ADMIN_SECTIONS } from '@frontend/features/admin/config/navigation';

export function AdminLayout() {
    const { adminUser, signOutAdmin } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const analyzeMatch = matchPath('/admin/programs/:programId/analyze', location.pathname);
    const activeProgramId = analyzeMatch?.params?.programId;

    return (
        <div className="min-h-screen bg-[#edf2f7]">
            <header className="h-14 px-4 lg:px-6 bg-[#1f3f62] text-white flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-3">
                    <div className="text-base font-semibold tracking-wide">Career Guidance</div>
                    <span className="text-xs text-slate-200 hidden sm:inline">Admin Console</span>
                </div>
                <div className="flex items-center gap-2 sm:gap-3">
                    <span className="text-sm text-slate-100 hidden sm:inline">
                        Admin: {adminUser?.email || adminUser?.username || 'admin'}
                        {adminUser?.adminRole ? ` (${adminUser.adminRole})` : ''}
                    </span>
                    <Button
                        size="small"
                        type="text"
                        icon={<HomeOutlined />}
                        className="!text-white hover:!text-white hover:!bg-white/10"
                        onClick={() => navigate('/')}
                    >
                        Main Site
                    </Button>
                    <Button
                        size="small"
                        type="text"
                        icon={<LogoutOutlined />}
                        className="!text-white hover:!text-white hover:!bg-white/10"
                        onClick={async () => {
                            await signOutAdmin();
                            navigate(APP_ROUTES.ADMIN_SIGN_IN, { replace: true });
                        }}
                    >
                        Logout
                    </Button>
                </div>
            </header>

            <div className="min-h-[calc(100vh-56px)] flex">
                <aside className="hidden md:block w-[260px] bg-[#173a5c] text-slate-100">
                    <div className="px-4 py-3 border-b border-white/15 text-sm font-semibold">Career Guidance</div>
                    <nav className="py-3 space-y-3">
                        {ADMIN_SECTIONS.map((section) => (
                            <div key={section.title}>
                                <div className="px-4 mb-2 text-[11px] tracking-wider text-slate-300/80 font-semibold">
                                    {section.title}
                                </div>
                                <div className="space-y-1 px-2">
                                    {section.items.map((item) => (
                                        <div key={item.key}>
                                            <NavLink
                                                to={`/admin/${item.key}`}
                                                end={item.key === 'dashboard'}
                                                className={({ isActive }) =>
                                                    `w-full text-left px-3 py-2 rounded-md text-sm flex items-center gap-2 transition no-underline ${
                                                        isActive
                                                            ? 'bg-[#245b90] text-white'
                                                            : 'text-slate-100/90 hover:bg-white/10'
                                                    }`
                                                }
                                            >
                                                {item.icon}
                                                <span>{item.label}</span>
                                            </NavLink>

                                            {item.children && (
                                                <div className="mt-1 space-y-1 pl-4 border-l border-white/10 ml-4">
                                                    {item.children.map((child) => {
                                                        let to = `/admin/${child.key}`;
                                                        if (child.key === 'analyze') {
                                                            to = activeProgramId 
                                                                ? `/admin/programs/${activeProgramId}/analyze`
                                                                : `/admin/programs`;
                                                        }

                                                        return (
                                                            <NavLink
                                                                key={child.key}
                                                                to={to}
                                                                className={({ isActive }) => {
                                                                    const childIsActive = child.key === 'analyze'
                                                                        ? Boolean(activeProgramId)
                                                                        : isActive;

                                                                    return `w-full text-left px-3 py-1.5 rounded-md text-[13px] flex items-center gap-2 transition no-underline ${
                                                                        childIsActive
                                                                            ? 'bg-[#245b90]/60 text-white font-medium'
                                                                            : 'text-slate-300/80 hover:bg-white/5 hover:text-white'
                                                                    }`;
                                                                }}
                                                            >
                                                                <span className="opacity-70">{child.icon}</span>
                                                                <span>{child.label}</span>
                                                            </NavLink>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </nav>
                </aside>

                <main className="flex-1 p-3 md:p-5 overflow-auto">
                    <div className="md:hidden mb-3 overflow-x-auto">
                        <div className="flex gap-2 min-w-max">
                            {ADMIN_SECTIONS.flatMap((s) => s.items).map((item) => (
                                <div key={item.key} className="flex gap-2">
                                    <NavLink
                                        to={`/admin/${item.key}`}
                                        end={item.key === 'dashboard'}
                                        className={({ isActive }) =>
                                            `px-3 py-2 rounded-md text-sm border no-underline ${
                                                isActive
                                                    ? 'bg-[#1f3f62] text-white border-[#1f3f62]'
                                                    : 'bg-white text-slate-700 border-slate-300'
                                            }`
                                        }
                                    >
                                        {item.label}
                                    </NavLink>
                                    {item.children?.map(child => {
                                        let to = `/admin/${child.key}`;
                                        if (child.key === 'analyze') {
                                            to = activeProgramId 
                                                ? `/admin/programs/${activeProgramId}/analyze`
                                                : `/admin/programs`;
                                        }
                                        return (
                                            <NavLink
                                                key={child.key}
                                                to={to}
                                                className={({ isActive }) => {
                                                    const childIsActive = child.key === 'analyze'
                                                        ? Boolean(activeProgramId)
                                                        : isActive;

                                                    return `px-3 py-2 rounded-md text-sm border no-underline ${
                                                        childIsActive
                                                            ? 'bg-[#1f3f62]/80 text-white border-[#1f3f62]'
                                                            : 'bg-white text-slate-700 border-slate-300 opacity-80'
                                                    }`;
                                                }}
                                            >
                                                {child.label}
                                            </NavLink>
                                        );
                                    })}
                                </div>
                            ))}
                        </div>
                    </div>

                    <Outlet />
                </main>
            </div>
        </div>
    );
}
