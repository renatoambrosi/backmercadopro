const express = require('express');
const { MercadoPagoConfig, Payment, MerchantOrder } = require('mercadopago');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');

const SimpleEmailSender = require('../email-sender');
const emailSender = new SimpleEmailSender();
const PushoverNotifier = require('../pushover-notifier');
const pushoverNotifier = new PushoverNotifier();

const router = express.Router();

// ============================================
// CONFIG MERCADO PAGO (PRODUÇÃO)
// ============================================

const client = new MercadoPagoConfig({
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN,
  options: { timeout: 7000 }
});
const payment = new Payment(client);
const merchantOrder = new MerchantOrder(client);

// ============================================
// HELPER: geolocalização por IP (sem interação do usuário)
// ============================================

async function getIPGeodata(ip) {
  try {
    if (!ip) return null;
    const cleanIP = (ip || '').split(',')[0].trim().replace('::ffff:', '');
    if (!cleanIP || cleanIP === '::1' || cleanIP === '127.0.0.1') return null;

    // Serviço gratuito simples; pode ser ajustado se desejar outro provedor
    const { data } = await axios.get(`https://ipapi.co/${cleanIP}/json/`, { timeout: 2500 });
    if (data && !data.error) {
      return {
        ip: cleanIP,
        city_name: data.city || undefined,
        state_name: data.region || undefined,
        country_name: data.country_name || undefined,
        zip_code: data.postal || undefined,
        latitude: data.latitude || undefined,
        longitude: data.longitude || undefined,
      };
    }
    return { ip: cleanIP };
  } catch (e) {
    return null;
  }
}

// ============================================
// HELPER: montar additional_info com dados reais
// - evita uso de genéricos, complementa com IP/localização
// ============================================

function buildAdditionalInfo({ formData, geo, uid }) {
  const now = new Date().toISOString();

  const items = [
    {
      id: 'teste-prosperidade-001',
      title: 'Teste de Prosperidade',
      description: 'Acesso ao resultado personalizado do teste de prosperidade',
      category_id: 'services',
      quantity: 1,
      unit_price: Number(formData?.transaction_amount || 19),
      picture_url: 'https://www.suellenseragi.com.br/logo.png'
    }
  ];

  const payer = {
    first_name: formData?.additional_info?.payer?.first_name || undefined,
    last_name: formData?.additional_info?.payer?.last_name || undefined,
    email: formData?.payer?.email || undefined,
    identification: formData?.payer?.identification ? {
      type: formData.payer.identification.type,
      number: formData.payer.identification.number
    } : undefined,
    phone: formData?.additional_info?.payer?.phone || undefined,
    registration_date: now,
    authentication_type: 'Native web'
  };

  const shipments = {
    receiver_address: {
      street_name: geo?.city_name ? 'Entrega Digital' : undefined,
      street_number: geo?.city_name ? '0' : undefined,
      zip_code: geo?.zip_code || undefined,
      city_name: geo?.city_name || undefined,
      state_name: geo?.state_name || undefined,
      country_name: geo?.country_name || 'Brasil'
    }
  };

  return { items, payer, shipments };
}

// ============================================
// VALIDAÇÃO BÁSICA DO FORM
// ============================================

function validatePaymentPayload(body) {
  const errors = [];
  if (!body || typeof body !== 'object') errors.push('Payload inválido');
  if (!body.description) errors.push('Descrição obrigatória');
  if (!body.transaction_amount || Number(body.transaction_amount) <= 0) errors.push('Valor inválido');
  if (!body.payer || !body.payer.email) errors.push('Email do pagador é obrigatório');
  if (!body.payment_method_id) errors.push('payment_method_id obrigatório');
  return errors;
}

// ============================================
// PROCESS PAYMENT
// - Suporta PIX e Cartão
// - Envia device_id (MP_DEVICE_SESSION_ID) via metadata
// - Usa additional_info com dados reais do usuário
// ============================================

router.post('/process_payment', async (req, res) => {
  try {
    const body = req.body || {};
    const errors = validatePaymentPayload(body);
    if (errors.length) {
      return res.status(400).json({ error: 'Dados inválidos', details: errors });
    }

    const {
      payment_method_id,
      token,
      transaction_amount,
      installments,
      description,
      payer,
      issuer_id,
      uid,
      device_id // ← MP_DEVICE_SESSION_ID vindo do front
    } = body;

    const paymentUID = uid || uuidv4();

    // Geolocalização por IP (silenciosa)
    const geo = await getIPGeodata(req.clientIP);

    // Additional info sem valores genéricos
    const additional_info = buildAdditionalInfo({ formData: body, geo, uid: paymentUID });

    // Base comum
    const baseData = {
      transaction_amount: Number(transaction_amount),
      description: description || 'Teste de Prosperidade - Resultado Personalizado',
      payer: {
        email: payer.email,
        identification: payer.identification
          ? { type: payer.identification.type, number: payer.identification.number }
          : undefined
      },
      external_reference: paymentUID,
      additional_info,
      notification_url: `${process.env.BASE_URL}/api/webhook`,
      metadata: {
        user_uid: paymentUID,
        device_id: device_id || undefined,
        customer_email: payer.email,
        integration_type: 'checkout_bricks',
        version: '3.0'
      }
    };

    // CARTÃO
    if (payment_method_id !== 'pix' && token) {
      const cardData = {
        ...baseData,
        token,
        installments: Number(installments) || 1,
        payment_method_id,
        issuer_id: issuer_id ? Number(issuer_id) : undefined,
        binary_mode: false,
        statement_descriptor: 'TESTE PROSPERIDADE',
        three_d_secure_mode: 'optional'
      };

      const result = await payment.create({
        body: cardData,
        requestOptions: { idempotencyKey: uuidv4() }
      });

      return res.status(201).json({
        id: result.id,
        status: result.status,
        status_detail: result.status_detail,
        payment_method_id: result.payment_method_id,
        payment_type_id: result.payment_type_id,
        transaction_amount: result.transaction_amount,
        uid: paymentUID,
        date_created: result.date_created,
        date_approved: result.date_approved
      });
    }

    // PIX
    if (payment_method_id === 'pix') {
      const pixData = {
        ...baseData,
        payment_method_id: 'pix',
        date_of_expiration: new Date(Date.now() + 30 * 60 * 1000).toISOString()
      };

      const pixResult = await payment.create({
        body: pixData,
        requestOptions: { idempotencyKey: uuidv4() }
      });

      const response = {
        id: pixResult.id,
        status: pixResult.status,
        status_detail: pixResult.status_detail,
        payment_method_id: pixResult.payment_method_id,
        payment_type_id: pixResult.payment_type_id,
        transaction_amount: pixResult.transaction_amount,
        uid: paymentUID,
        date_created: pixResult.date_created,
        date_of_expiration: pixResult.date_of_expiration
      };

      if (pixResult.point_of_interaction?.transaction_data) {
        response.qr_code = pixResult.point_of_interaction.transaction_data.qr_code;
        response.qr_code_base64 = pixResult.point_of_interaction.transaction_data.qr_code_base64;
        response.ticket_url = pixResult.point_of_interaction.transaction_data.ticket_url;
      }

      return res.status(201).json(response);
    }

    return res.status(400).json({ error: 'Método de pagamento não suportado' });
  } catch (error) {
    if (error.cause?.[0]) {
      const mpError = error.cause[0];
      return res.status(400).json({
        error: 'Erro do Mercado Pago',
        message: mpError.description || mpError.message,
        code: mpError.code,
        details: mpError
      });
    }
    return res.status(500).json({ error: 'Erro interno', message: error.message });
  }
});

// ============================================
// WEBHOOK
// - dispara email + Pushover quando approved
// ============================================

router.post('/webhook', async (req, res) => {
  try {
    res.status(200).json({ received: true, timestamp: new Date().toISOString() });

    const { action, data, type } = req.body || {};
    if ((action === 'payment.updated' || action === 'payment.created') && data?.id) {
      try {
        const details = await payment.get({ id: data.id });

        if (details.status === 'approved') {
          const customerEmail = details.metadata?.customer_email || details.payer?.email;
          const uid = details.external_reference;

          // Email sucesso
          try { await emailSender.sendPixSuccessEmail(customerEmail, uid); } catch (e) {}

          // Pushover
          try { await pushoverNotifier.sendPixApprovedNotification(details); } catch (e) {}
        }
      } catch (e) {}
    }

    if (type === 'merchant_order' && data?.id) {
      try { await merchantOrder.get({ merchantOrderId: data.id }); } catch (e) {}
    }
  } catch (e) {
    if (!res.headersSent) res.status(200).json({ received: true, error: 'internal' });
  }
});

// ============================================
// POLLING
// ============================================

router.get('/payment/:id', async (req, res) => {
  try {
    const details = await payment.get({ id: req.params.id });
    const response = {
      id: details.id,
      status: details.status,
      status_detail: details.status_detail,
      transaction_amount: details.transaction_amount,
      uid: details.external_reference,
      payment_method_id: details.payment_method_id,
      payment_type_id: details.payment_type_id,
      date_created: details.date_created,
      date_approved: details.date_approved
    };

    if (details.payment_method_id === 'pix' && details.point_of_interaction?.transaction_data) {
      response.qr_code = details.point_of_interaction.transaction_data.qr_code;
      response.qr_code_base64 = details.point_of_interaction.transaction_data.qr_code_base64;
      response.ticket_url = details.point_of_interaction.transaction_data.ticket_url;
    }

    res.status(200).json(response);
  } catch (error) {
    res.status(404).json({ error: 'Pagamento não encontrado', payment_id: req.params.id });
  }
});

// ============================================
// CALLBACK (fallback para cartão)
// ============================================

router.get('/callback', (req, res) => {
  const uid = req.query.external_reference;
  if (uid) {
    return res.redirect(`https://www.suellenseragi.com.br/resultado1?uid=${uid}`);
  }
  return res.redirect('https://mpfullfront.vercel.app');
});

module.exports = router;
