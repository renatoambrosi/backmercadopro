import express from 'express';
import { MercadoPagoConfig, Preference, Payment } from 'mercadopago';
import cors from 'cors';
import dotenv from 'dotenv';
dotenv.config();

const app = express();

// Configuração do Mercado Pago COM Client ID/Secret
const client = new MercadoPagoConfig({
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN,
  options: {
    clientId: process.env.MERCADOPAGO_CLIENT_ID,
    clientSecret: process.env.MERCADOPAGO_CLIENT_SECRET,
  }
});

app.use(cors());
app.use(express.json());

// Health check
app.get('/', (req, res) => {
  res.json({
    status: 'Backend rodando!',
    timestamp: new Date().toISOString(),
    note: 'Ambiente de checkout forçado para SANDBOX pelo código',
  });
});

// Endpoint para criar preferência de pagamento (SANDBOX FORÇADO)
app.post('/create_preference', async (req, res) => {
  try {
    const { title, quantity, price, uid } = req.body;

    if (!uid) {
      return res.status(400).json({ error: 'UID é obrigatório' });
    }

    const preference = new Preference(client);
    const external_reference = `${uid}-${Date.now()}`;

    const body = {
      items: [
        {
          title: title || 'Produto Teste',
          quantity: Number(quantity) || 1,
          unit_price: Number(price) || 19.00,
          currency_id: 'BRL',
        },
      ],
      payment_methods: {
        excluded_payment_methods: [{ id: 'bolbradesco' }, { id: 'debelo' }],
        excluded_payment_types: [{ id: 'ticket' }, { id: 'debit_card' }],
      },
      back_urls: {
        success: `https://www.suellenseragi.com.br/resultado1?uid=${uid}`,
        failure: `${process.env.FRONTEND_URL}/failure?uid=${uid}`,
        pending: `${process.env.FRONTEND_URL}/pending?uid=${uid}`,
      },
      auto_return: 'approved',
      notification_url: `${process.env.BACKEND_URL}/webhook`,
      statement_descriptor: 'TESTE PROSPERIDADE',
      external_reference,
      metadata: { uid, source: 'teste-prosperidade' },
    };

    const result = await preference.create({ body });

    // SANDBOX FORÇADO
    const init_point = result.sandbox_init_point;

    console.log(`Preferência criada para UID: ${uid}, External Reference: ${external_reference}`);
    console.log('Ambiente: SANDBOX (FORÇADO)');
    console.log(`Init point: ${init_point}`);

    return res.json({
      id: result.id,
      init_point,
      external_reference,
      environment: 'sandbox',
    });
  } catch (error) {
    console.error('Erro ao criar preferência:', error);
    return res.status(500).json({
      error: 'Erro ao criar preferência de pagamento',
      details: error.message,
    });
  }
});

// Webhook SEM validação
app.post('/webhook', async (req, res) => {
  try {
    const { type, data, action } = req.body || {};

    console.log('Webhook recebido:', {
      type,
      data,
      action,
      timestamp: new Date().toISOString(),
    });

    if (type === 'payment' && data?.id) {
      const paymentId = data.id;
      try {
        const payment = new Payment(client);
        const paymentDetails = await payment.get({ id: paymentId });

        console.log(`Pagamento ${paymentId} - Status: ${paymentDetails.status}`);
        console.log(`External Reference: ${paymentDetails.external_reference}`);
        console.log(`UID extraído: ${paymentDetails.metadata?.uid}`);

        if (paymentDetails.status === 'approved') {
          console.log(`✅ Pagamento aprovado para UID: ${paymentDetails.metadata?.uid}`);
        }
      } catch (paymentError) {
        console.error('Erro ao buscar detalhes do pagamento:', paymentError?.message || paymentError);
      }
    }

    return res.status(200).send('OK');
  } catch (error) {
    console.error('Erro no webhook:', error?.message || error);
    return res.status(500).send('Error');
  }
});

const PORT = process.env.PORT || 3001;
const BACKEND_URL = process.env.RAILWAY_PUBLIC_DOMAIN
  ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
  : `http://localhost:${PORT}`;

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
  console.log(`Backend URL: ${BACKEND_URL}`);
  console.log(`Webhook URL: ${BACKEND_URL}/webhook`);
  console.log('Ambiente: SANDBOX (FORÇADO NO INIT_POINT)');
});
