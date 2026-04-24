// netlify/functions/task-updated-notify.js
const { createClient } = require('@supabase/supabase-js');

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatVenezuelaPhone(phone) {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  
  if (digits.startsWith('58') && digits.length === 12) return digits;
  if (digits.startsWith('04') && digits.length === 11) return '58' + digits.substring(1);
  if (digits.startsWith('4') && digits.length === 10) return '58' + digits;
  
  return null;
}

const statusMap = {
  'todo': 'Por Hacer',
  'in_progress': 'En Curso',
  'review': 'En Revisión',
  'done': 'Finalizado'
};

async function sendWhatsAppStatusUpdate(toPhone, agentName, taskTitle, newStatusKey, dueDate, taskLink) {
  const phoneId = process.env.META_PHONE_ID;
  const token = process.env.META_WHATSAPP_TOKEN;
  const templateName = 'actualizacion_tarea'; // La nueva plantilla que el usuario creó en Meta

  if (!phoneId || !token || !toPhone) return { success: false, reason: 'Missing WhatsApp config' };

  const formattedPhone = formatVenezuelaPhone(toPhone);
  if (!formattedPhone) return { success: false, reason: `Invalid phone format: ${toPhone}` };

  const dueDateFormatted = dueDate
    ? new Date(dueDate).toLocaleDateString('es-VE', { day: '2-digit', month: 'long', year: 'numeric' })
    : 'No especificada';

  const statusText = statusMap[newStatusKey] || newStatusKey;

  const body = {
    messaging_product: 'whatsapp',
    to: formattedPhone,
    type: 'template',
    template: {
      name: templateName,
      language: { code: 'es' },
      components: [
        {
          type: 'body',
          parameters: [
            { type: 'text', text: agentName },     // {{1}}
            { type: 'text', text: taskTitle },     // {{2}}
            { type: 'text', text: statusText },    // {{3}}
            { type: 'text', text: dueDateFormatted } // {{4}}
          ],
        },
      ],
    },
  };

  const response = await fetch(`https://graph.facebook.com/v22.0/${phoneId}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  const result = await response.json();
  if (!response.ok) {
    console.error('[WhatsApp Update] Error:', JSON.stringify(result));
    return { success: false, reason: result };
  }
  return { success: true, result };
}

// ─── Handler Principal ────────────────────────────────────────────────────────

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  // 1. Autenticar
  const authHeader = event.headers['authorization'] || '';
  const token = authHeader.replace('Bearer ', '');
  if (!token) return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) };

  const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) return { statusCode: 401, body: JSON.stringify({ error: 'Invalid token' }) };

  // 2. Leer payload
  const { taskId, newStatus } = JSON.parse(event.body || '{}');
  if (!taskId || !newStatus) {
    return { statusCode: 400, body: JSON.stringify({ error: 'taskId and newStatus are required.' }) };
  }

  // 3. Obtener tarea
  const { data: task, error: taskError } = await supabase
    .from('tasks')
    .select('*')
    .eq('id', taskId)
    .single();

  if (taskError || !task || !task.assignee_id) {
    return { statusCode: 404, body: JSON.stringify({ error: 'Task or assignee not found.' }) };
  }

  // 4. Obtener agente
  const { data: agent, error: agentError } = await supabase
    .from('agents')
    .select('name, phone')
    .eq('id', task.assignee_id)
    .single();

  if (agentError || !agent) {
    return { statusCode: 404, body: JSON.stringify({ error: 'Agent not found.' }) };
  }

  const taskLink = `${process.env.URL || 'https://lago-hub.netlify.app'}/admin#tasks`;

  // 5. Enviar mensaje
  const whatsappResult = await sendWhatsAppStatusUpdate(
    agent.phone,
    agent.name,
    task.title,
    newStatus,
    task.due_date,
    taskLink
  );

  console.log('[Task Updated Notify] WhatsApp result:', whatsappResult);

  return {
    statusCode: 200,
    body: JSON.stringify({ success: whatsappResult.success, whatsapp: whatsappResult }),
  };
};
