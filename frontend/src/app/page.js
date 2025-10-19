import { Suspense } from 'react';
import PaymentHandler from './components/PaymentHandler';

export const metadata = {
  title: 'Minha Loja - Mercado Pago',
  description: 'Checkout integrado com Mercado Pago',
}

export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-purple-50 to-pink-50">
      <Suspense fallback={
        <div className="text-center max-w-md mx-auto p-8 bg-white rounded-2xl shadow-xl">
          <div className="animate-spin text-6xl mb-4">⏳</div>
          <h1 className="text-2xl font-bold mb-4 text-purple-900">
            Carregando...
          </h1>
          <p className="text-gray-600">
            Preparando sua experiência de pagamento.
          </p>
        </div>
      }>
        <PaymentHandler />
      </Suspense>
    </main>
  );
}
