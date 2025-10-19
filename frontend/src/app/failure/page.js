'use client';

export const dynamic = 'force-dynamic';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';

function FailureContent() {
  const searchParams = useSearchParams();
  const [uid, setUid] = useState('');
  const [reason, setReason] = useState('');

  useEffect(() => {
    const uidParam = searchParams.get('uid');
    const reasonParam = searchParams.get('reason'); // opcional: você pode enviar ?reason=rejected|expired|other
    if (uidParam) setUid(uidParam);
    if (reasonParam) setReason(reasonParam);
  }, [searchParams]);

  const tryAgain = () => {
    if (!uid) return;
    window.location.href = `/?uid=${encodeURIComponent(uid)}`;
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-red-50 to-orange-50">
      <div className="text-center max-w-md mx-auto p-8 bg-white rounded-2xl shadow-xl">
        <div className="text-6xl mb-4">❌</div>
        <h1 className="text-3xl font-bold text-red-600 mb-4">
          Pagamento não aprovado
        </h1>

        <p className="text-gray-600 mb-4">
          {reason
            ? `Motivo: ${reason}`
            : 'Seu pagamento não foi processado. Tente novamente ou use outro método.'}
        </p>

        <div className="bg-red-50 p-4 rounded-lg mb-6">
          {uid ? (
            <p className="text-sm text-red-700">
              ID: <span className="font-mono font-bold">{uid}</span>
            </p>
          ) : (
            <p className="text-sm text-red-700">
              Não recebemos seu identificador. Refaça o processo a partir do teste.
            </p>
          )}
        </div>

        <button
          onClick={tryAgain}
          disabled={!uid}
          className={`w-full font-bold py-4 px-8 rounded-full transition-all transform ${
            uid
              ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white hover:scale-105'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          Tentar novamente
        </button>

        <p className="text-xs text-gray-500 mt-4">
          Precisa de ajuda? Contate o suporte informando o ID acima.
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
