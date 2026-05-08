import { App as AntApp, ConfigProvider } from 'antd';

const adminTheme = {
    token: {
        colorPrimary: '#0ea5e9',
        borderRadius: 14,
        fontFamily: "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif",
    },
};

export function AdminUiProvider({ children }) {
    return (
        <ConfigProvider theme={adminTheme}>
            <AntApp>{children}</AntApp>
        </ConfigProvider>
    );
}
