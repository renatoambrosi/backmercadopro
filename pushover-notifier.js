const axios = require('axios');

class PushoverNotifier {
  constructor() {
    this.userKey = process.env.PUSHOVER_USER_KEY;
    this.appToken = process.env.PUSHOVER_APP_TOKEN;
    this.endpoint = 'https://api.pushover.net/1/messages.json';
  }

  async sendPixApprovedNotification(details) {
    if (!this.userKey || !this.appToken) {
      console.warn('Pushover não configurado - notificação não enviada');
      return;
    }

    const title = 'Pagamento Aprovado (PIX)';
    const message = [
      `ID: ${details.id}`,
      `Valor: R$ ${Number(details.transaction_amount || 0).toFixed(2)}`,
      `UID: ${details.external_reference}`,
      `Email: ${details.metadata?.customer_email || details.payer?.email || 'n/d'}`
    ].join('\n');

    const payload = {
      token: this.appToken,
      user: this.userKey,
      title,
      message,
      priority: 0
    };

    const { status } = await axios.post(this.endpoint, payload, { timeout: 5000 });
    if (status >= 200 && status < 300) {
      console.log('📲 Pushover enviado com sucesso');
    } else {
      console.warn('⚠️ Falha ao enviar Pushover', status);
    }
  }
}

module.exports = PushoverNotifier;
