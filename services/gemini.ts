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
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to fetch AI response');
    }

    const data = await response.json();
    return data.reply;
  } catch (error: any) {
    console.error('Chat Error:', error);
    return "I'm having trouble connecting to my service right now. Please try again later.";
  }
};
