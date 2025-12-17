import React from 'react';

export const Navbar: React.FC = () => {
    return (
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
                    <span style={{ 
                        padding: '0.25rem 0.5rem', background: '#ecfdf5', color: '#047857', 
                        borderRadius: '4px', fontWeight: 500 
                    }}>Mock Network</span>
                </div>
                
                <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{ width: 8, height: 8, background: '#10b981', borderRadius: '50%' }} />
                        All systems operational
                    </div>
                </div>
            </div>
        </nav>
    );
};
