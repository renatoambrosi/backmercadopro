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
// =================================
