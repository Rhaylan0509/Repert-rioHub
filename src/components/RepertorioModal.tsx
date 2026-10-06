import React, { useState, useRef } from 'react';
import { X, Star, Plus, FileText, Bold, Highlighter, SpellCheck, Check, Globe, Lock } from 'lucide-react';
import { EIXOS_TEMATICOS, TIPOS_DE_OBRA, Repertorio, RepertorioFormInput } from '../types';
import {
  applyTextareaFormatting,
  applyMinimalGrammarCorrection,
  FormattedText,
} from '../utils/richText';

interface RepertorioModalProps {
  currentUserId: string;
  initialData?: Repertorio | null;
  onClose: () => void;
  onSave: (data: RepertorioFormInput) => Promise<void>;
}

interface RichTextareaFieldProps {
  label: string;
  required?: boolean;
  rows?: number;
  maxLength?: number;
  value: string;
  onChange: (val: string) => void;
  placeholder: string;
}

const RichTextareaField: React.FC<RichTextareaFieldProps> = ({
  label,
  required = false,
  rows = 4,
  maxLength = 5000,
  value,
  onChange,
  placeholder,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isCorrecting, setIsCorrecting] = useState(false);
  const [justCorrected, setJustCorrected] = useState(false);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const el = textareaRef.current;
    if (!el) return;

    // Ctrl + B (or Cmd + B) -> Bold (**texto**)
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
      e.preventDefault();
      applyTextareaFormatting(el, value, onChange, '**');
      return;
    }

    // Shift + H -> Soft Blue Highlighter (==texto==) when there is a selection
    // Also supports Alt + Shift + H or Ctrl + H even without selection
    const hasSelection = el.selectionStart !== el.selectionEnd;
    if (
      (e.shiftKey && !e.ctrlKey && !e.metaKey && e.key === 'H' && hasSelection) ||
      ((e.ctrlKey || e.metaKey || e.altKey) && e.key.toLowerCase() === 'h')
    ) {
      e.preventDefault();
      applyTextareaFormatting(el, value, onChange, '==');
    }
  };

  const triggerFormat = (marker: '**' | '==') => {
    const el = textareaRef.current;
    if (!el) return;
    applyTextareaFormatting(el, value, onChange, marker);
  };

  const handleGrammarCorrection = async () => {
    if (!value.trim() || isCorrecting) return;
    setIsCorrecting(true);

    // 1. Apply immediate local minimal punctuation & orthography correction
    const localFixed = applyMinimalGrammarCorrection(value);
    onChange(localFixed);

    // 2. Call server-side minimal grammar correction endpoint for deeper punctuation/accentuation check
    try {
      const response = await fetch('/api/proofread', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: localFixed }),
      });
      if (response.ok) {
        const data = await response.json();
        if (data.correctedText && typeof data.correctedText === 'string') {
          onChange(data.correctedText.slice(0, maxLength));
        }
      }
    } catch {
      // Fallback already applied via localFixed
    } finally {
      setIsCorrecting(false);
      setJustCorrected(true);
      setTimeout(() => setJustCorrected(false), 1800);
    }
  };

  const hasFormattedPreview = value.includes('**') || value.includes('==');

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
        <label className="text-xs font-medium text-slate-700">
          {label} {required && '*'}
        </label>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => triggerFormat('**')}
            title="Negrito (Selecione o texto e pressione Ctrl + B)"
            className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:border-slate-300 transition-colors whitespace-nowrap"
          >
            <Bold className="w-3 h-3" />
            <span>Negrito</span>
            <span className="text-[10px] text-slate-400 font-mono-tabular">Ctrl+B</span>
          </button>

          <button
            type="button"
            onClick={() => triggerFormat('==')}
            title="Marca-texto azul suave (Selecione o texto e pressione Shift + H)"
            className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded border border-blue-200 bg-blue-50/70 text-blue-700 hover:bg-blue-100/80 transition-colors whitespace-nowrap"
          >
            <Highlighter className="w-3 h-3" />
            <span>Marca-texto</span>
            <span className="text-[10px] text-blue-500 font-mono-tabular">Shift+H</span>
          </button>

          <button
            type="button"
            onClick={handleGrammarCorrection}
            disabled={!value.trim() || isCorrecting}
            title="Correção gramatical mínima (pontuação, espaçamento e acentuação)"
            className={`inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded border transition-colors whitespace-nowrap disabled:opacity-45 ${
              justCorrected
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                : 'border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:border-slate-300'
            }`}
          >
            {justCorrected ? (
              <>
                <Check className="w-3 h-3 text-emerald-600" />
                <span>Corrigido</span>
              </>
            ) : (
              <>
                <SpellCheck className="w-3 h-3 text-blue-600" />
                <span>{isCorrecting ? 'Revisando...' : 'Correção'}</span>
              </>
            )}
          </button>

          <span className="text-xs text-slate-400 font-mono-tabular ml-1">
            {value.length}/{maxLength}
          </span>
        </div>
      </div>

      <textarea
        ref={textareaRef}
        required={required}
        rows={rows}
        maxLength={maxLength}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="w-full px-3.5 py-2.5 text-sm rounded-lg bg-slate-50/60 border border-slate-200 text-slate-900 leading-relaxed focus:bg-white focus:outline-none focus:border-blue-600 transition-colors"
      />

      {hasFormattedPreview && (
        <div className="mt-2 p-3 rounded-lg bg-slate-50 border border-slate-200/80 text-xs text-slate-700 leading-relaxed whitespace-pre-line">
          <span className="block text-[10px] font-semibold text-slate-400 mb-1">
            Pré-visualização da formatação:
          </span>
          <FormattedText text={value} />
        </div>
      )}
    </div>
  );
};

export const RepertorioModal: React.FC<RepertorioModalProps> = ({
  currentUserId,
  initialData,
  onClose,
  onSave,
}) => {
  const isOwner = !initialData || initialData.ownerId === currentUserId;
  const [nome, setNome] = useState(initialData?.nome || '');
  const [titulo, setTitulo] = useState(initialData?.titulo || '');
  const [autor, setAutor] = useState(initialData?.autor || '');
  const [eixoTematico, setEixoTematico] = useState<string>(
    initialData?.eixoTematico || EIXOS_TEMATICOS[0]
  );
  const [tipoObra, setTipoObra] = useState<string>(
    initialData?.tipoObra || TIPOS_DE_OBRA[0]
  );
  const [ano, setAno] = useState(initialData?.ano || '');
  const [citacaoChave, setCitacaoChave] = useState(initialData?.citacaoChave || '');
  const [resumo, setResumo] = useState(initialData?.resumo || '');
  const [criticas, setCriticas] = useState(initialData?.criticas || '');
  const [conexaoTemas, setConexaoTemas] = useState(initialData?.conexaoTemas || '');
  const [exemploParagrafo, setExemploParagrafo] = useState(
    initialData?.exemploParagrafo || ''
  );
  const [tags, setTags] = useState<string[]>(initialData?.tags || []);
  const [tagInput, setTagInput] = useState('');
  const [favorito, setFavorito] = useState(initialData?.favorito ?? false);
  const [isPublic, setIsPublic] = useState(initialData?.isPublic ?? false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleAddTag = () => {
    const cleaned = tagInput
      .trim()
      .toLowerCase()
      .replace(/^#+/, '')
      .slice(0, 45);
    if (!cleaned) return;
    if (tags.length >= 15) {
      setErrorMsg('Limite máximo de 15 tags atingido.');
      return;
    }
    if (!tags.includes(cleaned)) {
      setTags([...tags, cleaned]);
    }
    setTagInput('');
  };

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      handleAddTag();
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  const handleInsertTemplate = () => {
    const autorText = autor.trim() || '[Autor/Pensador]';
    const obraText = titulo.trim() || '[Título da Obra]';
    const conceitoText = nome.trim() || '[Conceito Central]';
    const template = `Sob a ótica de **${autorText}**, na obra "${obraText}", o conceito de ==${conceitoText}== evidencia que [explicação da ideia central]. Analogamente, observa-se na realidade contemporânea que [conexão com o tema/problema atual], demonstrando a urgência de medidas que transformem esse cenário.`;
    setExemploParagrafo((prev) => (prev.trim() ? `${prev}\n\n${template}` : template));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const trimmedNome = nome.trim().slice(0, 160);
    const trimmedTitulo = titulo.trim().slice(0, 200);
    const trimmedAutor = autor.trim().slice(0, 140);
    const trimmedResumo = resumo.trim().slice(0, 5000);

    if (!trimmedNome || !trimmedTitulo || !trimmedAutor || !trimmedResumo) {
      setErrorMsg('Preencha todos os campos obrigatórios (Nome do Repertório, Título da Obra, Autor e Resumo).');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSave({
        nome: trimmedNome,
        titulo: trimmedTitulo,
        autor: trimmedAutor,
        eixoTematico: eixoTematico.trim().slice(0, 80),
        tipoObra: tipoObra.trim().slice(0, 80),
        ano: ano.trim().slice(0, 30),
        citacaoChave: citacaoChave.trim().slice(0, 600),
        resumo: trimmedResumo,
        criticas: criticas.trim().slice(0, 5000),
        conexaoTemas: conexaoTemas.trim().slice(0, 5000),
        exemploParagrafo: exemploParagrafo.trim().slice(0, 5000),
        tags: tags.slice(0, 15).map((t) => t.slice(0, 50)),
        imagemData: '',
        favorito,
        isPublic,
      });
      onClose();
    } catch (err) {
      setErrorMsg('Não foi possível salvar o repertório. Verifique sua conexão e tente novamente.');
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-xs p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-repertorio-title"
    >
      <div className="relative w-full max-w-4xl bg-white rounded-xl border border-slate-200 shadow-2xl my-8 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-b border-slate-200 bg-slate-50/70">
          <div>
            <p className="text-xs font-medium text-blue-600">
              {initialData
                ? isOwner
                  ? 'Editar Meu Repertório'
                  : 'Edição Colaborativa Autorizada'
                : 'Novo Repertório'}
            </p>
            <h2
              id="modal-repertorio-title"
              className="text-lg font-semibold text-slate-900 mt-0.5"
            >
              {initialData ? initialData.nome : 'Adicionar Repertório ao Hub'}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            {isOwner && (
              <>
                <button
                  type="button"
                  onClick={() => setIsPublic(!isPublic)}
                  title={
                    isPublic
                      ? 'Público: visível para leitura por outros usuários'
                      : 'Privado: visível apenas para você'
                  }
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap ${
                    isPublic
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-700'
                      : 'border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  {isPublic ? (
                    <>
                      <Globe className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Público (Leitura)</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-3.5 h-3.5 text-slate-500" />
                      <span>Privado</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setFavorito(!favorito)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap ${
                    favorito
                      ? 'border-blue-600 bg-blue-50 text-blue-700'
                      : 'border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <Star className={`w-3.5 h-3.5 ${favorito ? 'fill-blue-600 text-blue-600' : ''}`} />
                  <span>{favorito ? 'Favorito' : 'Favoritar'}</span>
                </button>
              </>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors"
              aria-label="Fechar formulário"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto p-6 lg:p-8 space-y-8 flex-1">
          {errorMsg && (
            <div className="p-4 rounded-lg border border-red-200 bg-red-50 text-red-700 text-sm">
              {errorMsg}
            </div>
          )}

          {/* Section 1: Identificação & Classificação */}
          <div>
            <h3 className="text-sm font-semibold text-slate-900 pb-2.5 border-b border-slate-100 mb-4">
              01. Identificação e Classificação
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Nome do Repertório / Ideia Central *
                </label>
                <input
                  type="text"
                  required
                  maxLength={160}
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Ex: Modernidade Líquida, Banalidade do Mal, Cidadão de Papel..."
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg bg-slate-50/60 border border-slate-200 text-slate-900 focus:bg-white focus:outline-none focus:border-blue-600 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Título da Obra *
                </label>
                <input
                  type="text"
                  required
                  maxLength={200}
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  placeholder="Ex: Eichmann em Jerusalém, Vidas Secas, Constituição de 1988..."
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg bg-slate-50/60 border border-slate-200 text-slate-900 focus:bg-white focus:outline-none focus:border-blue-600 transition-colors"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    Autor / Criador *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={140}
                    value={autor}
                    onChange={(e) => setAutor(e.target.value)}
                    placeholder="Ex: Zygmunt Bauman..."
                    className="w-full px-3.5 py-2.5 text-sm rounded-lg bg-slate-50/60 border border-slate-200 text-slate-900 focus:bg-white focus:outline-none focus:border-blue-600 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">
                    Ano
                  </label>
                  <input
                    type="text"
                    maxLength={30}
                    value={ano}
                    onChange={(e) => setAno(e.target.value)}
                    placeholder="Ex: 2000"
                    className="w-full px-3.5 py-2.5 text-sm rounded-lg bg-slate-50/60 border border-slate-200 text-slate-900 font-mono-tabular focus:bg-white focus:outline-none focus:border-blue-600 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Eixo Temático *
                </label>
                <select
                  value={eixoTematico}
                  onChange={(e) => setEixoTematico(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg bg-slate-50/60 border border-slate-200 text-slate-900 focus:bg-white focus:outline-none focus:border-blue-600 transition-colors"
                >
                  {EIXOS_TEMATICOS.map((eixo) => (
                    <option key={eixo} value={eixo}>
                      {eixo}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Tipo de Obra *
                </label>
                <select
                  value={tipoObra}
                  onChange={(e) => setTipoObra(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg bg-slate-50/60 border border-slate-200 text-slate-900 focus:bg-white focus:outline-none focus:border-blue-600 transition-colors"
                >
                  {TIPOS_DE_OBRA.map((tipo) => (
                    <option key={tipo} value={tipo}>
                      {tipo}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Section 2: Textos Analíticos com Comandos de Formatação */}
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-100 mb-4">
              <h3 className="text-sm font-semibold text-slate-900">
                02. Conteúdo: Resumo, Críticas e Conexão com Temas
              </h3>
              <span className="text-xs text-slate-500">
                Atalhos de seleção: <strong className="text-slate-800">Ctrl + B</strong> (Negrito) ·{' '}
                <span className="bg-blue-100/80 text-blue-950 border border-blue-300/80 rounded px-1.5 py-0.5 font-medium">
                  Shift + H
                </span>{' '}
                (Marca-texto azul)
              </span>
            </div>

            <div className="space-y-5">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  Citação-Chave ou Frase Síntese (Opcional)
                </label>
                <input
                  type="text"
                  maxLength={600}
                  value={citacaoChave}
                  onChange={(e) => setCitacaoChave(e.target.value)}
                  placeholder="Frase ou ideia-chave para referência rápida..."
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg bg-slate-50/60 border border-slate-200 text-slate-900 focus:bg-white focus:outline-none focus:border-blue-600 transition-colors"
                />
              </div>

              <RichTextareaField
                label="Resumo da Obra"
                required
                rows={4}
                maxLength={5000}
                value={resumo}
                onChange={setResumo}
                placeholder="Explique o conceito central, contexto ou enredo da obra de forma objetiva..."
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <RichTextareaField
                  label="Críticas e Análises"
                  rows={4}
                  maxLength={5000}
                  value={criticas}
                  onChange={setCriticas}
                  placeholder="Qual a reflexão crítica, problema estrutural ou tese que esta obra levanta?"
                />

                <RichTextareaField
                  label="Conexão com Temas"
                  rows={4}
                  maxLength={5000}
                  value={conexaoTemas}
                  onChange={setConexaoTemas}
                  placeholder="Com quais temas de redação, debates ou problemas atuais este repertório se conecta?"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Exemplo de Parágrafo (Aplicação na Redação) */}
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-100 mb-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  03. Exemplo de Parágrafo (Aplicação Prática)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Escreva um modelo de parágrafo introdutório ou argumentativo articulando este repertório.
                </p>
              </div>
              <button
                type="button"
                onClick={handleInsertTemplate}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg text-blue-700 bg-blue-50 hover:bg-blue-100/80 border border-blue-200 transition-colors whitespace-nowrap"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Inserir Estrutura Modelo</span>
              </button>
            </div>

            <RichTextareaField
              label="Parágrafo Modelo (Introdução ou Desenvolvimento)"
              rows={4}
              maxLength={5000}
              value={exemploParagrafo}
              onChange={setExemploParagrafo}
              placeholder='Ex: Sob a ótica do sociólogo Zygmunt Bauman, em sua obra "Modernidade Líquida", a sociedade contemporânea é marcada pela fluidez dos laços sociais...'
            />
          </div>

          {/* Section 4: Tags de Classificação (Sem Opção de Imagem) */}
          <div>
            <h3 className="text-sm font-semibold text-slate-900 pb-2.5 border-b border-slate-100 mb-4">
              04. Tags de Classificação
            </h3>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Palavras-Chave ({tags.length}/15)
              </label>
              <div className="flex gap-2 max-w-xl">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleTagKeyDown}
                  placeholder="Digite uma tag e tecle Enter..."
                  className="flex-1 px-3.5 py-2 text-sm rounded-lg bg-slate-50/60 border border-slate-200 text-slate-900 focus:bg-white focus:outline-none focus:border-blue-600 transition-colors"
                />
                <button
                  type="button"
                  onClick={handleAddTag}
                  className="px-3.5 py-2 text-xs font-medium rounded-lg bg-slate-900 text-white hover:bg-slate-800 transition-colors flex items-center gap-1 whitespace-nowrap"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Adicionar Tag</span>
                </button>
              </div>

              {tags.length > 0 ? (
                <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 pt-2.5 border-t border-slate-100">
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1.5 text-xs text-slate-700 font-mono-tabular"
                    >
                      <span className="text-blue-600">#</span>
                      <span>{tag}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className="text-slate-400 hover:text-red-600 transition-colors"
                        aria-label={`Remover tag ${tag}`}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-xs text-slate-500">
                  Use tags como #tecnologia, #direitos-humanos, #desigualdade para facilitar buscas futuras.
                </p>
              )}
            </div>
          </div>

          {/* Modal Footer */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium rounded-lg text-slate-700 border border-slate-200 bg-white hover:bg-slate-50 transition-colors whitespace-nowrap"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition-colors whitespace-nowrap"
            >
              {isSubmitting
                ? 'Salvando...'
                : initialData
                ? 'Salvar Alterações'
                : 'Adicionar Repertório'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
