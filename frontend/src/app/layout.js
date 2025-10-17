export const metadata = {
  title: 'Minha Loja - Mercado Pago',
  description: 'Checkout integrado com Mercado Pago',
}

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  )
}
