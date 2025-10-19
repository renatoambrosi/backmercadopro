'use client';
import { useState } from 'react';

export default function PaymentHandler() {
  const [loading, setLoading] = useState(false);

  const startPayment = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/create_preference`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      
      const data = await response.json();
      if (data.init_point) {
        window.location.href = data.init_point;
      }
    } catch (error) {
      console.error('Erro:', error);
      setLoading(false);
    }
  };

  return (
    <div className="text-center max-w-md mx-auto p-8 bg-white rounded-2xl shadow-xl">
      <h1 className="text-2xl font-bold mb-4">Teste MercadoPago</h1>
      <button
        onClick={startPayment}
        disabled={loading}
        className="bg-blue-600 text-white px-6 py-3 rounded-lg disabled:opacity-50"
      >
        {loading ? 'Carregando...' : 'Pagar R$ 19,00'}
      </button>
    </div>
  );
}
