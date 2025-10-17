'use client';
import { useState } from 'react';

export default function Home() {
  const [loading, setLoading] = useState(false);

  const pagar = async () => {
    setLoading(true);
    
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/create_preference`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Produto Teste',
          quantity: 1,
          price: 100.00
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

  return (
    <main className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-8">Minha Loja</h1>
        <button
          onClick={pagar}
          disabled={loading}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-4 px-8 rounded"
        >
          {loading ? 'Processando...' : 'Pagar R$ 100,00'}
        </button>
      </div>
    </main>
  );
}
```

---

### PASSO 3: Criar .env.local

Crie o arquivo `frontend/.env.local`:
```
NEXT_PUBLIC_BACKEND_URL=http://localhost:3001
