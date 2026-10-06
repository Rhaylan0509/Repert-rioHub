import React, { useState } from 'react';
import {
  X,
  Star,
  Edit3,
  Trash2,
  Copy,
  Check,
  Layers,
  ArrowUpRight,
  FileText,
  Globe,
  Lock,
  Send,
  Clock,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { Repertorio, EditRequest } from '../types';
import { FormattedText, stripFormattingMarkers } from '../utils/richText';

interface RepertorioDetailModalProps {
  currentUserId: string;
  repertorio: Repertorio;
  myEditRequest?: EditRequest | null;
  onClose: () => void;
  onEdit: (repertorio: Repertorio) => void;
  onDelete: (id: string) => Promise<void>;
  onToggleFavorite: (repertorio: Repertorio) => Promise<void>;
  onTogglePublic: (repertorio: Repertorio) => Promise<void>;
  onRequestEditAccess: (repertorio: Repertorio, message?: string) => Promise<void>;
  onSelectTag: (tag: string) => void;
}

export const RepertorioDetailModal: React.FC<RepertorioDetailModalProps> = ({
  currentUserId,
  repertorio,
  myEditRequest,
  onClose,
  onEdit,
  onDelete,
  onToggleFavorite,
  onTogglePublic,
  onRequestEditAccess,
  onSelectTag,
}) => {
  const [copiedCitation, setCopiedCitation] = useState(false);
  const [copiedParagraph, setCopiedParagraph] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRequestingEdit, setIsRequestingEdit] = useState(false);
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [requestNote, setRequestNote] = useState('');

  const isOwner = repertorio.ownerId === currentUserId;
  const isApprovedCollaborator =
    Array.isArray(repertorio.allowedEditors) &&
    repertorio.allowedEditors.includes(currentUserId);
  const canEdit = isOwner || isApprovedCollaborator;

  const handleCopySummary = () => {
    const cleanResumo = stripFormattingMarkers(repertorio.resumo);
    const cleanParagrafo = repertorio.exemploParagrafo
      ? stripFormattingMarkers(repertorio.exemploParagrafo)
      : '';

    const textToCopy = `${repertorio.nome} — "${repertorio.titulo}" (${repertorio.autor}${
      repertorio.ano ? `, ${repertorio.ano}` : ''
    }).\n${repertorio.citacaoChave ? `"${repertorio.citacaoChave}"\n` : ''}Resumo: ${cleanResumo}${
      cleanParagrafo ? `\n\nExemplo de Parágrafo:\n${cleanParagrafo}` : ''
    }`;
    navigator.clipboard.writeText(textToCopy);
    setCopiedCitation(true);
    setTimeout(() => setCopiedCitation(false), 2000);
  };

  const handleCopyParagraphOnly = () => {
    if (!repertorio.exemploParagrafo) return;
    navigator.clipboard.writeText(stripFormattingMarkers(repertorio.exemploParagrafo));
    setCopiedParagraph(true);
    setTimeout(() => setCopiedParagraph(false), 2000);
  };

  const handleConfirmDelete = async () => {
    setIsDeleting(true);
    try {
      await onDelete(repertorio.id);
      onClose();
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSubmitEditRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isRequestingEdit) return;
    setIsRequestingEdit(true);
    try {
      await onRequestEditAccess(repertorio, requestNote.trim());
      setShowRequestForm(false);
      setRequestNote('');
    } finally {
      setIsRequestingEdit(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-xs p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="detail-modal-title"
    >
      <div className="relative w-full max-w-4xl bg-white rounded-xl border border-slate-200 shadow-2xl my-8 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Top Utility Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-6 py-4 border-b border-slate-200 bg-slate-50/70">
          <div className="flex items-center gap-2 text-xs text-slate-500 truncate">
            <span className="font-semibold text-blue-600">{repertorio.eixoTematico}</span>
            <span aria-hidden="true">·</span>
            <span>{repertorio.tipoObra}</span>
            {repertorio.ano && (
              <>
                <span aria-hidden="true">·</span>
                <span className="font-mono-tabular">{repertorio.ano}</span>
              </>
            )}
            <span aria-hidden="true">·</span>
            <span>
              {repertorio.isPublic ? 'Público (Leitura)' : 'Privado'}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleCopySummary}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition-colors whitespace-nowrap"
            >
              {copiedCitation ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Copiado</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copiar Dados</span>
                </>
              )}
            </button>

            {isOwner && (
              <>
                <button
                  type="button"
                  onClick={() => onTogglePublic(repertorio)}
                  title={
                    repertorio.isPublic
                      ? 'Público: clique para tornar privado'
                      : 'Privado: clique para tornar público'
                  }
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap ${
                    repertorio.isPublic
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-700'
                      : 'border-slate-200 bg-white text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {repertorio.isPublic ? (
                    <>
                      <Globe className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Público</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-3.5 h-3.5" />
                      <span>Privado</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => onToggleFavorite(repertorio)}
                  className={`p-1.5 rounded-lg border transition-colors ${
                    repertorio.favorito
                      ? 'border-blue-600 bg-blue-50 text-blue-600'
                      : 'border-slate-200 bg-white text-slate-500 hover:text-slate-900'
                  }`}
                  aria-label="Alternar favorito"
                >
                  <Star className={`w-4 h-4 ${repertorio.favorito ? 'fill-blue-600' : ''}`} />
                </button>
              </>
            )}

            {canEdit && (
              <button
                type="button"
                onClick={() => onEdit(repertorio)}
                className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:text-slate-900 transition-colors"
                aria-label="Editar repertório"
                title="Editar repertório"
              >
                <Edit3 className="w-4 h-4" />
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors ml-1"
              aria-label="Fechar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto p-6 lg:p-8 space-y-8 flex-1">
          {/* Header Block */}
          <div className="border-b border-slate-100 pb-6">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mb-2">
              <span className="font-medium text-slate-800">{repertorio.autor}</span>
              <span>·</span>
              <span className="text-slate-600">{repertorio.titulo}</span>
              {repertorio.ownerName && !isOwner && (
                <>
                  <span>·</span>
                  <span>
                    Compartilhado por <strong className="text-slate-700">{repertorio.ownerName}</strong>
                  </span>
                </>
              )}
            </div>
            <h1
              id="detail-modal-title"
              className="text-2xl lg:text-3xl font-bold text-slate-900 tracking-tight leading-snug"
            >
              {repertorio.nome}
            </h1>

            {repertorio.citacaoChave && (
              <div className="mt-5 pl-4 border-l-2 border-blue-600 text-sm lg:text-base text-slate-700 leading-relaxed bg-slate-50/70 py-3 pr-4 rounded-r-lg">
                “<FormattedText text={repertorio.citacaoChave} />”
              </div>
            )}
          </div>

          {/* Request Edit Access Inline Box (when user is viewing someone else's public card and clicked Solicitar Edição) */}
          {showRequestForm && !canEdit && (
            <form
              onSubmit={handleSubmitEditRequest}
              className="p-4 rounded-xl border border-blue-200 bg-blue-50/50 space-y-3"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-blue-900">
                  Solicitar permissão de edição ao proprietário
                </h3>
                <button
                  type="button"
                  onClick={() => setShowRequestForm(false)}
                  className="text-xs text-slate-500 hover:text-slate-800"
                >
                  Cancelar
                </button>
              </div>
              <input
                type="text"
                maxLength={250}
                value={requestNote}
                onChange={(e) => setRequestNote(e.target.value)}
                placeholder="Mensagem opcional (ex: Quero complementar com um exemplo de parágrafo sobre educação...)"
                className="w-full px-3.5 py-2 text-xs rounded-lg bg-white border border-blue-200 text-slate-900 focus:outline-none focus:border-blue-600"
              />
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isRequestingEdit}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isRequestingEdit ? 'Enviando...' : 'Enviar Solicitação'}</span>
                </button>
              </div>
            </form>
          )}

          {/* Analytical Columns / Blocks */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-7 space-y-6">
              <section>
                <h2 className="text-xs font-semibold text-slate-900 mb-2">
                  Resumo da Obra
                </h2>
                <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                  <FormattedText text={repertorio.resumo} />
                </p>
              </section>

              {repertorio.criticas && (
                <section className="pt-6 border-t border-slate-100">
                  <h2 className="text-xs font-semibold text-slate-900 mb-2">
                    Críticas e Análises
                  </h2>
                  <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                    <FormattedText text={repertorio.criticas} />
                  </p>
                </section>
              )}

              {/* Exemplo de Parágrafo Section */}
              <section className="pt-6 border-t border-slate-100">
                <div className="flex items-center justify-between mb-2.5">
                  <h2 className="text-xs font-semibold text-slate-900 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-blue-600" />
                    <span>Exemplo de Parágrafo</span>
                  </h2>
                  {repertorio.exemploParagrafo && (
                    <button
                      type="button"
                      onClick={handleCopyParagraphOnly}
                      className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:underline"
                    >
                      {copiedParagraph ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-emerald-600">Parágrafo copiado</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copiar parágrafo</span>
                        </>
                      )}
                    </button>
                  )}
                </div>

                {repertorio.exemploParagrafo ? (
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-800 leading-relaxed whitespace-pre-line">
                    <FormattedText text={repertorio.exemploParagrafo} />
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">
                    Nenhum exemplo de parágrafo cadastrado.
                  </p>
                )}
              </section>
            </div>

            <div className="lg:col-span-5 space-y-6">
              <section className="p-5 rounded-xl bg-blue-50/50 border border-blue-100">
                <h2 className="text-xs font-semibold text-blue-700 mb-2 flex items-center justify-between">
                  <span>Conexão com Temas</span>
                  <Layers className="w-3.5 h-3.5" />
                </h2>
                {repertorio.conexaoTemas ? (
                  <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line">
                    <FormattedText text={repertorio.conexaoTemas} />
                  </p>
                ) : (
                  <p className="text-xs text-slate-500">
                    Nenhuma conexão temática registrada.
                  </p>
                )}
              </section>

              {/* Metadata Specification Table */}
              <div className="border-t border-slate-100 pt-4">
                <h3 className="text-xs font-semibold text-slate-900 mb-3">
                  Propriedades
                </h3>
                <dl className="divide-y divide-slate-100 text-xs">
                  <div className="py-2 flex justify-between gap-4">
                    <dt className="text-slate-500">Título da Obra</dt>
                    <dd className="text-slate-900 font-medium text-right">{repertorio.titulo}</dd>
                  </div>
                  <div className="py-2 flex justify-between gap-4">
                    <dt className="text-slate-500">Autor</dt>
                    <dd className="text-slate-900 font-medium text-right">{repertorio.autor}</dd>
                  </div>
                  <div className="py-2 flex justify-between gap-4">
                    <dt className="text-slate-500">Eixo Temático</dt>
                    <dd className="text-slate-900 text-right">{repertorio.eixoTematico}</dd>
                  </div>
                  <div className="py-2 flex justify-between gap-4">
                    <dt className="text-slate-500">Tipo de Obra</dt>
                    <dd className="text-slate-900 text-right">{repertorio.tipoObra}</dd>
                  </div>
                  <div className="py-2 flex justify-between gap-4">
                    <dt className="text-slate-500">Visibilidade</dt>
                    <dd className="text-slate-900 text-right">
                      {repertorio.isPublic ? 'Público (Leitura Global)' : 'Privado'}
                    </dd>
                  </div>
                </dl>
              </div>

              {/* Tags */}
              {repertorio.tags.length > 0 && (
                <div className="border-t border-slate-100 pt-4">
                  <h3 className="text-xs font-semibold text-slate-900 mb-2.5">
                    Tags de Classificação
                  </h3>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                    {repertorio.tags.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => {
                          onSelectTag(tag);
                          onClose();
                        }}
                        className="text-xs font-mono-tabular text-slate-600 hover:text-blue-600 hover:underline flex items-center gap-0.5 transition-colors"
                      >
                        <span className="text-blue-600">#</span>
                        <span>{tag}</span>
                        <ArrowUpRight className="w-3 h-3 opacity-60" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer Delete / Action Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-3.5 border-t border-slate-200 bg-slate-50/70">
          {isOwner ? (
            !confirmDelete ? (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-red-600 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Excluir repertório</span>
              </button>
            ) : (
              <div className="flex items-center gap-3">
                <span className="text-xs text-red-700 font-medium">
                  Confirmar exclusão?
                </span>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={handleConfirmDelete}
                  className="px-3 py-1 text-xs font-medium rounded-md bg-red-600 text-white hover:bg-red-700 transition-colors"
                >
                  {isDeleting ? 'Excluindo...' : 'Sim, excluir'}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="text-xs text-slate-600 hover:text-slate-900"
                >
                  Cancelar
                </button>
              </div>
            )
          ) : (
            <div className="text-xs text-slate-500 flex items-center gap-1.5">
              {isApprovedCollaborator ? (
                <span className="text-emerald-700 font-medium inline-flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Você tem permissão para editar este repertório
                </span>
              ) : (
                <span>Modo leitura pública</span>
              )}
            </div>
          )}

          {/* Right Action: Either Edit (if Owner or Collaborator) OR Request Edit Access */}
          {canEdit ? (
            <button
              type="button"
              onClick={() => onEdit(repertorio)}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium rounded-lg bg-slate-900 text-white hover:bg-slate-800 transition-colors"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Editar Repertório</span>
            </button>
          ) : myEditRequest?.status === 'pending' ? (
            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded-lg bg-amber-50 border border-amber-200 text-amber-800">
              <Clock className="w-3.5 h-3.5" />
              <span>Solicitação de edição enviada (Pendente)</span>
            </span>
          ) : myEditRequest?.status === 'rejected' ? (
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 text-xs text-red-600">
                <XCircle className="w-3.5 h-3.5" />
                <span>Pedido recusado</span>
              </span>
              <button
                type="button"
                onClick={() => setShowRequestForm(true)}
                className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 transition-colors"
              >
                Solicitar novamente
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowRequestForm(true)}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Solicitar Edição ao Autor</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
