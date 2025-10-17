import express from 'express';
import { MercadoPagoConfig, Preference } from 'mercadopago';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();

// Configuração do Mercado Pago
const client = new MercadoPagoConfig({
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN,
});

app.use(cors());
app.use(express.json());

// Health check
app.get('/', (req, res) => {
  res.json({ 
    status: 'Backend rodando!', 
    timestamp: new Date().toISOString() 
  });
});

// Endpoint para criar preferência de pagamento
app.post('/create_preference', async (req, res) => {
  try {
    const { title, quantity, price } = req.body;

    const preference = new Preference(client);
    
    const body = {
      items: [
        {
          title: title,
          quantity: Number(quantity),
          unit_price: Number(price),
          currency_id: 'BRL',
        }
      ],
      back_urls: {
        success: `${process.env.FRONTEND_URL}/success`,
        failure: `${process.env.FRONTEND_URL}/failure`,
        pending: `${process.env.FRONTEND_URL}/pending`
      },
      auto_return: 'approved',
      notification_url: `${process.env.BACKEND_URL}/webhook`,
      statement_descriptor: 'SUA LOJA',
      external_reference: `ORDER-${Date.now()}`,
    };

    const result = await preference.create({ body });
    
    res.json({
      id: result.id,
      init_point: result.init_point,
    });
  } catch (error) {
    console.error('Erro ao criar preferência:', error);
    res.status(500).json({ 
      error: 'Erro ao criar preferência de pagamento',
      details: error.message 
    });
  }
});

// Endpoint para receber notificações de webhook
app.post('/webhook', async (req, res) => {
  try {
    const { type, data } = req.body;
    
    console.log('Webhook recebido:', { type, data });
    
    if (type === 'payment') {
      const paymentId = data.id;
      console.log(`Pagamento ${paymentId} atualizado`);
    }
    
    res.status(200).send('OK');
  } catch (error) {
    console.error('Erro no webhook:', error);
    res.status(500).send('Error');
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
