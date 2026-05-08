import { useEffect } from 'react';
import Hero from '@frontend/features/web/components/Hero';
import FeaturedPrograms from '@frontend/features/web/components/FeaturedPrograms';
import FeatureCards from '@frontend/features/web/components/FeatureCards';

export default function Home() {
    useEffect(() => {
        document.body.classList.add('home-light');
        return () => {
            document.body.classList.remove('home-light');
        };
    }, []);

    return (
        <main className="relative min-h-screen" style={{ background: '#ffffff' }}>
            <Hero />
            <FeaturedPrograms />
            <FeatureCards />
        </main>
    );
}
