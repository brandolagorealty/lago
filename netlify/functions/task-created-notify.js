// netlify/functions/task-created-notify.js
// Se activa desde el frontend al crear una tarea.
// 1. Crea un evento en Google Calendar del asesor asignado.
// 2. Envía un mensaje de WhatsApp al asesor notificándole la nueva tarea.

const { createClient } = require('@supabase/supabase-js');
const { google } = require('googleapis');

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Limpia un número de teléfono y lo convierte al formato internacional de Venezuela (+58).
 * Acepta formatos: 04XX-XXXXXXX, 04XXXXXXXXX, 58XXXXXXXXXX
 */
function formatVenezuelaPhone(phone) {
  if (!phone) return null;
  // Eliminar caracteres no numéricos
  const digits = phone.replace(/\D/g, '');
  
  if (digits.startsWith('58') && digits.length === 12) return digits;
  if (digits.startsWith('04') && digits.length === 11) return '58' + digits.substring(1);
  if (digits.startsWith('4') && digits.length === 10) return '58' + digits;
  
  return null; // Formato no reconocido
}

/**
 * Crea un cliente de Google Calendar autenticado mediante Service Account.
 */
function getGoogleCalendarClient() {
  const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/calendar'],
  });
  return google.calendar({ version: 'v3', auth });
}

/**
 * Envía un mensaje de WhatsApp usando la API de Meta.
 */
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
}

// ─── Handler Principal ────────────────────────────────────────────────────────

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  // 1. Autenticar al usuario que llama (debe ser superadmin o assignor)
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

  // 2. Leer los datos de la tarea del body de la petición
  const { taskId, assigneeId } = JSON.parse(event.body || '{}');
  if (!taskId || !assigneeId) {
    return { statusCode: 400, body: JSON.stringify({ error: 'taskId and assigneeId are required.' }) };
  }

  // 3. Obtener los detalles completos de la tarea
  const { data: task, error: taskError } = await supabase
    .from('tasks')
    .select('*')
    .eq('id', taskId)
    .single();

  if (taskError || !task) {
    return { statusCode: 404, body: JSON.stringify({ error: 'Task not found.' }) };
  }

  // 4. Obtener datos del asesor (correo y teléfono)
  const { data: agent, error: agentError } = await supabase
    .from('agents')
    .select('name, email, phone')
    .eq('id', assigneeId)
    .single();

  if (agentError || !agent) {
    return { statusCode: 404, body: JSON.stringify({ error: 'Assignee agent not found.' }) };
  }

  const taskLink = `${process.env.URL || 'https://lago-hub.netlify.app'}/admin#tasks`;
  const results = { calendar: null, whatsapp: null };

  // 5. Crear evento en Google Calendar del asesor
  try {
    const calendar = getGoogleCalendarClient();

    const startDate = task.due_date ? new Date(task.due_date) : new Date();
    const endDate = new Date(startDate);
    endDate.setHours(endDate.getHours() + 1); // Evento de 1 hora

    const calendarEvent = {
      summary: `📋 Tarea Lago Hub: ${task.title}`,
      description: `Asignado a: ${agent.name} (${agent.email})\n\n${task.description || ''}\n\n🔗 Gestionar tarea: ${taskLink}`,
      start: { dateTime: startDate.toISOString(), timeZone: 'America/Caracas' },
      end: { dateTime: endDate.toISOString(), timeZone: 'America/Caracas' },
      // No incluimos attendees para evitar error de Domain-Wide Delegation
      // El asesor recibe la notificación por WhatsApp con el link directo
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 24 * 60 }, // 1 día antes
          { method: 'popup', minutes: 30 },       // 30 min antes
        ],
      },
    };

    const { data: createdEvent } = await calendar.events.insert({
      calendarId: 'primary',
      resource: calendarEvent,
      sendUpdates: 'all', // Envía la invitación por correo al asesor
    });

    results.calendar = { success: true, eventId: createdEvent.id };
    console.log(`[Calendar] Event created: ${createdEvent.htmlLink}`);
  } catch (calErr) {
    console.error('[Calendar] Error:', calErr.message);
    results.calendar = { success: false, reason: calErr.message };
  }

  // 6. Enviar mensaje de WhatsApp
  results.whatsapp = await sendWhatsAppMessage(
    agent.phone,
    agent.name, // Añadimos el nombre para la plantilla
    task.title,
    task.due_date,
    taskLink
  );

  console.log('[Notify] Results:', JSON.stringify(results));

  return {
    statusCode: 200,
    body: JSON.stringify({ success: true, results }),
  };
};
