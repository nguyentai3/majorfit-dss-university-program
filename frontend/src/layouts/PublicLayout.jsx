import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from '@frontend/features/web/components/Navbar';
import Footer from '@frontend/features/web/components/Footer';
import DemoModeBanner from '@frontend/features/web/components/DemoModeBanner';
import { LanguageProvider } from '@frontend/features/web/contexts/LanguageContext';

function PublicLayoutContent() {
    return (
        <>
            <DemoModeBanner />
            <Navbar />
            <main>
                <Outlet />
            </main>
            <Footer />
        </>
    );
}

export function PublicLayout() {
    return (
        <LanguageProvider>
            <PublicLayoutContent />
        </LanguageProvider>
    );
}
