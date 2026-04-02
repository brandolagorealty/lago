// netlify/functions/daily-reminders.js
// Función programada (Cron Job) que se ejecuta todos los días a las 12:00 PM (hora Venezuela).
// Revisa las tareas pendientes y envía un recordatorio por WhatsApp a cada asesor.

// Schedule: 16:00 UTC = 12:00 PM Venezuela (UTC-4)
// En netlify.toml se configura el schedule: "0 16 * * *"

const { createClient } = require('@supabase/supabase-js');

/**
 * Limpia un número de teléfono y lo convierte al formato internacional de Venezuela (+58).
 */
function formatVenezuelaPhone(phone) {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('58') && digits.length === 12) return digits;
  if (digits.startsWith('04') && digits.length === 11) return '58' + digits.substring(1);
  if (digits.startsWith('4') && digits.length === 10) return '58' + digits;
  return null;
}

/**
 * Envía un recordatorio de tarea pendiente vía WhatsApp.
 */
async function sendTaskReminder(phone, agentName, taskTitle, taskDescription, dueDate, taskLink) {
  const phoneId = process.env.META_PHONE_ID;
  const token = process.env.META_WHATSAPP_TOKEN;
  const templateName = process.env.META_TEMPLATE_NAME || 'alerta_tarea_pendiente';

  const formattedPhone = formatVenezuelaPhone(phone);
  if (!formattedPhone || !phoneId || !token) {
    console.warn(`[Reminder] Skipping ${agentName}: invalid phone or missing config.`);
    return { success: false };
  }

  const dueDateFormatted = dueDate
    ? new Date(dueDate).toLocaleDateString('es-VE', { day: '2-digit', month: 'long', year: 'numeric' })
    : 'Sin fecha límite';

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
      console.error(`[Reminder] WA error for ${agentName}:`, JSON.stringify(result));
      return { success: false };
    }

    console.log(`[Reminder] ✅ Sent to ${agentName} (${formattedPhone})`);
    return { success: true };
  } catch (err) {
    console.error(`[Reminder] Fetch error for ${agentName}:`, err.message);
    return { success: false };
  }
}

// ─── Handler Principal ────────────────────────────────────────────────────────

exports.handler = async () => {
  console.log('[daily-reminders] 🚀 Starting daily task reminder sweep...');

  const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const taskLink = `${process.env.URL || 'https://lago-hub.netlify.app'}/admin#tasks`;

  // 1. Obtener todas las tareas que NO estén finalizadas y tengan un asignado
  const { data: tasks, error: tasksError } = await supabase
    .from('tasks')
    .select('id, title, description, due_date, assignee_id, status')
    .not('status', 'eq', 'done')
    .not('assignee_id', 'is', null);

  if (tasksError) {
    console.error('[daily-reminders] Error fetching tasks:', tasksError.message);
    return { statusCode: 500, body: 'Error fetching tasks' };
  }

  if (!tasks || tasks.length === 0) {
    console.log('[daily-reminders] No pending tasks found. All clear! ✅');
    return { statusCode: 200, body: 'No pending tasks' };
  }

  console.log(`[daily-reminders] Found ${tasks.length} pending task(s). Processing...`);

  // 2. Obtener IDs únicos de asesores asignados para hacer solo una consulta a la BD
  const uniqueAssigneeIds = [...new Set(tasks.map((t) => t.assignee_id))];

  const { data: agents, error: agentsError } = await supabase
    .from('agents')
    .select('id, name, phone')
    .in('id', uniqueAssigneeIds);

  if (agentsError) {
    console.error('[daily-reminders] Error fetching agents:', agentsError.message);
    return { statusCode: 500, body: 'Error fetching agents' };
  }

  // Crear mapa de asesores por ID para acceso rápido
  const agentMap = {};
  agents.forEach((a) => { agentMap[a.id] = a; });

  // 3. Enviar recordatorio por cada tarea en paralelo
  const reminderPromises = tasks.map((task) => {
    const agent = agentMap[task.assignee_id];
    if (!agent) return Promise.resolve({ success: false, reason: 'Agent not found' });
    return sendTaskReminder(
      agent.phone,
      agent.name,
      task.title,
      task.description,
      task.due_date,
      taskLink
    );
  });

  const results = await Promise.all(reminderPromises);
  const successCount = results.filter((r) => r.success).length;

  console.log(`[daily-reminders] ✅ Finished. ${successCount}/${tasks.length} reminders sent successfully.`);

  return {
    statusCode: 200,
    body: JSON.stringify({ sent: successCount, total: tasks.length }),
  };
};
