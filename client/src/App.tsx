import { useEffect, useState, useRef } from 'react';
import { Navbar } from './components/Navbar';
import { OrderPanel } from './components/OrderPanel';
import { ExecutionTimeline } from './components/ExecutionTimeline';
import { OrdersTable } from './components/OrdersTable';
import type { Order, ExecutionStep } from './types';
import { useExecutionStore, type ExecutionEvent } from './store/executionStore';
import { useUIStore } from './store/uiStore';
import { useModeStore } from './store/modeStore';
import './App.css';

import { API_URL, WS_URL } from './config';
import { TIMELINE } from './utils/timelineController';

if (import.meta.env.PROD && API_URL.includes('MISSING-URL')) {
    console.error('⚠️ CRITICAL: You are in PRODUCTION but have not set RENDER_BACKEND_URL in client/src/config.ts');
}

console.log('🔗 API Configuration:', { API_URL, WS_URL });

function App() {
  const { activeOrders, executions, applyEvent, initializeOrders, addOrder } = useExecutionStore();
  const activeOrdersSafe = activeOrders || {};
  const executionsSafe = executions || {};
  const { selectOrder, activeTimelineOrderId } = useUIStore();
  const { mode } = useModeStore();
  
  const [loading, setLoading] = useState(false);
  const [backendConnected, setBackendConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const ws = useRef<WebSocket | null>(null);

  // Sync mode to window for global access
  useEffect(() => {
    (window as any).executionMode = mode;
  }, [mode]);

  // Convert orders map to array for table
  const ordersList = Object.values(activeOrdersSafe).sort((a,b) => (b.timestamp || 0) - (a.timestamp || 0));

  useEffect(() => {
    const connect = () => {
        try {
            ws.current = new WebSocket(WS_URL);

            ws.current.onopen = () => {
                console.log('✅ WebSocket Connected');
                setBackendConnected(true);
                setConnectionError(null);
            };
        } catch (error) {
            console.error('❌ WebSocket connection failed:', error);
            setBackendConnected(false);
            setConnectionError('Backend server is offline');
        }
        
        // Single Entry Point for WebSocket -> Store
        if (ws.current) {
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
                       retryAttempt: data.attempt || data.retryAttempt || data.metadata?.retryAttempt || data.metadata?.retry_attempt,
                       maxRetries: data.maxAttempts || data.maxRetries || data.metadata?.maxRetries || data.metadata?.max_retries,
                       dex: data.selectedDex || data.dex || data.metadata?.selectedDex || data.metadata?.selected_dex,
                       executedPrice: data.executedPrice ?? data.metadata?.executedPrice ?? data.metadata?.executed_price ?? data.bestPrice, 
                       error: data.error || data.metadata?.error || data.metadata?.errorReason || data.metadata?.error_reason,
                       queuePosition: data.queuePosition || data.metadata?.queuePosition || data.metadata?.queue_position,
                       txHash: data.txHash || data.metadata?.txHash || data.metadata?.tx_hash,
                       
                       // Keep raw for debug if needed, but try not to rely on it
                       metadata: data
                    };
                    
                    applyEvent(executionEvent);

                } catch(e) {
                    console.error("WS Parse Error", e);
                }
            };
        }


        if (ws.current) {
            ws.current.onerror = (error) => {
                console.error('❌ WebSocket error:', error);
                setBackendConnected(false);
                setConnectionError('Connection error - is the backend running?');
            };

            ws.current.onclose = () => {
                console.log('🔌 WebSocket disconnected');
                setBackendConnected(false);
                // Auto-reconnect after 5 seconds
                setTimeout(() => {
                    console.log('🔄 Attempting to reconnect...');
                    connect();
                }, 5000);
            };
        }
    };

    const fetchOrders = async () => {
        try {
            const res = await fetch(`${API_URL}/api/orders`, {
                signal: AbortSignal.timeout(5000) // 5 second timeout
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            initializeOrders(data);
            setBackendConnected(true);
            setConnectionError(null);
        } catch (e) {
            console.error('❌ Failed to fetch orders:', e);
            setBackendConnected(false);
            setConnectionError('Cannot reach backend server');
        }
    };

    fetchOrders();
    connect();

    return () => {
        ws.current?.close();
    };
  }, [initializeOrders, applyEvent]);

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      // simulationTimers.current.forEach(t => clearTimeout(t)); // This was removed as simulation is now centralized
    };
  }, []);

  // This was moved to the store
  // const startSimulation = (orderId: string) => {
  //   // Clear old timers
  //   simulationTimers.current.forEach(t => window.clearTimeout(t));
  //   simulationTimers.current = [];

  //   setActiveSimulationId(orderId);
  //   setSimulatedStep('pending');

  //   TIMELINE.forEach((item) => {
  //       const timer = window.setTimeout(() => {
  //           setSimulatedStep(item.step as ExecutionStep);
  //       }, item.at);
  //       simulationTimers.current.push(timer);
  //   });
  // };

  // handleExecute using store actions
  const handleExecute = async (data: { tokenIn: string; tokenOut: string; amount: number; slippage: number; walletAddress: string }) => {
    setLoading(true);
    
    try {
        // Get current mode
        const currentMode = (window as any).executionMode || 'mock';
        
        const res = await fetch(`${API_URL}/api/orders/execute`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                ...data,
                executionMode: currentMode
            })
        });
        const result = await res.json();
        
        if (result.orderId) {
             const newOrder: Order = {
                orderId: result.orderId,
                status: 'pending',
                ...data,
                timestamp: Date.now()
            };
            addOrder(newOrder); 
            selectOrder(result.orderId, false); 
            // Trigger centralized simulation
            useExecutionStore.getState().startSimulation(result.orderId, TIMELINE);
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

  const activeTimelineOrder = activeTimelineOrderId ? activeOrdersSafe[activeTimelineOrderId] : undefined;
  // Get events for the active timeline order to render the timeline steps
  const currentEvents = activeTimelineOrderId ? (executionsSafe[activeTimelineOrderId] || []) : [];
  
  // Need to provide `currentStep` and `validations` derived from events for the ExecutionTimeline component
  // to interpret the event history visual state.
  
  // Deriving props for ExecutionTimeline from event stream
  // MERGE logic: Real backend events are the primary truth.
  // ALLOWANCE: Simulation can "anticipate" all the way to 'submitted' to feel premium.
  const { activeSimulationId, simulatedStep } = useExecutionStore();
  const latestEvent = currentEvents[currentEvents.length - 1];

  const getStepIndex = (s: string | null) => s ? TIMELINE.findIndex(item => item.step === s) : -1;
  const serverIdx = getStepIndex(latestEvent?.status as string || activeTimelineOrder?.status || null);
  const simIdx = (activeTimelineOrderId === activeSimulationId) ? getStepIndex(simulatedStep) : -1;

  // Visual Window: allow simulation to lead, but strictly WAIT for server for 'confirmed'.
  const SUBMITTED_IDX = TIMELINE.findIndex(i => i.step === 'submitted');
  const CONFIRMED_IDX = TIMELINE.findIndex(i => i.step === 'confirmed');
  
  // Independent Progress: Up to 'Submitted'
  let visualIdx = Math.max(serverIdx, simIdx);
  
  // If we haven't reached 'confirmed' on the server, don't let simulation show it.
  if (serverIdx < CONFIRMED_IDX && visualIdx >= CONFIRMED_IDX) {
      visualIdx = SUBMITTED_IDX;
  }

  const derivedCurrentStep = visualIdx >= 0 ? TIMELINE[visualIdx]?.step as ExecutionStep : null;
  
  const derivedValidations = currentEvents.reduce((acc, ev) => {
      acc[ev.status as string] = true;
      return acc;
  }, {} as Record<string, boolean>);
  
  // Visual validation: turn steps green as the simulation/server reaches them.
  // To ensure the path looks solid, we validate everything up to visualIdx.
  for (let i = 0; i <= visualIdx; i++) {
    const stepName = TIMELINE[i].step;
    derivedValidations[stepName] = true;
  }
  
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
      
      {connectionError && (
        <div style={{
          background: '#fef2f2',
          borderBottom: '1px solid #fecaca',
          padding: '0.75rem 1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          color: '#991b1b',
          fontSize: '0.875rem'
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          <span>{connectionError}</span>
          <span style={{marginLeft: 'auto', fontSize: '0.75rem', opacity: 0.7}}>
            Backend: {API_URL}
          </span>
        </div>
      )}
      
      {backendConnected && (
        <div style={{
          background: '#f0fdf4',
          borderBottom: '1px solid #bbf7d0',
          padding: '0.5rem 1.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          color: '#166534',
          fontSize: '0.75rem'
        }}>
          <div style={{width: '6px', height: '6px', borderRadius: '50%', background: '#22c55e'}}></div>
          <span>Connected • {API_URL}</span>
        </div>
      )}
      
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
