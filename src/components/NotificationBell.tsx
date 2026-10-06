import React, { useState, useRef, useEffect } from 'react';
import { Bell, Check, X, Edit3, Trash2, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { EditRequest } from '../types';

interface NotificationBellProps {
  currentUserId: string;
  incomingRequests: EditRequest[];
  outgoingRequests: EditRequest[];
  onAcceptRequest: (req: EditRequest) => Promise<void>;
  onRejectRequest: (req: EditRequest) => Promise<void>;
  onDeleteRequest: (id: string) => Promise<void>;
  onOpenRepertorioById: (repertorioId: string) => void;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({
  incomingRequests,
  outgoingRequests,
  onAcceptRequest,
  onRejectRequest,
  onDeleteRequest,
  onOpenRepertorioById,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const pendingIncomingCount = incomingRequests.filter(
    (r) => r.status === 'pending'
  ).length;
  const resolvedOutgoingCount = outgoingRequests.filter(
    (r) => r.status !== 'pending'
  ).length;

  const totalBadgeCount = pendingIncomingCount + resolvedOutgoingCount;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAction = async (
    req: EditRequest,
    action: 'accept' | 'reject' | 'delete'
  ) => {
    setProcessingId(req.id);
    try {
      if (action === 'accept') {
        await onAcceptRequest(req);
      } else if (action === 'reject') {
        await onRejectRequest(req);
      } else {
        await onDeleteRequest(req.id);
      }
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors"
        aria-label="Notificações e solicitações de edição"
        title="Notificações e solicitações de edição"
      >
        <Bell className="w-4 h-4" />
        {totalBadgeCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-blue-600 text-white text-[10px] font-bold font-mono-tabular flex items-center justify-center">
            {totalBadgeCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl border border-slate-200 bg-white shadow-xl z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/80 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-900">
              Central de Solicitações
            </span>
            <span className="text-[11px] text-slate-500 font-mono-tabular">
              {pendingIncomingCount} pendente{pendingIncomingCount === 1 ? '' : 's'}
            </span>
          </div>

          <div className="max-h-96 overflow-y-auto divide-y divide-slate-100">
            {incomingRequests.length === 0 && outgoingRequests.length === 0 ? (
              <div className="py-10 px-4 text-center">
                <Bell className="w-6 h-6 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-medium text-slate-700">
                  Nenhuma notificação no momento
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Solicitações para editar repertórios públicos aparecerão aqui.
                </p>
              </div>
            ) : (
              <>
                {/* Incoming Requests (For Repertorio Owner) */}
                {incomingRequests.map((req) => (
                  <div key={req.id} className="p-4 space-y-2.5 hover:bg-slate-50/60 transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs text-slate-700 leading-snug">
                        <strong className="font-semibold text-slate-900">
                          {req.requesterName}
                        </strong>{' '}
                        solicitou permissão para editar{' '}
                        <button
                          type="button"
                          onClick={() => {
                            onOpenRepertorioById(req.repertorioId);
                            setIsOpen(false);
                          }}
                          className="font-semibold text-blue-600 hover:underline text-left"
                        >
                          “{req.repertorioNome}”
                        </button>
                      </p>
                      <button
                        type="button"
                        onClick={() => handleAction(req, 'delete')}
                        disabled={processingId === req.id}
                        className="text-slate-300 hover:text-slate-600 p-0.5 shrink-0"
                        title="Limpar notificação"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {req.message && (
                      <p className="text-[11px] text-slate-600 bg-slate-100/80 px-2.5 py-1.5 rounded border-l-2 border-slate-300">
                        “{req.message}”
                      </p>
                    )}

                    {req.status === 'pending' ? (
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          type="button"
                          disabled={processingId === req.id}
                          onClick={() => handleAction(req, 'accept')}
                          className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Aceitar Edição</span>
                        </button>
                        <button
                          type="button"
                          disabled={processingId === req.id}
                          onClick={() => handleAction(req, 'reject')}
                          className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-50 transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>Recusar</span>
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-[11px]">
                        {req.status === 'accepted' ? (
                          <span className="text-emerald-700 font-medium inline-flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Solicitação aceita — Colaborador autorizado
                          </span>
                        ) : (
                          <span className="text-slate-500 inline-flex items-center gap-1">
                            <XCircle className="w-3.5 h-3.5" />
                            Solicitação recusada
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                ))}

                {/* Outgoing Requests (Sent by Current User) */}
                {outgoingRequests.map((req) => (
                  <div key={req.id} className="p-4 space-y-2 bg-slate-50/40">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs text-slate-700 leading-snug">
                        Seu pedido para editar{' '}
                        <button
                          type="button"
                          onClick={() => {
                            onOpenRepertorioById(req.repertorioId);
                            setIsOpen(false);
                          }}
                          className="font-semibold text-blue-600 hover:underline text-left"
                        >
                          “{req.repertorioNome}”
                        </button>
                      </p>
                      <button
                        type="button"
                        onClick={() => handleAction(req, 'delete')}
                        disabled={processingId === req.id}
                        className="text-slate-300 hover:text-slate-600 p-0.5 shrink-0"
                        title="Remover aviso"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex items-center justify-between pt-0.5">
                      {req.status === 'pending' && (
                        <span className="text-[11px] text-amber-700 font-medium inline-flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          Aguardando aprovação do autor
                        </span>
                      )}
                      {req.status === 'accepted' && (
                        <span className="text-[11px] text-emerald-700 font-semibold inline-flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Aprovado! Você já pode editar este card
                        </span>
                      )}
                      {req.status === 'rejected' && (
                        <span className="text-[11px] text-red-600 font-medium inline-flex items-center gap-1">
                          <XCircle className="w-3.5 h-3.5" />
                          Pedido de edição recusado pelo autor
                        </span>
                      )}

                      {req.status === 'accepted' && (
                        <button
                          type="button"
                          onClick={() => {
                            onOpenRepertorioById(req.repertorioId);
                            setIsOpen(false);
                          }}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:underline"
                        >
                          <Edit3 className="w-3 h-3" />
                          <span>Abrir</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
