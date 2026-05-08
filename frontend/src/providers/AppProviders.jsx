import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { queryClient } from '@frontend/api/queryClient';
import { AuthProvider } from '@frontend/contexts/AuthContext';

export function AppProviders({ children }) {
    return (
        <QueryClientProvider client={queryClient}>
            <AuthProvider>
                {children}
                <Toaster
                    position="top-right"
                    toastOptions={{
                        style: {
                            background: '#1F2937',
                            color: '#F9FAFB',
                            border: '1px solid #374151',
                        },
                    }}
                />
            </AuthProvider>
        </QueryClientProvider>
    );
}
