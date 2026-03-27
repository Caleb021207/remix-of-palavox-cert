
import React, { useRef, useEffect } from 'react';
import { ConversationMessage } from '@/hooks/useConversationConnection';

interface ConversationMessagesProps {
  messages: ConversationMessage[];
}

const ConversationMessages: React.FC<ConversationMessagesProps> = ({ messages }) => {
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  return (
    <div className="bg-palavox-ivory rounded-lg border border-gray-200 h-[400px] mb-4 overflow-y-auto p-4">
      {messages.length === 0 ? (
        <div className="h-full flex items-center justify-center text-palavox-slate">
          <p>The conversation will begin momentarily...</p>
        </div>
      ) : (
        messages.map((message, index) => (
          <div
            key={index}
            className={`mb-4 p-3 rounded-lg ${
              message.role === 'agent'
                ? 'bg-palavox-lavender mr-12'
                : message.role === 'user'
                ? 'bg-palavox-purple text-white ml-12'
                : 'bg-gray-100 text-gray-500 text-sm text-center'
            }`}
          >
            {message.text}
          </div>
        ))
      )}
      <div ref={messagesEndRef} />
    </div>
  );
};

export default ConversationMessages;
