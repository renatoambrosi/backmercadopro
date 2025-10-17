// CheckoutButton.jsx - Componente React
import { useState } from 'react';

export default function CheckoutButton() {
  const [loading, setLoading] = useState(false);

  const handleCheckout = async () => {
    setLoading(true);
    
    try {
      // Dados do produto
      const productData = {
        title: 'Produto Teste',
        quantity: 1,
        price: 100.00
      };

      // Chamar seu backend
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/create_preference`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(productData),
      });

      const data = await response.json();
      
      if (data.init_point) {
        // Redirecionar para o Checkout Pro
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
    <button
      onClick={handleCheckout}
      disabled={loading}
      className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
    >
      {loading ? 'Processando...' : 'Pagar com Mercado Pago'}
    </button>
  );
}
