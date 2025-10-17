'use client';
import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [uid, setUid] = useState('');
  const searchParams = useSearchParams();

  useEffect(() => {
    // Captura o UID da URL
    const uidParam = searchParams.get('uid');
    if (uidParam) {
      setUid(uidParam);
    }
  }, [searchParams]);

  const pagar = async () => {
    if (!uid) {
      alert('UID não encontrado. Refaça o teste.');
      return;
    }

    setLoading(true);
    
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/create_preference`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Teste de Prosperidade - Resultado Completo',
          quantity: 1,
          price: 97.00, // Ajuste o valor conforme necessário
          uid: uid // Envia o UID para o backend
        }),
      });

      const data = await response.json();
      
      if (data.init_point) {
        window.location.href = data.init_point;
      } else {
        alert('Erro ao criar preferência de pagamento');
      }
    } catch (error) {
      console.error('Erro:', error);
      alert('Erro ao processar pagamento');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-purple-50 to-pink-50">
      <div className="text-center max-w-md mx-auto p-8 bg-white rounded-2xl shadow-xl">
        <h1 className="text-3xl font-bold mb-4 text-purple-900">
          🌟 Teste de Prosperidade
        </h1>
        <p className="text-gray-600 mb-6">
          Desbloqueie seu resultado completo e descubra seu potencial de prosperidade!
        </p>
        
        {uid ? (
          <>
            <div className="bg-purple-50 p-4 rounded-lg mb-6">
              <p className="text-sm text-purple-700">
                Identificação: <span className="font-mono font-bold">{uid}</span>
              </p>
            </div>
            
            <button
              onClick={pagar}
              disabled={loading}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold py-4 px-8 rounded-full transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
            >
              {loading ? 'Processando...' : 'Acessar Resultado Completo - R$ 97,00'}
            </button>
            
            <p className="text-xs text-gray-500 mt-4">
              Pagamento seguro via Mercado Pago
            </p>
          </>
        ) : (
          <div className="bg-red-50 p-4 rounded-lg">
            <p className="text-red-600">
              ⚠️ Nenhum teste encontrado. Por favor, complete o teste primeiro.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
