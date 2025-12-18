import { useState } from 'react';
import { useModeStore } from '../store/modeStore';
import { API_URL } from '../config';

export const DevnetModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const { setDevnetConfig, setMode } = useModeStore();
    const [walletAddress, setWalletAddress] = useState('');
    const [apiKey, setApiKey] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleVerify = async () => {
        setLoading(true);
        setError('');

        if (!apiKey) {
            setError('API Key is strictly required for Devnet Mode.');
            setLoading(false);
            return;
        }

        try {
            const res = await fetch(`${API_URL}/api/verify-wallet`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ walletAddress, apiKey })
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Verification failed');
            }

            const data = await res.json();

            setDevnetConfig({
                walletAddress,
                apiKey,
                balance: data.balance,
                verified: true
            });

            setMode('devnet');
            onClose();
        } catch (e: any) {
            setError(e.message || 'Failed to verify wallet');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
        }}>
            <div style={{
                background: 'white',
                borderRadius: '12px',
                padding: '2rem',
                width: '480px',
                maxWidth: '90vw',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
            }}>
                <h2 style={{ margin: 0, marginBottom: '1.5rem', fontSize: '1.5rem', fontWeight: 600 }}>
                    Enable Devnet Mode
                </h2>

                <div style={{ marginBottom: '1.5rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.875rem' }}>
                        Wallet Address
                    </label>
                    <input
                        type="text"
                        value={walletAddress}
                        onChange={(e) => setWalletAddress(e.target.value)}
                        placeholder="Enter Solana wallet address"
                        style={{
                            width: '100%',
                            padding: '0.75rem',
                            border: '1px solid #d1d5db',
                            borderRadius: '6px',
                            fontSize: '0.875rem',
                            fontFamily: 'monospace'
                        }}
                    />
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.875rem' }}>
                        RPC API Key (Required)
                    </label>
                    <input
                        type="password"
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        placeholder="e.g. Helius / QuickNode API Key"
                        style={{
                            width: '100%',
                            padding: '0.75rem',
                            border: '1px solid #d1d5db',
                            borderRadius: '6px',
                            fontSize: '0.875rem'
                        }}
                    />
                    <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.75rem', color: '#6b7280' }}>
                        Please fetch an API Key from your Solana RPC provider (e.g. Helius, Alchemy).
                    </p>
                </div>

                {error && (
                    <div style={{
                        padding: '0.75rem',
                        background: '#fef2f2',
                        border: '1px solid #fecaca',
                        borderRadius: '6px',
                        color: '#dc2626',
                        fontSize: '0.875rem',
                        marginBottom: '1.5rem'
                    }}>
                        {error}
                    </div>
                )}

                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                    <button
                        onClick={onClose}
                        disabled={loading}
                        style={{
                            padding: '0.75rem 1.5rem',
                            background: 'white',
                            border: '1px solid #d1d5db',
                            borderRadius: '6px',
                            fontWeight: 500,
                            cursor: loading ? 'not-allowed' : 'pointer',
                            opacity: loading ? 0.5 : 1
                        }}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleVerify}
                        disabled={!walletAddress || !apiKey || loading}
                        style={{
                            padding: '0.75rem 1.5rem',
                            background: (!walletAddress || !apiKey || loading) ? '#9ca3af' : '#3b82f6',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            fontWeight: 500,
                            cursor: (!walletAddress || !apiKey || loading) ? 'not-allowed' : 'pointer'
                        }}
                    >
                        {loading ? 'Verifying...' : 'Verify & Enable'}
                    </button>
                </div>
            </div>
        </div>
    );
};
