"use client";

import React, { useState, useRef, useEffect, useCallback, useContext } from 'react';
import { MessageCircle, X, Send, ShoppingBag, Loader2, Sparkles, ExternalLink } from 'lucide-react';
import { AppContext } from '@/context/app-provider';
import { allProducts } from '@/lib/mock-data';
import Link from 'next/link';
import Image from 'next/image';

// ─── Types ─────────────────────────────────────────────────
interface ChatProduct {
    id: string;
    name: string;
    slug: string;
    description: string;
    price: number;
    originalPrice?: number;
    image: string;
    category: string;
    brand: string;
    rating: number;
}

interface ChatMessage {
    id: string;
    role: 'user' | 'bot';
    text: string;
    products?: ChatProduct[];
    timestamp: Date;
}

// ─── Helper: match product from DB to mock data for image/slug ──
function enrichProduct(product: ChatProduct): ChatProduct {
    const mockMatch = allProducts.find(p => p.id === product.id);
    if (mockMatch) {
        return {
            ...product,
            image: mockMatch.image || product.image,
            slug: mockMatch.slug || product.slug,
        };
    }
    return product;
}

// ─── Chat Product Card ─────────────────────────────────────
function ChatProductCard({ product }: { product: ChatProduct }) {
    const appContext = useContext(AppContext);
    const enriched = enrichProduct(product);

    const handleAddToCart = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        const fullProduct = allProducts.find(p => p.id === enriched.id);
        if (fullProduct && appContext) {
            appContext.addToCart(fullProduct);
        }
    };

    return (
        <Link
            href={`/products/${enriched.slug}`}
            className="chat-product-card"
            style={{ textDecoration: 'none', color: 'inherit' }}
        >
            <div className="chat-product-image-wrap">
                <Image
                    src={enriched.image || 'https://placehold.co/120x120.png'}
                    alt={enriched.name}
                    width={180}
                    height={110}
                    className="chat-product-img"
                    unoptimized
                />
            </div>
            <div className="chat-product-info">
                <h4 className="chat-product-name">{enriched.name}</h4>
                <div className="chat-product-meta">
                    <span className="chat-product-price">${enriched.price.toFixed(2)}</span>
                    {enriched.originalPrice && (
                        <span className="chat-product-original-price">${enriched.originalPrice.toFixed(2)}</span>
                    )}
                </div>
                <div className="chat-product-rating">
                    {'★'.repeat(Math.round(enriched.rating))}{'☆'.repeat(5 - Math.round(enriched.rating))}
                    <span className="chat-product-rating-num">{enriched.rating}</span>
                </div>
                <div className="chat-product-actions">
                    <button onClick={handleAddToCart} className="chat-add-to-cart-btn">
                        <ShoppingBag size={14} />
                        Add to Cart
                    </button>
                    <span className="chat-view-btn">
                        <ExternalLink size={12} />
                        View
                    </span>
                </div>
            </div>
        </Link>
    );
}

// ─── Typing Indicator ──────────────────────────────────────
function TypingIndicator() {
    return (
        <div className="chat-message bot">
            <div className="chat-avatar bot-avatar">
                <Sparkles size={16} />
            </div>
            <div className="chat-bubble bot-bubble typing-indicator">
                <span className="dot"></span>
                <span className="dot"></span>
                <span className="dot"></span>
            </div>
        </div>
    );
}

// ─── Main Chat Widget ──────────────────────────────────────
export default function ChatWidget() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Auto-scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isLoading]);

    // Focus input when chat opens
    useEffect(() => {
        if (isOpen) {
            setTimeout(() => inputRef.current?.focus(), 300);
        }
    }, [isOpen]);

    // Add greeting on first open
    const handleToggle = useCallback(() => {
        setIsOpen(prev => {
            const next = !prev;
            if (next && messages.length === 0) {
                setMessages([{
                    id: 'greeting',
                    role: 'bot',
                    text: "Hi there! 👋 I'm your AI Shopping Assistant. Tell me what you're looking for and I'll find the perfect products for you!",
                    timestamp: new Date(),
                }]);
            }
            return next;
        });
    }, [messages.length]);

    // Build conversation history string
    const buildHistory = useCallback(() => {
        return messages
            .slice(-6)
            .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.text}`)
            .join('\n');
    }, [messages]);

    // Send message
    const handleSend = useCallback(async () => {
        const trimmedInput = input.trim();
        if (!trimmedInput || isLoading) return;

        const userMessage: ChatMessage = {
            id: `user-${Date.now()}`,
            role: 'user',
            text: trimmedInput,
            timestamp: new Date(),
        };

        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            const history = buildHistory();
            const res = await fetch('/api/chat/message', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: trimmedInput, history }),
            });

            const data = await res.json();

            const botMessage: ChatMessage = {
                id: `bot-${Date.now()}`,
                role: 'bot',
                text: data.message || "I couldn't process that. Please try again!",
                products: data.products || [],
                timestamp: new Date(),
            };

            setMessages(prev => [...prev, botMessage]);
        } catch {
            setMessages(prev => [...prev, {
                id: `error-${Date.now()}`,
                role: 'bot',
                text: "Oops! Something went wrong. Please try again. 😅",
                timestamp: new Date(),
            }]);
        } finally {
            setIsLoading(false);
        }
    }, [input, isLoading, buildHistory]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <>
            {/* ─── Chat Window ──────────────────────────── */}
            <div className={`chat-widget-container ${isOpen ? 'chat-open' : 'chat-closed'}`}>
                {/* Header */}
                <div className="chat-header">
                    <div className="chat-header-info">
                        <div className="chat-header-avatar">
                            <Sparkles size={20} />
                        </div>
                        <div>
                            <h3 className="chat-header-title">AI Shopping Assistant</h3>
                            <p className="chat-header-subtitle">Ask me anything about products</p>
                        </div>
                    </div>
                    <button onClick={handleToggle} className="chat-close-btn" aria-label="Close chat">
                        <X size={20} />
                    </button>
                </div>

                {/* Messages */}
                <div className="chat-messages">
                    {messages.map((msg) => (
                        <React.Fragment key={msg.id}>
                            {/* Message bubble */}
                            <div className={`chat-message ${msg.role}`}>
                                {msg.role === 'bot' && (
                                    <div className="chat-avatar bot-avatar">
                                        <Sparkles size={16} />
                                    </div>
                                )}
                                <div className={`chat-bubble ${msg.role}-bubble`}>
                                    <p>{msg.text}</p>
                                </div>
                            </div>

                            {/* Product cards — inline, right after the message */}
                            {msg.products && msg.products.length > 0 && (
                                <div className="chat-products-carousel">
                                    {msg.products.map((product, idx) => (
                                        <ChatProductCard key={product.id || idx} product={product} />
                                    ))}
                                </div>
                            )}
                        </React.Fragment>
                    ))}

                    {isLoading && <TypingIndicator />}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div className="chat-input-area">
                    <input
                        ref={inputRef}
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Looking for something? Ask me..."
                        className="chat-input"
                        disabled={isLoading}
                    />
                    <button
                        onClick={handleSend}
                        disabled={!input.trim() || isLoading}
                        className="chat-send-btn"
                        aria-label="Send message"
                    >
                        {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                    </button>
                </div>
            </div>

            {/* ─── Floating Bubble ──────────────────────── */}
            <button
                onClick={handleToggle}
                className={`chat-fab ${isOpen ? 'chat-fab-hidden' : ''}`}
                aria-label="Open AI Shopping Assistant"
            >
                <MessageCircle size={28} />
                <span className="chat-fab-pulse" />
            </button>
        </>
    );
}
