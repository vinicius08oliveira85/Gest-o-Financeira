// Apenas autoprefixer. O Tailwind é processado pelo plugin @tailwindcss/vite.
// Incluir o plugin tailwindcss aqui causaria erro "@layer base" ao processar o CSS já gerado.
export default {
  plugins: {
    autoprefixer: {},
  },
};
