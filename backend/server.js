import express from 'express';
import { MercadoPagoConfig, Preference } from 'mercadopago';
import cors from 'cors';
import dotenv from 'dotenv';
dotenv.config();

const app = express();

// Configuração MercadoPago com Client ID + Client Secret
const client = new MercadoPagoConfig({
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN,
  options: {
    clientId: process.env.MERCADOPAGO_CLIENT_ID,
    clientSecret: process.env.MERCADOPAGO_CLIENT_SECRET,
  }
});

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({
    status: 'Backend teste MercadoPago com Client ID/Secret',
    timestamp: new Date().toISOString(),
  });
});

// Endpoint básico Checkout Pro
app.post('/create_preference', async (req, res) => {
  try {
    const preference = new Preference(client);
    
    const body = {
      items: [
        {
          title: 'Produto Teste',
          quantity: 1,
          unit_price: 19.00,
          currency_id: 'BRL',
        },
      ],
      back_urls: {
        success: 'https://backmercadopro.vercel.app/success',
        failure: 'https://backmercadopro.vercel.app/failure',
        pending: 'https://backmercadopro.vercel.app/pending',
      },
      auto_return: 'approved',
    };

    const result = await preference.create({ body });
    const init_point = result.sandbox_init_point;

    console.log('Preferência criada com Client ID/Secret - Init point:', init_point);

    return res.json({
      id: result.id,
      init_point,
    });
  } catch (error) {
    console.error('Erro:', error);
    return res.status(500).json({
      error: 'Erro ao criar preferência',
      details: error.message,
    });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
  console.log('Configurado com Client ID + Client Secret');
});
