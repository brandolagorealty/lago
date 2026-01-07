import { Property } from '../types';

export const getAiResponse = async (userMessage: string, properties: Property[]) => {
  try {
    const response = await fetch('/.netlify/functions/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userMessage, properties }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`AI Assistant Error (${response.status}):`, errorText);
      return `Lo siento, el servicio respondió con un error (${response.status}). Por favor, intenta de nuevo más tarde o reporta este error.`;
    }

    const data = await response.json();
    return data.reply;
  } catch (error: any) {
    console.error('Chat Connection Error:', error);
    return "No pude conectar con el asistente de Lago. Por favor, verifica tu conexión a internet o intenta de nuevo en unos minutos.";
  }
};
