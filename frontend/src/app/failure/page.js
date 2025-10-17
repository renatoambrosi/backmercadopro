'use client';

export const dynamic = 'force-dynamic';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';

function FailureContent() {
  const searchParams = useSearchParams();
  const [uid, setUid] = useState('');

  useEffect(() => {
    const uidParam = searchParams.get('uid');
    if (uidParam) {
      setUid(uidParam);
    }
  }, [searchParams]);

  const tryAgain = () => {
    window.location.href = `/?uid=${uid}`;
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-red-50 to-orange-50">
      <div className="text-center max-w-md mx-auto p-8 bg-white rounded-2xl shadow-xl">
        <div className="text-6xl mb-4">❌</div>
        <h1 className="text-3xl font-bold text-red-600 mb-4">
          Pagamento Não Aprovado
        </h1>
        <p className="text-gray-600 mb-6">
          Seu pagamento não foi processado. Tente novamente ou use outro método de pagamento.
        </p>
        
        {uid && (
          <button
            onClick={tryAgain}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold py-4 px-8 rounded-full transition-all transform hover:scale-105"
          >
            Tentar Novamente
          </button>
        )}
        
        <p className="text-xs text-gray-500 mt-4">
          Precisa de ajuda? Entre em contato com o suporte.
        </p>
      </div>
    </main>
  );
}

export default function Failure() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center">Carregando...</div>}>
      <FailureContent />
    </Suspense>
  );
}
