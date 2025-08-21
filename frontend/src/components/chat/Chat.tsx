import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage } from '../../types/chat';
import { chatApi } from '../../services/api';
import './Chat.css';

const Chat: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Add welcome message
    const welcomeMessage: ChatMessage = {
      id: '1',
      content: 'Hello! I\'m your Insurance AI Assistant. How can I help you today?',
      sender: 'ai',
      timestamp: new Date(),
    };
    setMessages([welcomeMessage]);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      content: inputMessage.trim(),
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);
    setError(null);

    try {
      const response = await chatApi.sendMessage(inputMessage.trim());
      
      // Extract the AI response - handle different possible response formats
      let aiContent = '';
      if (response.response) {
        aiContent = response.response;
      } else if (response.message) {
        aiContent = response.message;
      } else if (typeof response === 'string') {
        aiContent = response;
      } else {
        aiContent = JSON.stringify(response);
      }

      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        content: aiContent,
        sender: 'ai',
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to send message. Please try again.');
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const formatTime = (timestamp: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(timestamp);
  };

  const formatMessage = (content: string) => {
    // Split content by lines and process each line
    const lines = content.split('\n');
    const formattedLines = lines.map((line, index) => {
      const trimmedLine = line.trim();
      
      // Skip empty lines
      if (!trimmedLine) {
        return <br key={index} />;
      }
      
      // Header detection (lines ending with colon and containing keywords)
      if (trimmedLine.endsWith(':') && (
        trimmedLine.toLowerCase().includes('point') ||
        trimmedLine.toLowerCase().includes('key') ||
        trimmedLine.toLowerCase().includes('main') ||
        trimmedLine.toLowerCase().includes('following')
      )) {
        return (
          <div key={index} className="message-header">
            {trimmedLine}
          </div>
        );
      }
      
      // Numbered list items (1. 2. 3. etc.)
      if (/^\d+\.\s/.test(trimmedLine)) {
        const match = trimmedLine.match(/^(\d+\.\s)(.*)$/);
        if (match) {
          const [, number, text] = match;
          return (
            <div key={index} className="message-list-item">
              <span className="list-number">{number}</span>
              <span className="list-text">{text}</span>
            </div>
          );
        }
      }
      
      // Sub-points or indented content
      if (trimmedLine.startsWith('- ') || trimmedLine.startsWith('* ')) {
        return (
          <div key={index} className="message-sub-item">
            {trimmedLine.substring(2)}
          </div>
        );
      }
      
      // Bold text detection (**text**)
      if (trimmedLine.includes('**')) {
        const parts = trimmedLine.split(/(\*\*.*?\*\*)/g);
        return (
          <div key={index} className="message-paragraph">
            {parts.map((part, partIndex) => {
              if (part.startsWith('**') && part.endsWith('**')) {
                return <strong key={partIndex}>{part.slice(2, -2)}</strong>;
              }
              return part;
            })}
          </div>
        );
      }
      
      // Regular paragraph
      return (
        <div key={index} className="message-paragraph">
          {trimmedLine}
        </div>
      );
    });
    
    return formattedLines;
  };

  return (
    <div className="chat-container">
      <div className="chat-header">
        <h2>Insurance AI Assistant</h2>
        <p>Ask me anything about insurance policies, claims, or coverage!</p>
      </div>

      <div className="chat-messages">
        {messages.map((message) => (
          <div key={message.id} className={`message ${message.sender}`}>
            <div className="message-content">
              <div className="message-text">
                {message.sender === 'ai' ? formatMessage(message.content) : (
                  <div className="message-paragraph">{message.content}</div>
                )}
              </div>
              <span className="message-time">{formatTime(message.timestamp)}</span>
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="message ai">
            <div className="message-content">
              <div className="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {error && (
        <div className="chat-error">
          {error}
          <button onClick={() => setError(null)} className="error-close">
            ×
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="chat-input-form">
        <div className="input-container">
          <input
            ref={inputRef}
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="Type your message..."
            disabled={isLoading}
            className="chat-input"
            autoFocus
          />
          <button 
            type="submit" 
            disabled={!inputMessage.trim() || isLoading}
            className="chat-send-button"
          >
            {isLoading ? '...' : 'Send'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default Chat;