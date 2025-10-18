'use client';
export const dynamic = 'force-dynamic';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function HomeContent() {
  const [loading, setLoading] = useState(false);
  const [uid, setUid] = useState('');
  const searchParams = useSearchParams();

  useEffect(() => {
    const uidParam = searchParams.get('uid');
    if (uidParam) {
      setUid(uidParam);
    }
  }, [searchParams]);
  
  // Auto-redirecionamento ao detectar UID
  useEffect(() => {
    if (uid) {
      const startPayment = async () => {
        setLoading(true);
        try {
          const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/create_preference`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: 'Teste de Prosperidade - Resultado Completo',
              quantity: 1,
              price: 19.00,
              uid: uid
            }),
          });
          const data = await response.json();
          if (data.init_point) {
            window.location.href = data.init_point;
          }
        } catch (error) {
          alert('Erro ao processar pagamento');
        } finally {
          setLoading(false);
        }
      };
      startPayment();
    }
  }, [uid]);

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
            <p className="text-xs text-gray-500 mt-4">
              Pagamento seguro via Mercado Pago
            </p>
            {loading && (
              <div className="mt-4 text-purple-700">Redirecionando para pagamento...</div>
            )}
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

export default function Home() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center">Carregando...</div>}>
      <HomeContent />
    </Suspense>
  );
}
