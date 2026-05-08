import React, { useEffect, useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function DemoModeBanner() {
    const [isVisible, setIsVisible] = useState(true);
    const [isDemoMode, setIsDemoMode] = useState(false);

    useEffect(() => {
        const demoFlag = import.meta.env.VITE_DEMO_MODE === 'true';
        setIsDemoMode(demoFlag);
    }, []);

    const show = isDemoMode && isVisible;

    return (
        <AnimatePresence>
            {show && (
                <motion.div
                    key="demo-banner"
                    initial={{ opacity: 0, y: -50 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -50 }}
                    className="fixed top-0 left-0 right-0 z-[100] bg-gradient-to-r from-yellow-500/90 to-orange-500/90 backdrop-blur-sm border-b border-yellow-400/20"
                >
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="flex items-center justify-between py-3">
                            <div className="flex items-center space-x-3">
                                <AlertTriangle className="w-5 h-5 text-yellow-900" />
                                <div className="text-sm font-medium text-yellow-900">
                                    <span className="font-bold">Demo Mode:</span>
                                    {' '}
                                    You are running in demo mode. Some features may behave differently.
                                </div>
                            </div>
                            <button
                                onClick={() => setIsVisible(false)}
                                className="text-yellow-900 hover:text-yellow-800 transition-colors"
                                aria-label="Dismiss banner"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
