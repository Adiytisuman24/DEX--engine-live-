import React, { useState } from 'react';
import type { Order } from '../types';
import { useUIStore } from '../store/uiStore';

interface Props {
    orders: Order[];
    onSelectOrder: (orderId: string, multi?: boolean) => void;
    // activeOrderId is managed by store now, but we might pass it down or use store directly?
    // Let's use store for UI logic, but allow overriding if simple component
    // Actually, prompt says "Hovering highlights, clicking selects" using store logic
    isCompact?: boolean;
}

export const OrdersTable: React.FC<Props> = ({ orders, onSelectOrder, isCompact = false }) => {
    const [tab, setTab] = useState<'active' | 'history'>('active');
    
    // Connect to UI Store
    const { selectedOrderIds, hoveredOrderId, setHoveredOrder } = useUIStore();

    const activeOrders = orders.filter(o => ['pending', 'routing', 'building', 'submitted'].includes(o.status));
    const historyOrders = orders.filter(o => ['confirmed', 'failed'].includes(o.status));

    const displayOrders = tab === 'active' ? activeOrders : historyOrders;
    
    // Adjust padding based on compact mode
    const rowPadding = isCompact ? '0.75rem 1rem' : '1.25rem 1.5rem';

    return (
        <div className="card" style={{ padding: 0, display: 'flex', flexDirection: 'column', border: 'none', boxShadow: 'none' }}>
            <div style={{ borderBottom: '1px solid var(--border)', display: 'flex' }}>
                <button 
                    onClick={() => setTab('active')}
                    style={{
                        padding: '1rem 1.5rem', background: 'transparent',
                        borderBottom: tab === 'active' ? '2px solid var(--text-main)' : 'none',
                        fontWeight: 600, color: tab === 'active' ? 'var(--text-main)' : 'var(--text-muted)',
                        cursor: 'pointer', borderTop: 'none', borderLeft: 'none', borderRight: 'none'
                    }}
                >
                    Active Orders ({activeOrders.length})
                </button>
                <button 
                    onClick={() => setTab('history')}
                    style={{
                        padding: '1rem 1.5rem', background: 'transparent',
                        borderBottom: tab === 'history' ? '2px solid var(--text-main)' : 'none',
                        fontWeight: 600, color: tab === 'history' ? 'var(--text-main)' : 'var(--text-muted)',
                        cursor: 'pointer', borderTop: 'none', borderLeft: 'none', borderRight: 'none'
                    }}
                >
                    History
                </button>
                {selectedOrderIds.length > 0 && <div style={{marginLeft: 'auto', display: 'flex', alignItems: 'center', paddingRight: '1rem', fontSize: '0.875rem', color: 'var(--text-muted)'}}>
                    {selectedOrderIds.length} order(s) selected
                </div>}
            </div>

            <div style={{ width: '100%' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead style={{ background: '#f9fafb', position: 'sticky', top: 0, zIndex: 1 }}>
                        <tr>
                            <th style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>ID</th>
                            <th style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>PAIR</th>
                            <th style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>STATUS</th>
                            <th style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>PRICE</th>
                        </tr>
                    </thead>
                    <tbody>
                        {displayOrders.length === 0 && (
                            <tr>
                                <td colSpan={4} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                                    <div style={{opacity: 0.5, marginBottom: '0.5rem'}}>📭</div>
                                    No orders found in {tab}
                                </td>
                            </tr>
                        )}
                        {displayOrders.map(order => {
                            const isSelected = selectedOrderIds.includes(order.orderId);
                            const isHovered = hoveredOrderId === order.orderId;
                            
                            return (
                            <tr 
                                key={order.orderId}
                                onClick={(e) => {
                                    const multi = e.metaKey || e.ctrlKey;
                                    onSelectOrder(order.orderId, multi);
                                }}
                                onMouseEnter={() => setHoveredOrder(order.orderId)}
                                onMouseLeave={() => setHoveredOrder(null)}
                                style={{ 
                                    borderBottom: '1px solid var(--border)',
                                    cursor: 'pointer',
                                    background: isHovered ? '#eff6ff' : (isSelected ? '#f3f4f6' : 'white'),
                                    transition: 'background-color 0.1s',
                                    position: 'relative'
                                }}
                                className={isHovered ? 'ring-1 ring-blue-300' : ''}
                            >
                                <td style={{ padding: rowPadding, fontFamily: 'monospace' }}>
                                    {isSelected && <span style={{color: 'var(--accent)', marginRight: 4}}>•</span>}
                                    {order.orderId.slice(0, 4)}
                                </td>
                                <td style={{ padding: rowPadding }}>
                                    <div style={{fontWeight: 500}}>{order.tokenIn}/{order.tokenOut}</div>
                                    {!isCompact && order.createdAt && <div style={{fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px'}}>{new Date(order.createdAt).toLocaleTimeString()}</div>}
                                </td>
                                <td style={{ padding: rowPadding }}>
                                    <span className={`badge badge-${order.status}`} style={{
                                        // Ensure validated/history colors are kept unless selected explicitly overrides significantly, 
                                        // but usually background handles highlight. Badge stays same.
                                    }}>
                                        {order.status}
                                    </span>
                                </td>
                                <td style={{ padding: rowPadding }}>
                                    {order.executedPrice ? `${order.executedPrice.toFixed(4)} ${order.tokenOut}` : '-'}
                                </td>
                            </tr>
                        )})}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
