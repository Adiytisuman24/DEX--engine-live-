import { useState } from 'react';
import { useModeStore } from '../store/modeStore';
import { DevnetModal } from './DevnetModal';

export const Navbar: React.FC = () => {
    const { mode, devnetConfig, clearDevnetConfig } = useModeStore();
    const [showModal, setShowModal] = useState(false);

    const handleModeToggle = () => {
        if (mode === 'mock') {
            setShowModal(true);
        } else {
            // Switch back to mock
            if (confirm('Switch back to Mock mode?')) {
                clearDevnetConfig();
            }
        }
    };

    const formatBalance = (balance: number) => {
        return balance.toFixed(4);
    };

    const truncateAddress = (address: string) => {
        return `${address.slice(0, 4)}...${address.slice(-4)}`;
    };

    return (
        <>
            <nav style={{
                height: 'var(--nav-height)',
                borderBottom: '1px solid var(--border)',
                background: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0 1.5rem',
                zIndex: 10
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ 
                        width: 32, height: 32, background: 'var(--text-main)', 
                        borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: 'white', fontWeight: 'bold'
                    }}>M</div>
                    <span style={{ fontWeight: 600, fontSize: '1.125rem' }}>DEX Order Execution Engine</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
                    {/* Mode Toggle */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <button
                            onClick={handleModeToggle}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                padding: '0.5rem 1rem',
                                background: mode === 'devnet' ? '#eff6ff' : '#ecfdf5',
                                border: `1px solid ${mode === 'devnet' ? '#3b82f6' : '#10b981'}`,
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontSize: '0.875rem',
                                fontWeight: 500,
                                color: mode === 'devnet' ? '#1e40af' : '#047857',
                                transition: 'all 0.2s'
                            }}
                        >
                            <div style={{
                                width: '8px',
                                height: '8px',
                                borderRadius: '50%',
                                background: mode === 'devnet' ? '#3b82f6' : '#10b981'
                            }} />
                            {mode === 'mock' ? 'Mock Network' : 'Devnet'}
                        </button>

                        {mode === 'devnet' && devnetConfig && (
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '1rem',
                                padding: '0.5rem 1rem',
                                background: '#f9fafb',
                                borderRadius: '6px',
                                fontSize: '0.75rem'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <span style={{ color: '#6b7280' }}>Wallet:</span>
                                    <span style={{ fontFamily: 'monospace', fontWeight: 500 }}>
                                        {truncateAddress(devnetConfig.walletAddress)}
                                    </span>
                                </div>
                                <div style={{ width: '1px', height: '16px', background: '#d1d5db' }} />
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <span style={{ color: '#6b7280' }}>Balance:</span>
                                    <span style={{ fontWeight: 600, color: '#047857' }}>
                                        {formatBalance(devnetConfig.balance)} SOL
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>
                    
                    <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <div style={{ width: 8, height: 8, background: '#10b981', borderRadius: '50%' }} />
                            All systems operational
                        </div>
                    </div>
                </div>
            </nav>

            {showModal && <DevnetModal onClose={() => setShowModal(false)} />}
        </>
    );
};
