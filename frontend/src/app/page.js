'use client';
export const dynamic = 'force-dynamic';
import { useSearchParams } from 'next/navigation';
import { useEffect } from 'react';

export default function Home() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const uid = searchParams.get('uid');
    
    if (uid) {
      // Redirecionar imediatamente para pagamento
      const startPayment = async () => {
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
            window.location.replace(data.init_point);
          } else {
            throw new Error('URL de pagamento não recebida');
          }
        } catch (error) {
          console.error('Erro ao processar pagamento:', error);
          // Mostrar mensagem de erro apenas se falhar
          document.body.innerHTML = `
            <div style="display: flex; min-height: 100vh; align-items: center; justify-content: center; background: linear-gradient(135deg, #fef7ff, #fdf2f8); font-family: system-ui;">
              <div style="text-align: center; max-width: 400px; padding: 2rem; background: white; border-radius: 1rem; box-shadow: 0 10px 25px rgba(0,0,0,0.1);">
                <div style="font-size: 3rem; margin-bottom: 1rem;">⚠️</div>
                <h1 style="color: #be123c; margin-bottom: 1rem;">Erro no Pagamento</h1>
                <p style="color: #6b7280; margin-bottom: 1.5rem;">Não foi possível processar seu pagamento. Tente novamente.</p>
                <button onclick="location.reload()" style="background: #be123c; color: white; padding: 0.75rem 2rem; border: none; border-radius: 0.5rem; cursor: pointer;">Tentar Novamente</button>
              </div>
            </div>
          `;
        }
      };
      
      startPayment();
    }
  }, [searchParams]);

  // Tela de carregamento padrão ou sem UID
  const uid = searchParams.get('uid');
  
  if (!uid) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-purple-50 to-pink-50">
        <div className="text-center max-w-md mx-auto p-8 bg-white rounded-2xl shadow-xl">
          <div className="text-6xl mb-4">⚠️</div>
          <h1 className="text-3xl font-bold mb-4 text-red-600">
            Teste Não Encontrado
          </h1>
          <p className="text-gray-600 mb-6">
            Nenhum teste foi encontrado. Por favor, complete o teste primeiro.
          </p>
          <div className="bg-red-50 p-4 rounded-lg">
            <p className="text-sm text-red-600">
              Esta página requer um código de identificação válido.
            </p>
          </div>
        </div>
      </main>
    );
  }

  // Tela de redirecionamento (mínima)
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-purple-50 to-pink-50">
      <div className="text-center max-w-md mx-auto p-8 bg-white rounded-2xl shadow-xl">
        <div className="animate-spin text-6xl mb-4">🔄</div>
        <h1 className="text-2xl font-bold mb-4 text-purple-900">
          Redirecionando...
        </h1>
        <p className="text-gray-600 mb-4">
          Aguarde, você será redirecionado para o pagamento.
        </p>
        <div className="bg-purple-50 p-3 rounded-lg">
          <p className="text-xs text-purple-700">
            ID: <span className="font-mono font-bold">{uid}</span>
          </p>
        </div>
      </div>
    </main>
  );
}
