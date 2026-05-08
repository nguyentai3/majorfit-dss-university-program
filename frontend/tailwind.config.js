export default {
    content: [
        './index.html',
        './src/**/*.{js,jsx,mdx}',
    ],
    theme: {
        extend: {
            colors: {
                'space-dark': '#0F172A',
                'space-darker': '#020617',
                'neon-cyan': '#38BDF8',
                'neon-pink': '#818CF8',
                'neon-purple': '#6D28D9',
                'glass-border': 'rgba(255, 255, 255, 0.1)',
                'glass-bg': 'rgba(255, 255, 255, 0.02)',
                brand: {
                    50: '#f0f9ff',
                    100: '#e0f2fe',
                    500: '#0ea5e9',
                    700: '#0369a1',
                    900: '#0c4a6e',
                },
            },
            animation: {
                float: 'float 6s ease-in-out infinite',
                'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                glow: 'glow 2s ease-in-out infinite alternate',
                'grid-move': 'grid-move 20s linear infinite',
                'line-flow': 'line-flow 8s ease-in-out infinite',
            },
            keyframes: {
                float: {
                    '0%, 100%': { transform: 'translateY(0px)' },
                    '50%': { transform: 'translateY(-20px)' },
                },
                glow: {
                    '0%': { boxShadow: '0 0 5px rgba(56, 189, 248, 0.4)' },
                    '100%': { boxShadow: '0 0 20px rgba(56, 189, 248, 0.7), 0 0 30px rgba(129, 140, 248, 0.3)' },
                },
                'grid-move': {
                    '0%': { transform: 'translateX(-50px) translateY(-50px)' },
                    '100%': { transform: 'translateX(0px) translateY(0px)' },
                },
                'line-flow': {
                    '0%, 100%': { strokeDashoffset: '0' },
                    '50%': { strokeDashoffset: '100' },
                },
            },
            backgroundImage: {
                'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
                'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
                'neon-gradient': 'linear-gradient(45deg, #38BDF8, #818CF8, #6D28D9)',
            },
            boxShadow: {
                soft: '0 10px 30px rgba(2, 6, 23, 0.12)',
            },
        },
    },
    plugins: [],
};
