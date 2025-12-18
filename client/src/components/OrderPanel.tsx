import React, { useState, useEffect } from 'react';
import { AlertCircle, ArrowRight, Wallet } from 'lucide-react';
import { useModeStore } from '../store/modeStore';
import { fetchTopTokens } from '../services/coinGecko';
import type { Token } from '../types';

interface Props {
    onExecute: (data: { tokenIn: string; tokenOut: string; amount: number; slippage: number; walletAddress: string }) => void;
    isLoading: boolean;
}

export const OrderPanel: React.FC<Props> = ({ onExecute, isLoading }) => {
    const [tokens, setTokens] = useState<Token[]>([
         { id: 'solana', symbol: 'SOL', name: 'Solana', image: 'https://assets.coingecko.com/coins/images/4128/thumb/solana.png', current_price: 0 },
         { id: 'usd-coin', symbol: 'USDC', name: 'USDC', image: 'https://assets.coingecko.com/coins/images/6319/thumb/USD_Coin_icon.png', current_price: 1 },
         { id: 'bitcoin', symbol: 'BTC', name: 'Bitcoin', image: 'https://assets.coingecko.com/coins/images/1/thumb/bitcoin.png', current_price: 0 },
         { id: 'ethereum', symbol: 'ETH', name: 'Ethereum', image: 'https://assets.coingecko.com/coins/images/279/thumb/ethereum.png', current_price: 0 },
         { id: 'tether', symbol: 'USDT', name: 'Tether', image: 'https://assets.coingecko.com/coins/images/325/thumb/Tether.png', current_price: 1 },
         { id: 'bonk', symbol: 'BONK', name: 'Bonk', image: 'https://assets.coingecko.com/coins/images/28431/thumb/bonk.png', current_price: 0 },
    ]);
    const [tokenIn, setTokenIn] = useState('SOL');
    const [tokenOut, setTokenOut] = useState('USDC');
    const [amount, setAmount] = useState<string>('1.5');
    const [slippage, setSlippage] = useState<number>(0.01);
    const [walletAddress, setWalletAddress] = useState('');
    const [isTokenListLoading, setIsTokenListLoading] = useState(false);
    const { mode, devnetConfig } = useModeStore();

    // Auto-sync wallet address from devnet config if available
    useEffect(() => {
        if (mode === 'devnet' && devnetConfig?.walletAddress) {
            setWalletAddress(devnetConfig.walletAddress);
        }
    }, [mode, devnetConfig]);

    useEffect(() => {
        const loadTokens = async () => {
            try {
                setIsTokenListLoading(true);
                const data = await fetchTopTokens();
                if (data && data.length > 0) {
                     setTokens(data);
                }
            } catch (e) {
                 console.error('OrderPanel: Error loading tokens', e);
            } finally {
                 setIsTokenListLoading(false);
            }
        };
        loadTokens();
    }, []);

    const handleSubmit = () => {
        if (!walletAddress.trim()) {
             alert('Error: Please enter a valid Wallet Address');
             return;
        }
        const val = parseFloat(amount);
        if (val > 0) {
            onExecute({ tokenIn, tokenOut, amount: val, slippage, walletAddress });
        }
    };

    const getTokenImage = (symbol: string) => {
        const token = tokens.find(t => t.symbol === symbol);
        return token?.image;
    };

    return (
        <div className="card">
            <h2 style={{ marginBottom: '1.5rem' }}>New Market Order</h2>
            
            <div className="input-group">
                <label className="input-label">Token Pair</label>
                <div style={{ 
                    padding: '0.75rem', border: '1px solid var(--border)', borderRadius: '8px',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    background: '#f9fafb', gap: '0.5rem'
                }}>
                    <div style={{ flex: 1 }}>
                        <select 
                            value={tokenIn}
                            onChange={(e) => setTokenIn(e.target.value)}
                            disabled={isTokenListLoading}
                            style={{ 
                                width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border)',
                                fontWeight: 600, background: 'white'
                            }}
                        >
                            {isTokenListLoading ? (
                                <option>Loading...</option>
                            ) : (
                                tokens.map(t => (
                                    <option key={t.id} value={t.symbol}>{t.symbol}</option>
                                ))
                            )}
                        </select>
                         <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            {getTokenImage(tokenIn) ? (
                                <img src={getTokenImage(tokenIn)} alt={tokenIn} style={{ width: 16, height: 16, borderRadius: '50%' }} />
                            ) : (
                                <div style={{ width: 16, height: 16, background: '#ccc', borderRadius: '50%' }} />
                            )}
                            <span>In</span>
                        </div>
                    </div>

                    <ArrowRight size={16} className="text-muted" />

                    <div style={{ flex: 1 }}>
                        <select 
                            value={tokenOut}
                            onChange={(e) => setTokenOut(e.target.value)}
                            disabled={isTokenListLoading}
                            style={{ 
                                width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border)',
                                fontWeight: 600, background: 'white'
                            }}
                        >
                            {isTokenListLoading ? (
                                <option>Loading...</option>
                            ) : (
                                tokens.map(t => (
                                    <option key={t.id} value={t.symbol}>{t.symbol}</option>
                                ))
                            )}
                        </select>
                         <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            {getTokenImage(tokenOut) ? (
                                <img src={getTokenImage(tokenOut)} alt={tokenOut} style={{ width: 16, height: 16, borderRadius: '50%' }} />
                            ) : (
                                <div style={{ width: 16, height: 16, background: '#ccc', borderRadius: '50%' }} />
                            )}
                            <span>Out</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="input-group">
                <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Wallet size={14} />
                    Wallet Address {mode === 'devnet' && <span style={{ fontSize: '0.7rem', color: 'var(--success)', fontWeight: 'bold' }}>(Verified)</span>}
                </label>
                <input 
                    type="text" 
                    className="input-field" 
                    value={walletAddress}
                    onChange={e => setWalletAddress(e.target.value)}
                    placeholder="Enter Solana wallet address..."
                    disabled={mode === 'devnet'}
                    style={{ 
                        background: mode === 'devnet' ? '#f0f9ff' : 'white',
                        cursor: mode === 'devnet' ? 'not-allowed' : 'text',
                        borderColor: mode === 'devnet' ? '#bae6fd' : 'var(--border)',
                        fontFamily: 'monospace'
                    }}
                />
            </div>

            <div className="input-group">
                <label className="input-label">Amount ({tokenIn})</label>
                <input 
                    type="number" 
                    className="input-field" 
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    min="0.1"
                    step="0.1"
                />
                {amount && !isNaN(parseFloat(amount)) && (
                    <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        Estimated Output: <strong>{(parseFloat(amount) * 150).toLocaleString()} {tokenOut}</strong> (Mock)
                    </div>
                )}
            </div>

            <div className="input-group">
                <label className="input-label">Slippage Tolerance</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {[0.005, 0.01, 0.02].map(val => (
                        <button 
                            key={val}
                            onClick={() => setSlippage(val)}
                            style={{
                                flex: 1, padding: '0.5rem', borderRadius: '6px', border: '1px solid var(--border)',
                                background: slippage === val ? 'var(--text-main)' : 'white',
                                color: slippage === val ? 'white' : 'var(--text-main)',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}
                        >
                            {val * 100}%
                        </button>
                    ))}
                </div>
            </div>

            <div style={{ marginTop: '30px' }}>
                <button
                    onClick={handleSubmit}
                    disabled={isLoading || !amount || tokenIn === tokenOut}
                    style={{
                        width: '100%',
                        padding: '1rem',
                        background: tokenIn === tokenOut ? 'var(--text-muted)' : 'var(--text-main)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontWeight: 600,
                        fontSize: '1rem',
                        cursor: isLoading || tokenIn === tokenOut ? 'not-allowed' : 'pointer',
                        opacity: isLoading ? 0.7 : 1,
                        transition: 'opacity 0.2s'
                    }}
                >
                    {isLoading ? 'Processing...' : tokenIn === tokenOut ? 'Invalid Pair' : 'Execute Market Order'}
                </button>
            </div>
            
             <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                <AlertCircle size={16} />
                <span>Market orders only. Limit orders coming soon.</span>
            </div>
        </div>
    );
};
