import React, { useState, useEffect } from 'react';
import type { Order } from '../types';
import { useUIStore } from '../store/uiStore';

interface Props {
    orders: Order[];
    onSelectOrder: (orderId: string, multi?: boolean) => void;
    isCompact?: boolean;
}

export const OrdersTable: React.FC<Props> = ({ orders, onSelectOrder, isCompact = false }) => {
    const [tab, setTab] = useState<'active' | 'history'>('active');
    const { selectedOrderIds, hoveredOrderId, setHoveredOrder } = useUIStore();
    
    // Use an initializer function to avoid calling Date.now() during re-renders, 
    // and avoid the cascading render lint rule.
    const [now, setNow] = useState(() => Date.now()); 
    
    useEffect(() => {
        const timer = setInterval(() => setNow(Date.now()), 10000);
        return () => clearInterval(timer);
    }, []);

    const STICKY_DURATION = 2 * 60 * 1000; // 2 minutes in ms

    const isActive = (o: Order) => {
        if (['pending', 'queued', 'routing', 'route_selected', 'building', 'submitted'].includes(o.status)) return true;
        if (o.completedAt && (now - o.completedAt < STICKY_DURATION)) return true;
        return false;
    };

    const activeOrders = orders.filter(o => isActive(o));
    const historyOrders = orders.filter(o => !isActive(o));

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
                            <th style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>QUANTITY</th>
                            <th style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>STATUS</th>
                            <th style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>PRICE</th>
                        </tr>
                    </thead>
                    <tbody>
                        {displayOrders.length === 0 && (
                            <tr>
                                <td colSpan={5} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                                    <div style={{opacity: 0.5, marginBottom: '0.5rem'}}>📭</div>
                                    No orders found in {tab}
                                </td>
                            </tr>
                        )}
                        {displayOrders.map(order => {
                            const isSelected = selectedOrderIds.includes(order.orderId);
                            const isHovered = hoveredOrderId === order.orderId;
                            
                            // Use centralized simulation state for visual status
                            const { activeSimulationId, simulatedStep } = useExecutionStore.getState();
                            const displayStatus = (order.orderId === activeSimulationId && simulatedStep) 
                                ? simulatedStep 
                                : order.status;

                            const totalValue = order.executedPrice ? (order.amount * order.executedPrice) : undefined;

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
                                    <div style={{fontWeight: 500}}>{order.amount} {order.tokenIn}</div>
                                </td>
                                <td style={{ padding: rowPadding }}>
                                    <span className={`badge badge-${displayStatus}`}>
                                        {displayStatus.charAt(0).toUpperCase() + displayStatus.slice(1).replace("_", " ")}
                                    </span>
                                </td>
                                <td style={{ padding: rowPadding }}>
                                    {order.executedPrice ? (
                                        <>
                                            <div style={{fontWeight: 600}}>{order.executedPrice.toFixed(4)}</div>
                                            <div style={{fontSize: '0.7rem', color: 'var(--text-muted)'}}>
                                                Total: {totalValue?.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} {order.tokenOut}
                                            </div>
                                        </>
                                    ) : (
                                        <div style={{color: 'var(--text-muted)'}}>-</div>
                                    )}
                                </td>
                            </tr>
                        )})}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
