import React, { useState, useEffect } from 'react';
import { 
  Globe, 
  Calendar, 
  Slack, 
  Facebook, 
  ShoppingBag, 
  MessageCircle, 
  Settings2,
  CheckCircle2,
  XCircle,
  RefreshCw,
  ExternalLink,
  Plus,
  Smartphone,
  ShieldCheck,
  Zap,
  Activity,
  Layers,
  Brain,
  Bot,
  X,
  Key
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db } from '../lib/firebase';
import { collection, query, onSnapshot, doc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { Button, Card, CyberIcon } from './UI';
import { cn, OperationType, handleFirestoreError } from '../lib/utils';
import { WhatsAppConnector } from './WhatsAppConnector';
import { WhatsAppAccountsModal } from './WhatsAppAccountsModal';

interface Integration {
  id: string;
  service: 'google_calendar' | 'meta_ads' | 'slack' | 'outlook' | 'stripe' | 'whatsapp' | 'openai' | 'anthropic' | 'gemini' | 'deepseek';
  status: 'connected' | 'disconnected' | 'error' | 'pairing';
  config?: any;
  updatedAt: any;
}

interface ServiceCardProps {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  integration?: Integration;
  isConnected?: boolean;
  activeCount?: number;
  onConnect: () => void;
  onDisconnect: () => void;
  onViewStats?: () => void;
  isMultiAccount?: boolean;
}

const ServiceCard: React.FC<ServiceCardProps> = ({ 
  id,
  name, 
  description, 
  icon, 
  color, 
  integration,
  isConnected: propIsConnected,
  activeCount = 0,
  onConnect, 
  onDisconnect,
  onViewStats,
  isMultiAccount
}) => {
  const isConnected = propIsConnected ?? integration?.status === 'connected';

  return (
    <div className={cn(
      "panel-de-vidrio p-8 group relative overflow-hidden transition-all duration-500 flex flex-col",
      isConnected 
        ? "border-l-4 border-l-tema-neon shadow-[0_0_40px_rgba(3,154,220,0.1)]" 
        : "opacity-60 grayscale hover:grayscale-0 hover:opacity-100 border-l-4 border-l-transparent"
    )}>
      <div className="absolute inset-0 grid-bg opacity-5 group-hover:opacity-10 transition-opacity" />
      
      <div className="flex items-start justify-between mb-8 relative z-10">
        <div className={cn(
          "w-16 h-16 rounded-2xl flex items-center justify-center border transition-all duration-500",
          isConnected 
            ? "bg-tema-neon/10 border-tema-neon/20 text-tema-neon shadow-[0_0_20px_rgba(3,154,220,0.2)]" 
            : "bg-tema-texto/5 border-tema-texto/10 text-tema-texto/20"
        )}>
          {icon}
        </div>
        <div className="flex flex-col items-end">
          {isConnected ? (
            <div className="flex items-center gap-3 text-[10px] text-tema-matriz font-bold uppercase bg-tema-matriz/10 border border-tema-matriz/20 px-3 py-1 rounded-lg tracking-wider shadow-[0_0_10px_rgba(34,197,94,0.1)]">
              {isMultiAccount ? (
                <><Layers size={12} /> {activeCount} {activeCount === 1 ? 'Activa' : 'Activas'}</>
              ) : (
                <><CheckCircle2 size={12} className="animate-pulse" /> Sincronizado</>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-3 text-[10px] text-tema-texto/30 font-bold uppercase bg-tema-texto/5 border border-tema-texto/10 px-3 py-1 rounded-lg tracking-wider">
              <XCircle size={12} /> Desconectado
            </div>
          )}
        </div>
      </div>

      <div className="mb-10 relative z-10 flex-1">
        <h3 className="text-xl font-bold text-tema-texto mb-2 uppercase tracking-tight group-hover:text-tema-neon transition-colors leading-none">{name}</h3>
        <p className="text-sm text-tema-texto/60 leading-relaxed font-medium min-h-[48px] line-clamp-2">{description}</p>
        
        {isConnected && integration?.config?.phoneNumber && !isMultiAccount && (
          <div className="mt-4 flex items-center gap-3 text-[10px] font-bold uppercase tracking-widest text-tema-texto/60 bg-tema-negro/60 p-2.5 rounded-lg border border-tema-electrico/10 shadow-inner">
            <Smartphone size={14} className="text-tema-neon" /> Device: {integration.config.phoneNumber}
          </div>
        )}
      </div>

      <div className="flex gap-4 relative z-10 mt-auto">
        {isConnected ? (
          <React.Fragment>
            <div className="flex-1 flex flex-col gap-3">
               {isMultiAccount ? (
                 <Button variant="secondary" onClick={onConnect} className="w-full text-xs font-bold tracking-wide py-3 border-tema-neon/50 text-tema-neon hover:bg-tema-neon/10">GESTIONAR CUENTAS</Button>
               ) : (
                 <Button variant="secondary" onClick={onDisconnect} className="w-full text-xs font-bold tracking-wide py-3">DESVINCULAR</Button>
               )}
               {onViewStats && (
                 <Button onClick={onViewStats} className="w-full text-xs font-bold tracking-wide py-3 shadow-[0_0_20px_rgba(3,154,220,0.2)]">
                    ESTADÍSTICAS
                 </Button>
               )}
            </div>
            {!isMultiAccount && (
              <button className="p-3 bg-tema-texto/5 text-tema-texto/20 hover:text-tema-neon hover:bg-tema-neon/10 border border-tema-texto/10 hover:border-tema-neon/20 rounded-xl transition-all active:scale-90 flex items-center justify-center">
                <Settings2 size={20} />
              </button>
            )}
          </React.Fragment>
        ) : (
          <Button onClick={onConnect} className="flex-1 flex items-center justify-center gap-4 text-xs font-bold tracking-widest py-3 shadow-[0_0_30px_rgba(3,154,220,0.1)]">
             VINCULAR AHORA <Plus size={16} />
          </Button>
        )}
      </div>
    </div>
  );
};

interface IntegrationsViewProps {
  userId: string;
  onViewStats?: (service: string) => void;
}

export const IntegrationsView: React.FC<IntegrationsViewProps> = ({ userId, onViewStats }) => {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showWhatsAppManager, setShowWhatsAppManager] = useState(false);
  const [showApiModal, setShowApiModal] = useState<Integration['service'] | null>(null);
  const [apiKey, setApiKey] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'users', userId, 'integrations'));
    return onSnapshot(q, (snap) => {
      setIntegrations(snap.docs.map(d => ({ id: d.id, ...d.data() } as Integration)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, `users/${userId}/integrations`));
  }, [userId]);

  const handleConnectAI = async (service: Integration['service']) => {
    if (!apiKey.trim()) return;
    setIsLoading(true);
    setShowApiModal(null);
    try {
      await setDoc(doc(db, 'users', userId, 'integrations', service), {
        service,
        status: 'connected',
        config: { apiKey: apiKey.trim() },
        updatedAt: serverTimestamp()
      });
      setApiKey('');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleIntegration = async (service: Integration['service'], currentStatus?: string) => {
    if (service === 'whatsapp') {
      setShowWhatsAppManager(true);
      return;
    }

    if (['openai', 'anthropic', 'gemini', 'deepseek'].includes(service)) {
       if (currentStatus === 'connected') {
          setIsLoading(true);
          try {
            const item = integrations.find(i => i.service === service);
            if (item) await deleteDoc(doc(db, 'users', userId, 'integrations', item.id));
          } catch (err) {
            handleFirestoreError(err, OperationType.WRITE);
          } finally {
            setIsLoading(false);
          }
       } else {
          setShowApiModal(service);
       }
       return;
    }

    setIsLoading(true);
    // Simulating OAuth popup
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    try {
      if (currentStatus === 'connected') {
        const item = integrations.find(i => i.service === service);
        if (item) await deleteDoc(doc(db, 'users', userId, 'integrations', item.id));
      } else {
        await setDoc(doc(db, 'users', userId, 'integrations', service), {
          service,
          status: 'connected',
          updatedAt: serverTimestamp()
        });
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE);
    } finally {
      setIsLoading(false);
    }
  };

  const getIntegration = (service: string) => integrations.find(i => i.service === service);
  const getWhatsAppIntegrations = () => integrations.filter(i => i.service === 'whatsapp');

  return (
    <div className="flex-1 flex flex-col h-full bg-tema-negro/40 backdrop-blur-xl overflow-hidden relative">
      <div className="absolute inset-0 grid-bg opacity-10 pointer-events-none" />
      
      <AnimatePresence>
        {showWhatsAppManager && (
          <WhatsAppAccountsModal 
            userId={userId} 
            accounts={getWhatsAppIntegrations()}
            onClose={() => setShowWhatsAppManager(false)} 
          />
        )}
        {showApiModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-8">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-tema-negro/80 backdrop-blur-2xl"
              onClick={() => setShowApiModal(null)}
            />
            <motion.div 
              initial={{ scale: 0.9, y: 40, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, y: 40, opacity: 0 }}
              className="max-w-xl w-full relative z-[110]"
            >
              <div className="panel-de-vidrio p-12 relative overflow-hidden shadow-2xl">
                <div className="absolute inset-0 grid-bg opacity-10" />
                <button 
                  onClick={() => setShowApiModal(null)}
                  className="absolute top-8 right-8 text-tema-texto/20 hover:text-tema-neon transition-all hover:scale-110 active:scale-90 p-2"
                >
                  <X size={28} />
                </button>

                <div className="flex items-center gap-4 mb-8">
                   <CyberIcon color="var(--tema-neon)" size="lg"><Key size={24} /></CyberIcon>
                   <h3 className="text-2xl font-bold text-tema-texto tracking-tight uppercase whitespace-nowrap">VINCULAR PROVEEDOR IA</h3>
                </div>

                <div className="space-y-6 relative z-10">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-tema-neon uppercase tracking-wider ml-1">Clave API ({showApiModal.toUpperCase()})</label>
                    <input 
                      autoFocus
                      type="password"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder={`sk-... (${showApiModal})`}
                      className="w-full bg-tema-negro/60 border border-tema-electrico/20 p-5 rounded-2xl text-sm focus:border-tema-neon focus:outline-none transition-all text-tema-texto font-medium shadow-inner"
                    />
                    <p className="text-[10px] text-tema-texto/30 font-medium italic mt-2 ml-2">Su clave se cifrará con AES-256 en nuestro sistema.</p>
                  </div>

                  <div className="flex gap-6 pt-6">
                    <Button variant="secondary" onClick={() => setShowApiModal(null)} className="flex-1 py-5 text-xs font-bold tracking-widest uppercase">CANCELAR</Button>
                    <Button 
                      onClick={() => handleConnectAI(showApiModal)} 
                      disabled={!apiKey.trim()}
                      className="flex-1 py-5 text-xs font-bold tracking-widest uppercase shadow-[0_0_40px_rgba(3,154,220,0.3)] disabled:opacity-50"
                    >
                        {isLoading ? 'CONECTANDO...' : 'VINCULAR'}
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="p-8 border-b border-tema-electrico/10 bg-tema-negro/60 flex items-center justify-between relative z-10">
        <div>
          <div className="flex items-center gap-4 mb-2">
            <CyberIcon color="var(--tema-neon)" size="lg"><Globe size={28} /></CyberIcon>
            <h2 className="text-3xl font-bold text-tema-texto tracking-tight uppercase whitespace-nowrap leading-none">
              ECOSISTEMA DE INTEGRACIONES
            </h2>
          </div>
          <p className="text-xs text-tema-neon font-semibold tracking-wide mt-2 uppercase opacity-80 ml-12">Expansión Operativa de la Infraestructura Neural</p>
        </div>
        <div className="flex items-center gap-4 text-xs font-bold uppercase tracking-wider text-tema-texto/60 bg-tema-negro/60 p-3 rounded-xl border border-tema-electrico/10">
          <RefreshCw size={16} className={cn("text-tema-neon", isLoading && "animate-spin")} /> 
          SINCRO: <span className={cn(isLoading ? "text-tema-matriz animate-pulse" : "text-tema-texto")}>{isLoading ? 'SINC_ACTIVA' : 'SINC_IDLE'}</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-10 ocultar-barra-desplazamiento relative z-10">
        <div className="max-w-7xl mx-auto space-y-16">
          
          {/* Productivity Section */}
          <section>
            <div className="flex items-center justify-between mb-10 group">
              <div className="flex items-center gap-6">
                 <div className="w-1.5 h-8 bg-tema-neon shadow-[0_0_15px_rgba(3,154,220,1)] rounded-full" />
                 <div>
                    <h3 className="text-xl font-bold text-tema-texto uppercase tracking-tight leading-none">Agendas y Calendarios</h3>
                    <p className="text-xs text-tema-neon font-semibold tracking-wider mt-2 uppercase opacity-60">Infraestructura Corporativa // Cloud Sync</p>
                 </div>
              </div>
              <div className="h-[1px] flex-1 bg-tema-electrico/10 mx-10 group-hover:bg-tema-neon/20 transition-colors" />
              <Activity size={24} className="text-tema-texto/10 group-hover:text-tema-neon/40 transition-colors" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
              <ServiceCard 
                id="google_calendar"
                name="Google Calendar"
                color="blue"
                description="Permite al agente agendar citas, reuniones y teleconferencias directamente en sus calendarios neurales."
                icon={<Calendar size={32} />}
                integration={getIntegration('google_calendar')}
                onConnect={() => handleToggleIntegration('google_calendar')}
                onDisconnect={() => handleToggleIntegration('google_calendar', 'connected')}
              />
              <ServiceCard 
                id="outlook"
                name="Outlook 365"
                color="blue"
                description="Sincronización profesional con el ecosistema de Microsoft Enterprise para gestión de activos corporativos."
                icon={<ExternalLink size={32} />}
                integration={getIntegration('outlook')}
                onConnect={() => handleToggleIntegration('outlook')}
                onDisconnect={() => handleToggleIntegration('outlook', 'connected')}
              />
            </div>
          </section>

          {/* Marketing & Sales Section */}
          <section>
            <div className="flex items-center justify-between mb-10 group">
              <div className="flex items-center gap-6">
                 <div className="w-1.5 h-8 bg-tema-neon shadow-[0_0_15px_rgba(3,154,220,1)] rounded-full" />
                 <div>
                    <h3 className="text-xl font-bold text-tema-texto uppercase tracking-tight leading-none">Marketing y Finanzas</h3>
                    <p className="text-xs text-tema-neon font-semibold tracking-wider mt-2 uppercase opacity-60">Captación de Leads // Pasarelas de Pago</p>
                 </div>
              </div>
              <div className="h-[1px] flex-1 bg-tema-electrico/10 mx-10 group-hover:bg-tema-neon/20 transition-colors" />
              <Zap size={24} className="text-tema-texto/10 group-hover:text-tema-neon/40 transition-colors" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
              <ServiceCard 
                id="meta_ads"
                name="Meta Business Suite"
                color="blue"
                description="Captura prospectos de anuncios en tiempo real y permite la auditoría neural de métricas publicitarias."
                icon={<Facebook size={32} />}
                integration={getIntegration('meta_ads')}
                onConnect={() => handleToggleIntegration('meta_ads')}
                onDisconnect={() => handleToggleIntegration('meta_ads', 'connected')}
                onViewStats={() => onViewStats?.('meta_ads')}
              />
              <ServiceCard 
                id="stripe"
                name="Stripe Finance"
                color="purple"
                description="Pasarela de pagos global. El agente gestiona enlaces de cobro y verifica estados de facturación neural."
                icon={<ShoppingBag size={32} />}
                integration={getIntegration('stripe')}
                onConnect={() => handleToggleIntegration('stripe')}
                onDisconnect={() => handleToggleIntegration('stripe', 'connected')}
              />
            </div>
          </section>

          {/* Communication Section */}
          <section>
            <div className="flex items-center justify-between mb-10 group">
              <div className="flex items-center gap-6">
                 <div className="w-1.5 h-8 bg-tema-neon shadow-[0_0_15px_rgba(3,154,220,1)] rounded-full" />
                 <div>
                    <h3 className="text-xl font-bold text-tema-texto uppercase tracking-tight leading-none">Canales de Sincronización</h3>
                    <p className="text-xs text-tema-neon font-semibold tracking-wider mt-2 uppercase opacity-60">Protocolos de Comunicación // Central HUB</p>
                 </div>
              </div>
              <div className="h-[1px] flex-1 bg-tema-electrico/10 mx-10 group-hover:bg-tema-neon/20 transition-colors" />
              <ShieldCheck size={24} className="text-tema-texto/10 group-hover:text-tema-neon/40 transition-colors" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
              <ServiceCard 
                id="whatsapp"
                name="WhatsApp (E2EE)"
                color="emerald"
                description="Conexión omnicanal total. Sincronice terminales de enlace para permitir la gestión neural de chats. Soporta múltiples cuentas simultáneamente."
                icon={<MessageCircle size={32} />}
                isConnected={getWhatsAppIntegrations().length > 0}
                activeCount={getWhatsAppIntegrations().length}
                isMultiAccount={true}
                onConnect={() => setShowWhatsAppManager(true)}
                onDisconnect={() => {}}
              />
              <ServiceCard 
                id="slack"
                name="Slack Workspace"
                color="orange"
                description="Conexión con nodos internos. El agente reporta telemetría operativa a sus canales de mando prioritarios."
                icon={<Slack size={32} />}
                integration={getIntegration('slack')}
                onConnect={() => handleToggleIntegration('slack')}
                onDisconnect={() => handleToggleIntegration('slack', 'connected')}
              />
            </div>
          </section>

          {/* AI Providers Section */}
          <section>
            <div className="flex items-center justify-between mb-10 group">
              <div className="flex items-center gap-6">
                 <div className="w-1.5 h-8 bg-tema-neon shadow-[0_0_15px_rgba(3,154,220,1)] rounded-full" />
                 <div>
                    <h3 className="text-xl font-bold text-tema-texto uppercase tracking-tight leading-none">Modelos de Inteligencia Artificial</h3>
                    <p className="text-xs text-tema-neon font-semibold tracking-wider mt-2 uppercase opacity-60">LLMs // Motores Cognitivos</p>
                 </div>
              </div>
              <div className="h-[1px] flex-1 bg-tema-electrico/10 mx-10 group-hover:bg-tema-neon/20 transition-colors" />
              <Brain size={24} className="text-tema-texto/10 group-hover:text-tema-neon/40 transition-colors" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
              <ServiceCard 
                id="openai"
                name="OpenAI (GPT)"
                color="green"
                description="Habilita capacidades cognitivas mediante modelos GPT-4 y superiores. Integración por Clave API."
                icon={<Bot size={32} />}
                integration={getIntegration('openai')}
                onConnect={() => handleToggleIntegration('openai')}
                onDisconnect={() => handleToggleIntegration('openai', 'connected')}
              />
              <ServiceCard 
                id="anthropic"
                name="Anthropic (Claude)"
                color="purple"
                description="Modelos Claude para análisis de contexto amplio y razonamiento avanzado. Integración por Clave API."
                icon={<Brain size={32} />}
                integration={getIntegration('anthropic')}
                onConnect={() => handleToggleIntegration('anthropic')}
                onDisconnect={() => handleToggleIntegration('anthropic', 'connected')}
              />
              <ServiceCard 
                id="gemini"
                name="Google Gemini"
                color="blue"
                description="Motores multimodales de Google. Excelente para procesamiento veloz e integraciones Workspace."
                icon={<Zap size={32} />}
                integration={getIntegration('gemini')}
                onConnect={() => handleToggleIntegration('gemini')}
                onDisconnect={() => handleToggleIntegration('gemini', 'connected')}
              />
              <ServiceCard 
                id="deepseek"
                name="DeepSeek"
                color="blue"
                description="Modelos eficientes para tareas analíticas y programación. Requiere Clave API de DeepSeek."
                icon={<Layers size={32} />}
                integration={getIntegration('deepseek')}
                onConnect={() => handleToggleIntegration('deepseek')}
                onDisconnect={() => handleToggleIntegration('deepseek', 'connected')}
              />
            </div>
          </section>

        </div>
      </div>

      {/* Decorative Blurs */}
      <div className="absolute top-1/2 -right-60 w-[500px] h-[500px] bg-tema-neon/5 blur-[200px] rounded-full pointer-events-none" />
      <div className="absolute bottom-1/4 -left-60 w-[500px] h-[500px] bg-tema-electrico/5 blur-[200px] rounded-full pointer-events-none" />
    </div>
  );
};

