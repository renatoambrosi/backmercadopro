'use client';
export const dynamic = 'force-dynamic';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';

function PendingContent() {
  const searchParams = useSearchParams();
  const [uid, setUid] = useState('');
  const [checkCount, setCheckCount] = useState(0);
  const [status, setStatus] = useState('pending');
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    const uidParam = searchParams.get('uid');
    if (uidParam) {
      setUid(uidParam);
    }
  }, [searchParams]);

  const checkPaymentStatus = async () => {
    if (!uid) return;
    
    setIsChecking(true);
    try {
      // Tentar diferentes formatos de external_reference
      const possibleReferences = [
        uid,
        `${uid}-${Date.now()}`
      ];

      for (const ref of possibleReferences) {
        try {
          const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/payment-status/${ref}`);
          const data = await response.json();
          
          if (data.status && data.status !== 'pending') {
            setStatus(data.status);
            
            if (data.status === 'approved') {
              console.log('Pagamento aprovado! Redirecionando...');
              window.location.href = `https://www.suellenseragi.com.br/resultado1?uid=${uid}`;
              return;
            }
            
            if (data.status === 'rejected') {
              console.log('Pagamento rejeitado.');
              window.location.href = `${process.env.NEXT_PUBLIC_BACKEND_URL}/failure?uid=${uid}`;
              return;
            }
          }
        } catch (err) {
          console.log(`Tentativa com referência ${ref} falhou:`, err.message);
          continue;
        }
      }
      
      setCheckCount(prev => prev + 1);
    } catch (error) {
      console.error('Erro ao verificar status:', error);
    } finally {
      setIsChecking(false);
    }
  };

  // Polling a cada 3 segundos
  useEffect(() => {
    if (!uid) return;

    checkPaymentStatus();

    const interval = setInterval(() => {
      checkPaymentStatus();
    }, 3000);

    const timeout = setTimeout(() => {
      clearInterval(interval);
      console.log('Timeout atingido para verificação de pagamento');
    }, 300000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [uid]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-yellow-50 to-orange-50">
      <div className="text-center max-w-md mx-auto p-8 bg-white rounded-2xl shadow-xl">
        <div className="text-6xl mb-4">
          {isChecking ? '🔍' : '⏳'}
        </div>
        <h1 className="text-3xl font-bold text-yellow-600 mb-4">
          Aguardando Pagamento
        </h1>
        <p className="text-gray-600 mb-6">
          {status === 'pending' 
            ? 'Estamos verificando seu pagamento...' 
            : `Status: ${status}`}
        </p>
        
        <div className="bg-yellow-50 p-4 rounded-lg mb-6">
          <p className="text-sm text-yellow-800 mb-2">
            {status === 'pending' 
              ? 'Para pagamentos PIX, a aprovação é quase instantânea.'
              : 'Processando pagamento...'}
          </p>
          <div className="flex items-center justify-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${isChecking ? 'bg-green-500' : 'bg-gray-300'} animate-pulse`}></div>
            <span className="text-xs text-gray-600">
              Verificação #{checkCount} {isChecking && '(verificando...)'}
            </span>
          </div>
        </div>
        
        <div className="bg-gray-50 p-3 rounded-lg mb-4">
          <p className="text-xs text-gray-500">
            ID: <span className="font-mono font-bold">{uid}</span>
          </p>
        </div>

        <p className="text-xs text-gray-400">
          Esta página verifica automaticamente o status do seu pagamento a cada 3 segundos.
        </p>
      </div>
    </main>
  );
}

export default function Pending() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin text-4xl">⏳</div>
      </div>
    }>
      <PendingContent />
    </Suspense>
  );
}
