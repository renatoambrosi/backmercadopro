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
    const { title, quantity, price, uid } = req.body;

    // Validar UID
    if (!uid) {
      return res.status(400).json({ 
        error: 'UID é obrigatório' 
      });
    }

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
      payment_methods: {
          excluded_payment_types: [
            { id: "bolbradesco" },      // Exclui boleto
            { id: "caixa_card_row" }, // Exclui cartões de crédito
            { id: "ticket" }   // Exclui cartões de débito
          ],
          excluded_payment_methods: [
            { id: "account_money" } // Exclui saldo MP, opcional
          ],
          default_payment_method_id: "pix" // Foca no Pix como padrão
  },
      excluded_payment_types: [
          { id: "nolbradesco" }  // Remove boleto
        ],
      payment_methods: {
        excluded_payment_methods: [
          { id: "caixa_card" }  // Remove cartão débito Caixa
        ],
        
      },
      back_urls: {
        // Redireciona para o resultado com o UID após pagamento aprovado
        success: `https://www.suellenseragi.com.br/resultado1?uid=${uid}`,
        failure: `${process.env.FRONTEND_URL}/failure?uid=${uid}`,
        pending: `${process.env.FRONTEND_URL}/pending?uid=${uid}`
      },
      auto_return: 'approved',
      notification_url: `${process.env.BACKEND_URL}/webhook`,
      statement_descriptor: 'TESTE PROSPERIDADE',
      // Armazena o UID na referência externa para rastreamento
      external_reference: `${uid}-${Date.now()}`,
      // Metadados adicionais (opcional, mas útil para relatórios)
      metadata: {
        uid: uid,
        source: 'teste-prosperidade'
      }
    };

    const result = await preference.create({ body });
    
    console.log(`Preferência criada para UID: ${uid}`);
    
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
      
      // Aqui você pode:
      // 1. Buscar detalhes do pagamento na API do Mercado Pago
      // 2. Extrair o UID do external_reference
      // 3. Atualizar status no seu banco de dados
      // 4. Enviar email de confirmação com o link personalizado
      
      console.log(`Pagamento ${paymentId} processado`);
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
  console.log(`Webhook URL: ${process.env.BACKEND_URL}/webhook`);
});
