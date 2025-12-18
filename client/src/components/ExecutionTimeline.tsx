import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Order, ExecutionStep } from '../types';
import { TIMELINE } from '../utils/timelineController';
import { useUIStore } from '../store/uiStore';

interface Props {
    order?: Order;
    currentStep?: ExecutionStep | null;
    validations?: Record<string, boolean>;
}

const stepVariants = {
  inactive: { opacity: 0.3, scale: 0.95 },
  active: {
    opacity: 1,
    scale: 1.05,
    transition: { duration: 0.12 }
  },
  completed: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.12 }
  },
  failed: {
    opacity: 1,
    scale: 1,
    color: "#dc2626",
    transition: { duration: 0.15 }
  }
};

const failureVariants = {
  failed: {
    x: [0, -8, 8, -4, 4, 0],
    transition: { duration: 0.4 }
  }
};

export function TimelineItem({
  label,
  state,
  spinning,
  isLast
}: {
  label: string;
  state: "inactive" | "active" | "completed" | "failed";
  spinning: boolean;
  isLast?: boolean;
}) {
  return (
    <motion.div
      variants={stepVariants}
      animate={state}
      className="timeline-step" 
      style={{display: 'flex', alignItems: 'flex-start', gap: '12px', paddingBottom: isLast ? '0' : '24px', background: 'transparent', position: 'relative', minHeight: '40px'}}
    >
       <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
          {spinning ? (
            <motion.div
              style={{width: 20, height: 20, borderRadius: '50%', border: '2px solid var(--accent)', borderTopColor: 'transparent', flexShrink: 0, background: 'white', zIndex: 2}}
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}
            />
          ) : state === 'completed' ? (
            <div style={{color: 'var(--success)', background: 'white', zIndex: 2, borderRadius: '50%'}}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="m9 12 2 2 4-4"></path></svg>
            </div>
          ) : state === 'failed' ? (
             <div style={{color: 'var(--error)', background: 'white', zIndex: 2, borderRadius: '50%'}}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" x2="9" y1="9" y2="15"></line><line x1="9" x2="15" y1="9" y2="15"></line></svg>
             </div>
          ) : (
            <div style={{width: 20, height: 20, borderRadius: '50%', border: '2px solid var(--text-muted)', opacity: 0.3, background: 'white', zIndex: 2}} />
          )}
          
          {!isLast && (
              <div style={{
                  width: '2px', 
                  flexGrow: 1, 
                  background: state === 'completed' ? 'var(--success)' : '#e5e7eb', 
                  minHeight: '24px',
                  position: 'absolute',
                  top: '20px',
                  bottom: '-4px',
                  left: '9px',
                  zIndex: 1
              }} />
          )}
       </div>
      <span style={{fontWeight: 600, marginTop: '1px', color: state === 'inactive' ? 'var(--text-muted)' : 'var(--text-main)'}}>{label}</span>
    </motion.div>
  );
}

export const ExecutionTimeline: React.FC<Props> = ({ order, currentStep, validations = {} }) => {
    const { hoveredOrderId, setHoveredOrder } = useUIStore();
    const isHighlighted = order && hoveredOrderId === order.orderId;

    // Determine the effective step index/state
    const getStepState = (stepId: ExecutionStep): "inactive" | "active" | "completed" | "failed" => {
        // Failure check always first
        // Cast to string to avoid TS strictly narrowing based on previous checks if complex union
        const status = order?.status as string;

        if (status === 'failed' || currentStep === 'failed') {
             // If failed, only show completed steps based on validations
             if (validations[stepId]) return 'completed';
             // Visual fix: if we failed AT this step, maybe show as failed?
             // But usually failure banner handles the "failed" text.
             // Let's keep strict inactive for non-validated steps.
             return 'inactive'; 
        }

        // 1. Priority: If this is the current active step, it is ACTIVE.
        if (currentStep === stepId) {
             // Exception: 'confirmed' and 'submitted' are treated as "action complete" states
             if (stepId === 'confirmed' || stepId === 'submitted') return 'completed';
             return 'active';
        }
        
        // 2. If valid/passed, it is completed
        if (validations[stepId]) return 'completed';
        
        // 3. Fallback / History / Gap Filling View
        const comparisonStatus = (currentStep || order?.status) as string;

        if (comparisonStatus) {
             if (comparisonStatus === 'confirmed') return 'completed';
             
             // Dynamic step calculation based on TIMELINE constant
             const currentIdx = TIMELINE.findIndex(s => s.step === comparisonStatus);
             const thisIdx = TIMELINE.findIndex(s => s.step === stepId);
             
             if (currentIdx > -1 && thisIdx > -1) {
                 if (currentIdx > thisIdx) return 'completed';
                 if (currentIdx === thisIdx) {
                      // If matches current status, it is ACTIVE
                      return 'active';
                 }
             }
             return 'inactive';
        }

        return 'inactive';
    };

    if (!order && !currentStep) {
        return (
            <div className="card h-full flex items-center justify-center text-gray-500">
                <p>No active order selected</p>
            </div>
        );
    }

    return (
        <motion.div 
            style={{height: '100%', display: 'flex', flexDirection: 'column'}}
            animate={{
                scale: isHighlighted ? 1.02 : 1,
                boxShadow: isHighlighted ? "0 0 0 2px rgba(59,130,246,0.4)" : "none",
                borderRadius: '8px' // ensure shadow looks right
            }}
            onMouseEnter={() => order && setHoveredOrder(order.orderId)}
            onMouseLeave={() => setHoveredOrder(null)}
        >
             <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)' }}>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Execution Timeline</h2>
                {order && <div style={{ marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                    <span>Order ID:</span>
                    <span className="font-mono" style={{ background: '#f3f4f6', padding: '2px 6px', borderRadius: 4 }}>
                        {order.orderId ? order.orderId.slice(0, 8) + '...' : '...'}
                    </span>
                </div>}
            </div>

            <div className="timeline" style={{padding: '1.5rem'}}>
                <AnimatePresence mode='wait'>
                    {currentStep === 'failed' && (
                        <motion.div
                            key="failure-banner"
                            variants={failureVariants}
                            animate="failed"
                            style={{
                                padding: '1rem', background: '#fef2f2', color: '#b91c1c', 
                                borderRadius: '8px', marginBottom: '1rem', border: '1px solid #fecaca',
                                display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600
                            }}
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" x2="9" y1="9" y2="15"></line><line x1="9" x2="15" y1="9" y2="15"></line></svg>
                            {order?.errorReason || "Transaction Failed"}
                        </motion.div>
                    )}
                </AnimatePresence>

                {TIMELINE.map(({ step }, index) => {
                    const isLast = index === TIMELINE.length - 1;
                    let label = step.replace("_", " ");
                    // Capitalize label for display
                    label = label.charAt(0).toUpperCase() + label.slice(1);
                    
                    let subtext = "";
                    let progress = 0;
                    
                    const state = getStepState(step);
                    // Spin if active, unless it's a static state like 'route_selected' which we might want stable? 
                    // Actually 'route_selected' is a momentary event/step before building.
                    // 'route_selected' usually means "done routing". Timeline moves to 'building'.
                    // If we stick at 'route_selected' visually, maybe it doesn't spin?
                    // But generally, 'active' means "in progress".
                    // Let's refine:
                    // Only spin if active.
                    const isSpinning = state === 'active'; 
                    
                    // --- Custom Step Visualization Logic ---

                    if (step === 'queued') {
                        // Queued logic: If status is queued, show detail. 
                        // If passed queued (e.g. routing), queued is completed.
                        if (currentStep === 'queued' || (order?.status === 'queued' && !currentStep)) {
                             label = `Queued (Position ${order?.queuePosition ?? '?'})`;
                             // Ensure state is active for visual focus if strictly queued
                        }
                    }
                    
                    if (step === 'routing') {
                         if (state === 'active') {
                             label = "Smart Routing";
                             const attempt = order?.retryAttempt || 1;
                             const max = order?.maxRetries || 3;
                             // Only show detailed attempt info if we have data
                             if (order?.retryAttempt) {
                                  subtext = `Comparing Raydium & Meteora (Attempt ${attempt}/${max})`;
                                  progress = (attempt / max) * 100;
                             } else {
                                  subtext = "Comparing Raydium & Meteora quotes...";
                             }
                         }
                     }

                    if (step === 'route_selected') { 
                        // If we are past routing selected, or it is validated/active
                        if (state === 'completed' || state === 'active') { // || validations['route_selected'] matches active too
                            const dexName = order?.selectedDex || 'Best Price';
                            const dexLink = dexName === 'Raydium' 
                                ? 'https://github.com/raydium-io/raydium-sdk-V2-demo'
                                : dexName === 'Meteora' 
                                    ? 'https://docs.meteora.ag/'
                                    : null;

                            label = `Route Selected: ${dexName}`;
                            
                            return (
                                <div key={step}>
                                    <TimelineItem 
                                        label={label} 
                                        state={state}
                                        spinning={isSpinning}
                                        isLast={isLast}
                                    />
                                    {dexLink && (
                                        <a 
                                            href={dexLink} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            style={{
                                                marginLeft: '44px', 
                                                display: 'block',
                                                fontSize: '0.75rem', 
                                                color: '#3b82f6',
                                                textDecoration: 'underline',
                                                marginBottom: '8px',
                                                marginTop: '-20px'
                                            }}
                                        >
                                            View {dexName} Docs ↗
                                        </a>
                                    )}
                                </div>
                            );
                        }
                    }


                    if (step === 'confirmed' && state === 'completed') {
                         if (order?.executedPrice) {
                             // Smart formatting: if small number, use 6 decimals, else 2-4
                             const priceFn = order.executedPrice < 1 ? 6 : 2;
                             label = `Confirmed @ ${order.executedPrice.toFixed(priceFn)} ${order.tokenOut || ''}`;
                         } else {
                             label = "Confirmed";
                         }
                    }

                    return (
                        <div key={step}>
                            <TimelineItem 
                                label={label} 
                                state={state}
                                spinning={isSpinning}
                                isLast={isLast}
                            />
                            {subtext && (
                                <div style={{marginLeft: '44px', marginBottom: '8px', fontSize: '0.75rem', color: 'var(--text-muted)'}}>
                                    {subtext}
                                    {progress > 0 && (
                                    <div style={{width: '120px', height: '4px', background: '#e5e7eb', borderRadius: '2px', marginTop: '4px', overflow: 'hidden'}}>
                                        <div style={{width: `${progress}%`, height: '100%', background: 'var(--accent)', transition: 'width 0.3s'}} />
                                    </div>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </motion.div>
    );
};
