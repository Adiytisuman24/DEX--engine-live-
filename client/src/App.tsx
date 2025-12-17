import { useEffect, useState, useRef } from 'react';
import { Navbar } from './components/Navbar';
import { OrderPanel } from './components/OrderPanel';
import { ExecutionTimeline } from './components/ExecutionTimeline';
import { OrdersTable } from './components/OrdersTable';
import type { Order, ExecutionStep } from './types';
import { useExecutionStore, type ExecutionEvent } from './store/executionStore';
import { useUIStore } from './store/uiStore';
import './App.css';

const API_URL = 'http://localhost:3000';
const WS_URL = 'ws://localhost:3000/ws';

function App() {
  const { activeOrders, executions, applyEvent, initializeOrders, addOrder } = useExecutionStore();
  const { selectOrder, activeTimelineOrderId } = useUIStore();
  
  const [loading, setLoading] = useState(false);
  const ws = useRef<WebSocket | null>(null);

  // Convert orders map to array for table
  const ordersList = Object.values(activeOrders).sort((a,b) => (b.timestamp || 0) - (a.timestamp || 0));

  useEffect(() => {
    const connect = () => {
        ws.current = new WebSocket(WS_URL);

        ws.current.onopen = () => {
            console.log('Connected to WS');
        };
        
        // Single Entry Point for WebSocket -> Store
        ws.current.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                
                // STRICT MAPPING based on User's Contract
                // Incoming: type, orderId, status, timestamp, ...misc fields
                
                const executionEvent: ExecutionEvent = {
                   orderId: data.orderId,
                   status: data.status,
                   timestamp: data.timestamp || Date.now(),
                   
                   // Extended fields
                   retryAttempt: data.attempt || data.retryAttempt || data.metadata?.retryAttempt,
                   maxRetries: data.maxAttempts || data.maxRetries || data.metadata?.maxRetries,
                   dex: data.selectedDex || data.dex || data.metadata?.selectedDex,
                   executedPrice: data.executedPrice || data.bestPrice || data.metadata?.executedPrice, // Map bestPrice for route_selected
                   error: data.error || data.metadata?.errorReason,
                   queuePosition: data.queuePosition || data.metadata?.queuePosition,
                   txHash: data.txHash || data.metadata?.txHash,
                   
                   // Keep raw for debug if needed, but try not to rely on it
                   metadata: data
                };
                
                applyEvent(executionEvent);

            } catch(e) {
                console.error("WS Parse Error", e);
            }
        };


        ws.current.onclose = () => {
             // Reconnect logic if needed
        };
    };

    const fetchOrders = async () => {
        try {
            const res = await fetch(`${API_URL}/api/orders`);
            const data = await res.json();
            initializeOrders(data);
        } catch (e) {
            console.error('Failed to fetch orders', e);
        }
    };

    fetchOrders();
    connect();

    return () => {
        ws.current?.close();
    };
  }, [initializeOrders, applyEvent]);

  // Handle execution logic
  const handleExecute = async (data: { tokenIn: string; tokenOut: string; amount: number; slippage: number; walletAddress: string }) => {
    setLoading(true);
    // No manual timeline start. We rely on events.
    // However, for UX "instant feedback", we might want to add a preliminary 'pending' order/event.
    
    try {
        const res = await fetch(`${API_URL}/api/orders/execute`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const result = await res.json();
        
        if (result.orderId) {
             const newOrder: Order = {
                orderId: result.orderId,
                status: 'pending',
                ...data,
                timestamp: Date.now()
            };
            addOrder(newOrder); // Optimistic add
            selectOrder(result.orderId, false); // Auto-select new order
            
            // Note: We don't manually run timeline. 
            // We wait for WS 'pending', 'routing', etc. events to drive the UI.
        } else {
             alert('Error: ' + JSON.stringify(result));
        }
    } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        alert(`Failed to execute order: ${msg || 'Unknown error'}`);
        console.error(e);
    } finally {
        setLoading(false);
    }
  };

  const activeTimelineOrder = activeTimelineOrderId ? activeOrders[activeTimelineOrderId] : undefined;
  // Get events for the active timeline order to render the timeline steps
  const currentEvents = activeTimelineOrderId ? (executions[activeTimelineOrderId] || []) : [];
  
  // Need to provide `currentStep` and `validations` derived from events for the ExecutionTimeline component
  // to interpret the event history visual state.
  
  // Deriving props for ExecutionTimeline from event stream
  const latestEvent = currentEvents[currentEvents.length - 1];
  const derivedCurrentStep = latestEvent ? (latestEvent.status as ExecutionStep) : null;
  const derivedValidations = currentEvents.reduce((acc, ev) => {
      acc[ev.status as string] = true;
      return acc;
  }, {} as Record<string, boolean>);
  
  const showTimeline = !!activeTimelineOrder;

  const handleSelectOrderWrapper = (id: string, multi?: boolean) => {
       selectOrder(id, multi);
       // No manual replay trigger needed. 
       // The ExecutionTimeline now reads purely from `executions[id]`.
       // Switching ID automatically switches the source data stream.
  };

  return (
    <div className="app-layout">
      <header className="app-header">
        <Navbar />
      </header>
      
      <main className="app-main">
        <aside className="left-panel">
             <OrderPanel onExecute={handleExecute} isLoading={loading} />
        </aside>

        <div className={`center-panel-wrapper ${showTimeline ? 'open' : 'closed'}`}>
             <div style={{width: '380px'}}>
                <ExecutionTimeline 
                    order={activeTimelineOrder} 
                    currentStep={derivedCurrentStep} 
                    validations={derivedValidations}
                />
             </div>
        </div>

        <section className="right-panel">
            <OrdersTable 
                orders={ordersList} 
                onSelectOrder={handleSelectOrderWrapper} 
            />
        </section>
      </main>
    </div>
  );
}

export default App;
