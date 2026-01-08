import React, { useState, useRef, useEffect } from 'react';
import { getAiResponse } from '../services/gemini';
import { Property } from '../types';
import { useLanguage } from '../i18n/LanguageContext';

interface AiAssistantProps {
  properties: Property[];
}

const AiAssistant: React.FC<AiAssistantProps> = ({ properties }) => {
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{ role: 'user' | 'ai'; text: string }[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Initialize welcome message when language changes
  useEffect(() => {
    setMessages([{ role: 'ai', text: t.ai.welcome }]);
  }, [t.ai.welcome]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMsg = inputValue.trim();
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setInputValue('');
    setIsLoading(true);

    try {
      // Pasamos el historial actual para que la IA sepa qué ha preguntado ya
      const response = await getAiResponse(userMsg, properties, messages);
      setMessages(prev => [...prev, { role: 'ai', text: response }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'ai', text: t.common.error }]);
    }
    setIsLoading(false);
  };

  // Simple markdown-like formatter for bold and links
  const renderMessage = (text: string) => {
    // Replace **bold** with <strong>
    const boldRegex = /\*\*(.*?)\*\*/g;
    // Replace [label](url) with <a>
    const linkRegex = /\[(.*?)\]\((.*?)\)/g;

    let formattedText = text;

    // Split text into parts to handle bolding and links safely without dangerouslySetInnerHTML if possible, 
    // but for simplicity and common practice in such chat components:
    return text.split('\n').map((line, i) => (
      <p key={i} className="mb-2 last:mb-0">
        {line.split(/(\*\*.*?\*\*|\[.*?\]\(.*?\))/g).map((part, j) => {
          if (part.startsWith('**') && part.endsWith('**')) {
            return <strong key={j} className="font-bold">{part.slice(2, -2)}</strong>;
          }
          if (part.startsWith('[') && part.includes('](')) {
            const match = part.match(/\[(.*?)\]\((.*?)\)/);
            if (match) {
              return (
                <a key={j} href={match[2]} target="_blank" rel="noopener noreferrer" className="text-blue-200 underline hover:text-white transition-colors">
                  {match[1]}
                </a>
              );
            }
          }
          return part;
        })}
      </p>
    ));
  };

  return (
    <div className="fixed bottom-8 right-8 z-[100]">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-16 h-16 bg-brand-green text-white rounded-full shadow-2xl flex items-center justify-center hover:bg-brand-green/90 hover:scale-110 active:scale-95 transition-all group"
      >
        {isOpen ? (
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <div className="relative">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-blue opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-brand-blue"></span>
            </span>
          </div>
        )}
      </button>

      {isOpen && (
        <div className="absolute bottom-20 right-0 w-96 max-w-[calc(100vw-2rem)] h-[500px] bg-white rounded-3xl shadow-2xl border border-slate-100 flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
          <div className="bg-slate-900 p-6 text-white flex items-center justify-between">
            <div>
              <h3 className="font-bold text-lg">{t.ai.title}</h3>
              <p className="text-xs text-slate-400 flex items-center">
                <span className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></span>
                {t.ai.alwaysAvailable}
              </p>
            </div>
          </div>

          <div ref={scrollRef} className="flex-grow p-4 overflow-y-auto space-y-4 custom-scrollbar bg-slate-50">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] p-3 rounded-2xl text-sm ${msg.role === 'user'
                  ? 'bg-brand-green text-white rounded-br-none shadow-lg'
                  : 'bg-white text-slate-800 rounded-bl-none shadow-sm'
                  }`}>
                  {renderMessage(msg.text)}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white p-3 rounded-2xl rounded-bl-none shadow-sm flex space-x-1">
                  <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce"></div>
                  <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce delay-75"></div>
                  <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce delay-150"></div>
                </div>
              </div>
            )}
          </div>

          <div className="p-4 border-t border-slate-100 bg-white">
            <div className="flex items-center bg-slate-100 rounded-2xl p-2 focus-within:ring-2 ring-brand-green/20 transition-all">
              <input type="text" placeholder={t.ai.placeholder} className="flex-grow bg-transparent px-3 text-sm focus:outline-none text-slate-800"
                value={inputValue} onChange={(e) => setInputValue(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()} />
              <button onClick={handleSendMessage} disabled={!inputValue.trim() || isLoading} className="p-2 bg-brand-green text-white rounded-xl hover:bg-brand-green/90 disabled:opacity-50 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AiAssistant;
