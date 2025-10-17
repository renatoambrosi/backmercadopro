import CheckoutButton from '@/components/CheckoutButton';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-8">Minha Loja</h1>
        <p className="mb-8 text-gray-600">Produto Teste - R$ 100,00</p>
        <CheckoutButton />
      </div>
    </main>
  );
}
