// ==================== CONFIGURAÇÕES CLICKUP ====================
const CLICKUP_TOKEN = 'pk_240251311_KUKT06L82HSSJR803NN8L8C4IXSLPI4Y';

// ID do Workspace / Equipe
const TEAM_ID = '90171555298';

// ID exato da Lista (Imported From Trello)
const LIST_IDS = [
  '901717326033'
];

// Mapeamento de Membros (pelo e-mail cadastrado no ClickUp)
const EQUIPE = {
  'beatrizsouza231998@gmail.com': { phone: '554188759342', apiKey: '7120353' }
};
// ===============================================================

function enviarLembretesClickUp() {
  const hojeTexto = Utilities.formatDate(new Date(), "America/Sao_Paulo", "yyyy-MM-dd");
  const hoje = new Date(hojeTexto + "T00:00:00");

  const queryListas = LIST_IDS.map(id => `list_ids[]=${id}`).join('&');
  const url = `https://api.clickup.com/api/v2/team/${TEAM_ID}/task?${queryListas}&subtasks=true&include_closed=true`;

  const options = {
    method: 'get',
    headers: {
      'Authorization': CLICKUP_TOKEN,
      'Content-Type': 'application/json'
    },
    muteHttpExceptions: true
  };

  try {
    const response = UrlFetchApp.fetch(url, options);
    const statusCode = response.getResponseCode();
    const responseText = response.getContentText();

    Logger.log(`Status Code do ClickUp: ${statusCode}`);

    if (statusCode !== 200) {
      Logger.log(`Resposta da API do ClickUp: ${responseText}`);
      return;
    }

    const json = JSON.parse(responseText);

    if (!json.tasks || json.tasks.length === 0) {
      Logger.log(`Nenhuma tarefa encontrada na lista.`);
      return;
    }

    Logger.log(`Total de tarefas encontradas: ${json.tasks.length}`);

    json.tasks.forEach(task => {
      Logger.log(`Tarefa achada: "${task.name}" | Vencimento: ${task.due_date} | Status: ${task.status ? task.status.status : 'Sem status'}`);

      if (!task.due_date) return;

      const dataVencimentoUTC = new Date(parseInt(task.due_date));
      const dataTexto = Utilities.formatDate(dataVencimentoUTC, "America/Sao_Paulo", "yyyy-MM-dd");
      const dataVencimento = new Date(dataTexto + "T00:00:00");

      const diferencaDias = Math.round((dataVencimento - hoje) / (1000 * 60 * 60 * 24));

      if (diferencaDias >= 0 && diferencaDias <= 1) {
        const prazoTexto = diferencaDias === 0 ? "HOJE" : "AMANHÃ";

        // Se a tarefa não tiver responsável explícito ou for você, envia a notificação
        if (!task.assignees || task.assignees.length === 0) {
          const mensagem = `📌 *Lembrete de Tarefa - ClickUp*\n\n` +
                           `Olá!\n` +
                           `A tarefa *"${task.name}"* vence *${prazoTexto}*.\n\n` +
                           `🔗 Link: ${task.url}`;
          enviarWhatsApp(EQUIPE['beatrizsouza231998@gmail.com'].phone, EQUIPE['beatrizsouza231998@gmail.com'].apiKey, mensagem);
        } else {
          task.assignees.forEach(assignee => {
            const dadosMembro = EQUIPE[assignee.email] || EQUIPE[assignee.username];

            if (dadosMembro) {
              const mensagem = `📌 *Lembrete de Tarefa - ClickUp*\n\n` +
                               `Olá!\n` +
                               `A tarefa *"${task.name}"* vence *${prazoTexto}*.\n\n` +
                               `🔗 Link: ${task.url}`;

              enviarWhatsApp(dadosMembro.phone, dadosMembro.apiKey, mensagem);
            } else {
              Logger.log(`Aviso: O responsável "${assignee.username}" (${assignee.email}) não está configurado no objeto EQUIPE.`);
            }
          });
        }
      }
    });

  } catch (e) {
    Logger.log(`Erro ao consultar o ClickUp: ` + e.toString());
  }
}

function enviarWhatsApp(phone, apiKey, mensagem) {
  const mensagemCodificada = encodeURIComponent(mensagem);
  // apikey corrigido para minúsculas
  const url = `https://api.callmebot.com/whatsapp.php?phone=${phone}&text=${mensagemCodificada}&apikey=${apiKey}`;

  try {
    const res = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
    Logger.log(`Resposta CallMeBot (${phone}): ${res.getContentText()}`);
  } catch (e) {
    Logger.log(`Erro ao enviar WhatsApp para ${phone}: ` + e.toString());
  }
}
