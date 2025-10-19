import express from 'express';
import { MercadoPagoConfig, Preference, Payment } from 'mercadopago';
import cors from 'cors';
import dotenv from 'dotenv';
dotenv.config();

const app = express();

// Configuracao do Mercado Pago COM Client ID/Secret
const client = new MercadoPagoConfig({
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN,
  options: {
    clientId: process.env.MERCADOPAGO_CLIENT_ID,
    clientSecret: process.env.MERCADOPAGO_CLIENT_SECRET,
  }
});

// CORS mais permissivo para evitar conflitos
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.use(express.json());

app.get('/', (req, res) => {
  res.json({
    status: 'Backend rodando!',
    timestamp: new Date().toISOString(),
    note: 'Ambiente PRODUCAO com Client ID/Secret',
  });
});

// Endpoint para criar preferencia
app.post('/create_preference', async (req, res) => {
  try {
    const { title, quantity, price, uid } = req.body;

    // UID opcional - nao obrigatorio
    const safeUid = uid || 'AUTO-GENERATED';
    const external_reference = `${safeUid}-${Date.now()}`;

    const preference = new Preference(client);

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
        success: 'https://backmercadopro.vercel.app/success',
        failure: 'https://backmercadopro.vercel.app/failure',
        pending: 'https://backmercadopro.vercel.app/pending',
      },
      auto_return: 'approved',
      notification_url: `${process.env.BACKEND_URL}/webhook`,
      statement_descriptor: 'TESTE MP',
      external_reference,
      metadata: { uid: safeUid, source: 'teste-checkout' },
    };

    const result = await preference.create({ body });
    const init_point = result.init_point;

    console.log(`Preferencia criada: ${external_reference}`);
    console.log(`Init point: ${init_point}`);

    return res.json({
      id: result.id,
      init_point,
      external_reference,
    });
  } catch (error) {
    console.error('Erro ao criar preferencia:', error);
    return res.status(500).json({
      error: 'Erro ao criar preferencia',
      details: error.message,
    });
  }
});

// Webhook GET - para teste IPN
app.get('/webhook', (req, res) => {
  const { topic, id } = req.query;
  console.log('IPN Test recebido (GET):', { topic, id });
  return res.status(200).send('OK');
});

// Webhook POST - para notificacoes reais
app.post('/webhook', async (req, res) => {
  try {
    const { type, data, action, live_mode, id } = req.body || {};

    console.log('Webhook recebido:', {
      type,
      data,
      action,
      live_mode,
      id,
      timestamp: new Date().toISOString(),
    });

    if (type === 'payment') {
      // ID do pagamento pode estar em data.id ou id
      const paymentId = data?.id || id;
      
      if (paymentId) {
        // Detectar se e um webhook de teste
        const isTestWebhook = paymentId === '123456' || live_mode === false || !live_mode;
        
        if (isTestWebhook) {
          console.log(`Webhook de teste recebido - ID: ${paymentId} - nao consultando API`);
        } else {
          // Apenas consultar a API se nao for um teste
          try {
            const payment = new Payment(client);
            const paymentDetails = await payment.get({ id: paymentId });

            console.log(`Pagamento ${paymentId} - Status: ${paymentDetails.status}`);
            
            if (paymentDetails.status === 'approved') {
              console.log(`Pagamento aprovado: ${paymentDetails.external_reference}`);
            }
          } catch (paymentError) {
            console.error('Erro webhook payment:', paymentError.message);
          }
        }
      }
    }

    return res.status(200).send('OK');
  } catch (error) {
    console.error('Erro webhook:', error.message);
    return res.status(500).send('Error');
  }
});

// ENDPOINT DE POLLING - Movido para depois do webhook e com validações melhoradas
app.get('/api/payment-status/:paymentId', async (req, res) => {
  try {
    const { paymentId } = req.params;
    
    // Validação melhorada - aceitar apenas números
    if (!paymentId || !/^\d+$/.test(paymentId)) {
      return res.status(400).json({
        error: 'Payment ID deve ser numérico',
        received: paymentId
      });
    }

    console.log(`[POLLING] Consultando status do pagamento: ${paymentId}`);

    const payment = new Payment(client);
    const paymentDetails = await payment.get({ id: paymentId });

    // Extrair UID do external_reference ou metadata
    let uid = null;
    if (paymentDetails.external_reference) {
      // Format: "UID-timestamp" - extrair apenas o UID
      const parts = paymentDetails.external_reference.split('-');
      uid = parts[0];
    }
    
    // Fallback para metadata se UID não estiver no external_reference
    if (!uid && paymentDetails.metadata && paymentDetails.metadata.uid) {
      uid = paymentDetails.metadata.uid;
    }

    const response = {
      status: paymentDetails.status,
      status_detail: paymentDetails.status_detail,
      external_reference: paymentDetails.external_reference,
      uid: uid,
      payment_method_id: paymentDetails.payment_method_id,
      payment_type_id: paymentDetails.payment_type_id,
      transaction_amount: paymentDetails.transaction_amount,
      date_created: paymentDetails.date_created,
      date_approved: paymentDetails.date_approved
    };

    console.log(`[POLLING] Status do pagamento ${paymentId}:`, response.status);

    return res.json(response);

  } catch (error) {
    console.error('[POLLING] Erro ao consultar status:', error.message);
    
    // Se o pagamento não existe, retornar erro específico
    if (error.message && (error.message.includes('404') || error.message.includes('not found'))) {
      return res.status(404).json({
        error: 'Pagamento não encontrado',
        paymentId: req.params.paymentId
      });
    }

    return res.status(500).json({
      error: 'Erro interno ao consultar pagamento',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Erro interno'
    });
  }
});

// Favicon handler para evitar erro 400
app.get('/favicon.ico', (req, res) => {
  res.status(204).send();
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
  console.log(`Webhook URL: ${process.env.BACKEND_URL}/webhook`);
  console.log(`Polling URL: ${process.env.BACKEND_URL}/api/payment-status/:id`);
  console.log('Ambiente: PRODUCAO com Client ID/Secret configurado');
});
