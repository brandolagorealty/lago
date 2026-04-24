// netlify/functions/task-created-notify.js
// Se activa desde el frontend al crear una tarea.
// 1. Crea un evento en Google Calendar de los asesores asignados.
// 2. Envía un mensaje de WhatsApp a los asesores notificándole la nueva tarea.

const { createClient } = require('@supabase/supabase-js');
const { google } = require('googleapis');

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatVenezuelaPhone(phone) {
  if (!phone) return null;
  const digits = phone.replace(/\\D/g, '');
  if (digits.startsWith('58') && digits.length === 12) return digits;
  if (digits.startsWith('04') && digits.length === 11) return '58' + digits.substring(1);
  if (digits.startsWith('4') && digits.length === 10) return '58' + digits;
  return null;
}

function getGoogleCalendarClient() {
  const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/calendar'],
  });
  return google.calendar({ version: 'v3', auth });
}

async function sendWhatsAppMessage(toPhone, agentName, taskTitle, dueDate, taskLink) {
  const phoneId = process.env.META_PHONE_ID;
  const token = process.env.META_WHATSAPP_TOKEN;
  const templateName = process.env.META_TEMPLATE_NAME || 'alerta_tarea_pendiente';

  if (!phoneId || !token || !toPhone) return { success: false, reason: 'Missing WhatsApp config' };

  const formattedPhone = formatVenezuelaPhone(toPhone);
  if (!formattedPhone) return { success: false, reason: `Invalid phone format: ${toPhone}` };

  const dueDateFormatted = dueDate
    ? new Date(dueDate).toLocaleDateString('es-VE', { day: '2-digit', month: 'long', year: 'numeric' })
    : 'No especificada';

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
            { type: 'text', text: agentName },
            { type: 'text', text: taskTitle },
            { type: 'text', text: dueDateFormatted },
            { type: 'text', text: taskLink || 'https://lago-hub.netlify.app' },
          ],
        },
      ],
    },
  };

  try {
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
      console.error('[WhatsApp] Error:', JSON.stringify(result));
      return { success: false, reason: result };
    }
    return { success: true, result };
  } catch (err) {
    return { success: false, reason: err.message };
  }
}

// ─── Handler Principal ────────────────────────────────────────────────────────

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  const authHeader = event.headers['authorization'] || '';
  const token = authHeader.replace('Bearer ', '');
  if (!token) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) };
  }

  const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Invalid token' }) };
  }

  const { taskId, assigneeIds } = JSON.parse(event.body || '{}');
  if (!taskId || !assigneeIds || !Array.isArray(assigneeIds) || assigneeIds.length === 0) {
    return { statusCode: 400, body: JSON.stringify({ error: 'taskId and assigneeIds are required.' }) };
  }

  const { data: task, error: taskError } = await supabase
    .from('tasks')
    .select('*')
    .eq('id', taskId)
    .single();

  if (taskError || !task) {
    return { statusCode: 404, body: JSON.stringify({ error: 'Task not found.' }) };
  }

  const { data: agents, error: agentError } = await supabase
    .from('agents')
    .select('id, name, email, phone')
    .in('id', assigneeIds);

  if (agentError || !agents || agents.length === 0) {
    return { statusCode: 404, body: JSON.stringify({ error: 'Assignee agents not found.' }) };
  }

  const taskLink = `${process.env.URL || 'https://lago-hub.netlify.app'}/admin#tasks`;
  const results = { calendar: [], whatsapp: [] };

  const calendar = getGoogleCalendarClient();

  for (const agent of agents) {
    // Calendar
    try {
      const startDate = task.due_date ? new Date(task.due_date) : new Date();
      const endDate = new Date(startDate);
      endDate.setHours(endDate.getHours() + 1);

      const calendarEvent = {
        summary: `📋 Tarea Lago Hub: ${task.title}`,
        description: `Asignado a: ${agent.name} (${agent.email})\\n\\n${task.description || ''}\\n\\n🔗 Gestionar tarea: ${taskLink}`,
        start: { dateTime: startDate.toISOString(), timeZone: 'America/Caracas' },
        end: { dateTime: endDate.toISOString(), timeZone: 'America/Caracas' },
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'email', minutes: 24 * 60 },
            { method: 'popup', minutes: 30 },
          ],
        },
      };

      const { data: createdEvent } = await calendar.events.insert({
        calendarId: 'primary',
        resource: calendarEvent,
        sendUpdates: 'all',
      });

      results.calendar.push({ agentId: agent.id, success: true, eventId: createdEvent.id });
    } catch (calErr) {
      console.error(`[Calendar] Error for ${agent.name}:`, calErr.message);
      results.calendar.push({ agentId: agent.id, success: false, reason: calErr.message });
    }

    // WhatsApp
    const waResult = await sendWhatsAppMessage(
      agent.phone,
      agent.name,
      task.title,
      task.due_date,
      taskLink
    );
    results.whatsapp.push({ agentId: agent.id, ...waResult });
  }

  console.log('[Notify] Results:', JSON.stringify(results));

  return {
    statusCode: 200,
    body: JSON.stringify({ success: true, results }),
  };
};
