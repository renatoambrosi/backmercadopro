const axios = require('axios');

class SimpleEmailSender {
  constructor() {
    this.apiKey = process.env.BREVO_API_KEY;
    this.senderEmail = process.env.SENDER_EMAIL || 'sistema@suellenseragi.com.br';
    this.senderName = 'Sistema de Pagamentos';
    this.adminEmail = process.env.ADMIN_EMAIL || 'contato@suellenseragi.com.br';
    this.baseUrl = 'https://api.brevo.com/v3';
  }

  async sendPixSuccessEmail(toEmail, uid) {
    if (!this.apiKey) {
      console.warn('BREVO_API_KEY ausente - email não enviado');
      return;
    }
    if (!toEmail) {
      console.warn('Email do cliente ausente - email não enviado');
      return;
    }

    const subject = `Pagamento confirmado - Resultado do Teste`;
    const htmlContent = `
      <div style="font-family:Arial,Helvetica,sans-serif;color:#333">
        <h2>Seu pagamento foi aprovado ✅</h2>
        <p>Obrigado! Seu pagamento foi confirmado com sucesso.</p>
        <p>Para acessar seu resultado, clique no botão abaixo:</p>
        <p>
          <a href="https://www.suellenseragi.com.br/resultado1?uid=${uid}"
             style="display:inline-block;padding:12px 20px;background:#1890ff;color:#fff;text-decoration:none;border-radius:6px">
            Ver meu resultado agora
          </a>
        </p>
        <p>Se o botão não funcionar, copie e cole no navegador:</p>
        <p>https://www.suellenseragi.com.br/resultado1?uid=${uid}</p>
        <hr/>
        <p style="font-size:12px;color:#888">Este é um email automático. Não responda.</p>
      </div>
    `;

    await this._sendTransactional({
      to: [{ email: toEmail }],
      subject,
      htmlContent
    });

    // Notificar o admin (opcional)
    try {
      await this._sendTransactional({
        to: [{ email: this.adminEmail }],
        subject: `Pagamento aprovado (PIX) - UID ${uid}`,
        htmlContent: `<p>Cliente: ${toEmail}</p><p>UID: ${uid}</p>`
      });
    } catch (e) {
      // silencioso
    }
  }

  async _sendTransactional({ to, subject, htmlContent }) {
    const url = `${this.baseUrl}/smtp/email`;
    const payload = {
      sender: { name: this.senderName, email: this.senderEmail },
      to,
      subject,
      htmlContent
    };
    const headers = {
      'Content-Type': 'application/json',
      'api-key': this.apiKey
    };

    const { status } = await axios.post(url, payload, { headers, timeout: 5000 });
    if (status >= 200 && status < 300) {
      console.log('📧 Email enviado com sucesso');
    } else {
      console.warn('⚠️ Falha ao enviar email', status);
    }
  }
}

module.exports = SimpleEmailSender;
