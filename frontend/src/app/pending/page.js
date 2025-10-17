'use client';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';

function PendingContent() {
  const searchParams = useSearchParams();
  const [uid, setUid] = useState('');

  useEffect(() => {
    const uidParam = searchParams.get('uid');
    if (uidParam) {
      setUid(uidParam);
    }
  }, [searchParams]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-yellow-50 to-orange-50">
      <div className="text-center max-w-md mx-auto p-8 bg-white rounded-2xl shadow-xl">
        <div className="text-6xl mb-4">⏳</div>
        <h1 className="text-3xl font-bold text-yellow-600 mb-4">
          Pagamento Pendente
        </h1>
        <p className="text-gray-600 mb-6">
          Seu pagamento está sendo processado. Você receberá um email de confirmação em breve.
        </p>
        
        <div className="bg-yellow-50 p-4 rounded-lg mb-6">
          <p className="text-sm text-yellow-800">
            Assim que o pagamento for aprovado, você receberá acesso ao resultado completo.
          </p>
        </div>
        
        <p className="text-xs text-gray-500">
          Identificação: <span className="font-mono font-bold">{uid}</span>
        </p>
      </div>
    </main>
  );
}
