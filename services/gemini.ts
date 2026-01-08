import { Property } from '../types';

export const getAiResponse = async (userMessage: string, properties: Property[], chatHistory: any[] = [], language: string = 'es') => {
  try {
    const response = await fetch('/.netlify/functions/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userMessage, properties, chatHistory, language }),
    });

    if (!response.ok) {
      let errorMessage = `Lo siento, el servicio respondió con un error (${response.status}).`;
      try {
        const errorData = await response.json();
        console.error(`Status ${response.status}:`, errorData);
        if (errorData.details) {
          errorMessage += ` Detalles: ${errorData.details}`;
        }
      } catch (e) {
        const text = await response.text();
        console.error(`Status ${response.status}:`, text);
      }
      return errorMessage;
    }

    const data = await response.json();
    return data.reply;
  } catch (error: any) {
    console.error('Chat Connection Error:', error);
    return "No pude conectar con el asistente de Lago. Por favor, verifica tu conexión a internet o intenta de nuevo en unos minutos.";
  }
};
