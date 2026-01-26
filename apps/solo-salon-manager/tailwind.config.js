/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                primary: '#db2777', // Premium Pink (Pink-600)
                secondary: '#fce7f3', // Soft Pink (Pink-100)
                accent: '#831843', // Deep Rose (Pink-900)
                text: '#1f2937', // Dark Gray (Gray-800)
                background: '#fff1f2', // Rose Tint (Rose-50)
            },
            fontFamily: {
                sans: ['Pretendard', 'sans-serif'],
            },
        },
    },
    plugins: [],
}
