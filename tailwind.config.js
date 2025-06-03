/** @type {import('tailwindcss').Config} */
export default {
        content: [
                './index.html',
                './src/**/*.{js,ts,jsx,tsx,vue}', // Adjusted to include vue if someone uses it later
        ],
        theme: {
                extend: {},
        },
        plugins: [],
};
