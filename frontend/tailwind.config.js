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
            },
            boxShadow: {
                soft: '0 10px 30px rgba(2, 6, 23, 0.12)',
            },
        },
    },
    plugins: [],
};
