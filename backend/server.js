import express from 'express';
import { MercadoPagoConfig, Preference, Payment } from 'mercadopago';
import cors from 'cors';
import dotenv from 'dotenv';
import crypto from 'crypto';
dotenv.config();

const app = express();

// Configuração do Mercado Pago
const client = new MercadoPagoConfig({
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN,
});

app.use(cors());
app.use(express.json());

// Health check (sem detecção automática)
app.get('/', (req, res) => {
  res.json({
    status: 'Backend rodando!',
    timestamp: new Date().toISOString(),
    note: 'Ambiente de checkout forçado para SANDBOX pelo código'
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
          title: title,
          quantity: Number(quantity),
          unit_price: Number(price),
          currency_id: 'BRL',
        }
      ],
      payment_methods: {
        excluded_payment_methods: [
          { id: 'bolbradesco' },
          { id: 'debelo' },
        ],
        excluded_payment_types: [
          { id: 'ticket' },
          { id: 'debit_card' },
        ],
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

    // SANDBOX FORÇADO — SEM DETECÇÃO AUTOMÁTICA
    const init_point = result.sandbox_init_point;

    console.log(`Preferência criada para UID: ${uid}, External Reference: ${external_reference}`);
    console.log(`Ambiente: SANDBOX (FORÇADO)`);
    console.log(`Init point: ${init_point}`);

    return res.json({
      id: result.id,
      init_point,                // sempre sandbox
      external_reference,
      environment: 'sandbox',    // explícito
    });
  } catch (error) {
    console.error('Erro ao criar preferência:', error);
    return res.status(500).json({
      error: 'Erro ao criar preferência de pagamento',
      details: error.message,
    });
  }
});

// Endpoint para consultar status do pagamento PIX
app.get('/payment-status/:external_reference', async (req, res) => {
  try {
    const { external_reference } = req.params;
    if (!external_reference) {
      return res.status(400).json({ error: 'External reference é obrigatório' });
    }

    const payment = new Payment(client);
    const searchResult = await payment.search({ external_reference });

    console.log(`Consultando status para: ${external_reference}`);

    signatureParts.forEach((part) => {
      const [key, value] = part.split('=');
      if (key === 'ts') ts = value;
      if (key === 'v1') hash = value;
    });

    if (!ts || !hash) {
      console.log('Formato de assinatura inválido');
      return res.status(400).send('Formato de assinatura inválido');
    }

    const dataString = `id:${req.body.data?.id};request-id:${requestId};ts:${ts};`;

    const expectedSignature = crypto
      .createHmac('sha256', process.env.MERCADOPAGO_ACCESS_TOKEN)
      .update(dataString)
      .digest('hex');

    if (expectedSignature !== hash) {
      console.log('Assinatura inválida');
      return res.status(401).send('Assinatura inválida');
    }

    return next();
  } catch (error) {
    console.error('Erro na validação da assinatura:', error);
    return res.status(500).send('Erro interno');
  }
}

// Endpoint para receber notificações de webhook
app.post('/webhook', validateWebhookSignature, async (req, res) => {
  try {
    const { type, data, action } = req.body;

    console.log('Webhook recebido:', { type, data, action, timestamp: new Date().toISOString() });

    if (type === 'payment') {
      const paymentId = data.id;
      try {
        const payment = new Payment(client);
        const paymentDetails = await payment.get({ id: paymentId });

        console.log(`Pagamento ${paymentId} - Status: ${paymentDetails.status}`);
        console.log(`External Reference: ${paymentDetails.external_reference}`);
        console.log(`UID extraído: ${paymentDetails.metadata?.uid}`);

        if (paymentDetails.status === 'approved') {
          console.log(`✅ Pagamento aprovado para UID: ${paymentDetails.metadata?.uid}`);
          // TODO: ações para aprovado
        }
      } catch (paymentError) {
        console.error('Erro ao buscar detalhes do pagamento:', paymentError);
      }
    }

    return res.status(200).send('OK');
  } catch (error) {
    console.error('Erro no webhook:', error);
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
  console.log(`Ambiente: SANDBOX (FORÇADO NO INIT_POINT)`);
});
