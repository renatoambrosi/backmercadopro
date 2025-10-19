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
    const { title, quantity, price, uid } = req.body;
    
    // Validar UID
    if (!uid) {
      return res.status(400).json({ 
        error: 'UID é obrigatório' 
      });
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
          { id: "bolbradesco" },
          { id: "debelo" }
        ],
        excluded_payment_types: [
          { id: "ticket" },
          { id: "debit_card" }
        ]
      },
      back_urls: {
        success: `https://www.suellenseragi.com.br/resultado1?uid=${uid}`,
        failure: `${process.env.FRONTEND_URL}/failure?uid=${uid}`,
        pending: `${process.env.FRONTEND_URL}/pending?uid=${uid}`
      },
      auto_return: 'approved',
      notification_url: `${process.env.BACKEND_URL}/webhook`,
      statement_descriptor: 'TESTE PROSPERIDADE',
      external_reference: external_reference,
      metadata: {
        uid: uid,
        source: 'teste-prosperidade'
      }
    };

    const result = await preference.create({ body });

    console.log(`Preferência criada para UID: ${uid}, External Reference: ${external_reference}`);

    res.json({
      id: result.id,
      init_point: result.sandbox_init_point,
      external_reference: external_reference
    });
  } catch (error) {
    console.error('Erro ao criar preferência:', error);
    res.status(500).json({ 
      error: 'Erro ao criar preferência de pagamento',
      details: error.message 
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

    // Buscar pagamento pela external_reference
    const payment = new Payment(client);
    const searchResult = await payment.search({
      external_reference: external_reference
    });

    console.log(`Consultando status para: ${external_reference}`);

    if (!searchResult.results || searchResult.results.length === 0) {
      return res.json({
        status: 'pending',
        message: 'Pagamento não encontrado ou ainda não processado'
      });
    }

    const latestPayment = searchResult.results[0];
    
    res.json({
      status: latestPayment.status,
      payment_id: latestPayment.id,
      external_reference: external_reference,
      payment_method: latestPayment.payment_method_id,
      status_detail: latestPayment.status_detail
    });

  } catch (error) {
    console.error('Erro ao consultar status:', error);
    res.status(500).json({ 
      error: 'Erro ao consultar status do pagamento',
      details: error.message 
    });
  }
});

// Middleware para validar webhook signature
function validateWebhookSignature(req, res, next) {
  try {
    const signature = req.headers['x-signature'];
    const requestId = req.headers['x-request-id'];
    
    if (!signature || !requestId) {
      console.log('Headers de assinatura ausentes');
      return res.status(400).send('Headers de assinatura ausentes');
    }

    // Extrair ts e hash da assinatura
    const signatureParts = signature.split(',');
    let ts, hash;
    
    signatureParts.forEach(part => {
      const [key, value] = part.split('=');
      if (key === 'ts') ts = value;
      if (key === 'v1') hash = value;
    });

    if (!ts || !hash) {
      console.log('Formato de assinatura inválido');
      return res.status(400).send('Formato de assinatura inválido');
    }

    // Criar string de dados para validação
    const dataString = `id:${req.body.data?.id};request-id:${requestId};ts:${ts};`;
    
    // Gerar HMAC usando secret key
    const expectedSignature = crypto
      .createHmac('sha256', process.env.MERCADOPAGO_PUBLIC_KEY)
      .update(dataString)
      .digest('hex');

    if (expectedSignature !== hash) {
      console.log('Assinatura inválida');
      return res.status(401).send('Assinatura inválida');
    }

    next();
  } catch (error) {
    console.error('Erro na validação da assinatura:', error);
    res.status(500).send('Erro interno');
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
        // Buscar detalhes do pagamento
        const payment = new Payment(client);
        const paymentDetails = await payment.get({ id: paymentId });

        console.log(`Pagamento ${paymentId} - Status: ${paymentDetails.status}`);
        console.log(`External Reference: ${paymentDetails.external_reference}`);
        console.log(`UID extraído: ${paymentDetails.metadata?.uid}`);

        // Aqui você pode:
        // 1. Salvar no banco de dados
        // 2. Enviar email de confirmação
        // 3. Ativar acesso ao conteúdo
        // 4. Atualizar status no seu sistema

        if (paymentDetails.status === 'approved') {
          console.log(`✅ Pagamento aprovado para UID: ${paymentDetails.metadata?.uid}`);
          // TODO: Implementar ações para pagamento aprovado
        }

      } catch (paymentError) {
        console.error('Erro ao buscar detalhes do pagamento:', paymentError);
      }
    }

    res.status(200).send('OK');
  } catch (error) {
    console.error('Erro no webhook:', error);
    res.status(500).send('Error');
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
});
