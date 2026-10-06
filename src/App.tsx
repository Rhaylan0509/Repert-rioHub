import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  Plus,
  Star,
  LayoutGrid,
  List as ListIcon,
  LogOut,
  LogIn,
  FolderSearch,
  SlidersHorizontal,
  X,
  Edit3,
  Eye,
  Database,
  Globe,
  Lock,
  CheckCircle2,
  Send,
} from 'lucide-react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  User,
} from 'firebase/auth';
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  Timestamp,
  writeBatch,
  arrayUnion,
} from 'firebase/firestore';
import {
  auth,
  db,
  googleProvider,
  handleFirestoreError,
  OperationType,
} from './firebase';
import {
  Repertorio,
  RepertorioFormInput,
  EditRequest,
  EIXOS_TEMATICOS,
  TIPOS_DE_OBRA,
  CURATED_SEED_REPERTORIOS,
} from './types';
import { normalizeText } from './utils/image';
import { FormattedText } from './utils/richText';
import { RepertorioModal } from './components/RepertorioModal';
import { RepertorioDetailModal } from './components/RepertorioDetailModal';
import { NotificationBell } from './components/NotificationBell';

type SearchScope = 'todos' | 'nome' | 'titulo' | 'autor' | 'eixo' | 'tipo' | 'tags';
type OwnershipFilter = 'todos' | 'meus' | 'comunidade' | 'colaborador';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);

  // Separate real-time slices merged into unified `repertorios`
  const [ownRepertorios, setOwnRepertorios] = useState<Repertorio[]>([]);
  const [publicRepertorios, setPublicRepertorios] = useState<Repertorio[]>([]);
  const [collaboratorRepertorios, setCollaboratorRepertorios] = useState<Repertorio[]>([]);

  // Edit Requests state (for the Bell Notification dropdown)
  const [incomingRequests, setIncomingRequests] = useState<EditRequest[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<EditRequest[]>([]);

  const [loadingData, setLoadingData] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isSeeding, setIsSeeding] = useState(false);

  // Layout state
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Multi-Criterion Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchScope, setSearchScope] = useState<SearchScope>('todos');
  const [ownershipFilter, setOwnershipFilter] = useState<OwnershipFilter>('todos');
  const [selectedEixo, setSelectedEixo] = useState<string>('Todos');
  const [selectedTipo, setSelectedTipo] = useState<string>('Todos');
  const [selectedAutor, setSelectedAutor] = useState<string>('Todos');
  const [selectedTag, setSelectedTag] = useState<string>('Todas');

  // Modals state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Repertorio | null>(null);
  const [viewingItem, setViewingItem] = useState<Repertorio | null>(null);

  // 1. Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  const mapDocToRepertorio = (docSnap: any): Repertorio => {
    const data = docSnap.data();
    const createdAt =
      data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date();
    const updatedAt =
      data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : new Date();

    return {
      id: docSnap.id,
      ownerId: data.ownerId,
      ownerName: data.ownerName || 'Usuário',
      isPublic: Boolean(data.isPublic),
      allowedEditors: Array.isArray(data.allowedEditors) ? data.allowedEditors : [],
      nome: data.nome || '',
      titulo: data.titulo || '',
      autor: data.autor || '',
      eixoTematico: data.eixoTematico || '',
      tipoObra: data.tipoObra || '',
      ano: data.ano || '',
      citacaoChave: data.citacaoChave || '',
      resumo: data.resumo || '',
      criticas: data.criticas || '',
      conexaoTemas: data.conexaoTemas || '',
      exemploParagrafo: data.exemploParagrafo || '',
      tags: Array.isArray(data.tags) ? data.tags : [],
      imagemData: data.imagemData || '',
      favorito: Boolean(data.favorito),
      createdAt,
      updatedAt,
    };
  };

  const mapDocToEditRequest = (docSnap: any): EditRequest => {
    const data = docSnap.data();
    const createdAt =
      data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date();
    const updatedAt =
      data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : new Date();

    return {
      id: docSnap.id,
      repertorioId: data.repertorioId || '',
      repertorioNome: data.repertorioNome || '',
      ownerId: data.ownerId || '',
      requesterId: data.requesterId || '',
      requesterName: data.requesterName || 'Usuário',
      status: data.status || 'pending',
      message: data.message || '',
      createdAt,
      updatedAt,
    };
  };

  // 2. Firestore Real-Time Listeners (Own + Public Global + Shared as Collaborator + Edit Requests)
  useEffect(() => {
    if (!authReady || !user) {
      setOwnRepertorios([]);
      setPublicRepertorios([]);
      setCollaboratorRepertorios([]);
      setIncomingRequests([]);
      setOutgoingRequests([]);
      return;
    }

    setLoadingData(true);

    // Query A: User's own cards (private + public)
    const qOwn = query(
      collection(db, 'repertorios'),
      where('ownerId', '==', user.uid)
    );

    // Query B: Globally shared public cards
    const qPublic = query(
      collection(db, 'repertorios'),
      where('isPublic', '==', true)
    );

    // Query C: Cards where user is an approved editor
    const qCollaborator = query(
      collection(db, 'repertorios'),
      where('allowedEditors', 'array-contains', user.uid)
    );

    // Query D: Incoming edit requests (where current user is the card owner)
    const qIncomingReq = query(
      collection(db, 'editRequests'),
      where('ownerId', '==', user.uid)
    );

    // Query E: Outgoing edit requests (where current user requested to edit someone else's card)
    const qOutgoingReq = query(
      collection(db, 'editRequests'),
      where('requesterId', '==', user.uid)
    );

    const unsubOwn = onSnapshot(
      qOwn,
      (snapshot) => {
        setOwnRepertorios(snapshot.docs.map(mapDocToRepertorio));
        setLoadingData(false);
      },
      (error) => {
        setLoadingData(false);
        handleFirestoreError(error, OperationType.LIST, 'repertorios (own)');
      }
    );

    const unsubPublic = onSnapshot(
      qPublic,
      (snapshot) => {
        setPublicRepertorios(snapshot.docs.map(mapDocToRepertorio));
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'repertorios (public)');
      }
    );

    const unsubCollab = onSnapshot(
      qCollaborator,
      (snapshot) => {
        setCollaboratorRepertorios(snapshot.docs.map(mapDocToRepertorio));
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'repertorios (collaborator)');
      }
    );

    const unsubIncomingReq = onSnapshot(
      qIncomingReq,
      (snapshot) => {
        const items = snapshot.docs.map(mapDocToEditRequest);
        items.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
        setIncomingRequests(items);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'editRequests (incoming)');
      }
    );

    const unsubOutgoingReq = onSnapshot(
      qOutgoingReq,
      (snapshot) => {
        const items = snapshot.docs.map(mapDocToEditRequest);
        items.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
        setOutgoingRequests(items);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'editRequests (outgoing)');
      }
    );

    return () => {
      unsubOwn();
      unsubPublic();
      unsubCollab();
      unsubIncomingReq();
      unsubOutgoingReq();
    };
  }, [authReady, user]);

  // Unified deduplicated list of Repertorios
  const repertorios = useMemo(() => {
    const map = new Map<string, Repertorio>();
    ownRepertorios.forEach((r) => map.set(r.id, r));
    publicRepertorios.forEach((r) => map.set(r.id, r));
    collaboratorRepertorios.forEach((r) => map.set(r.id, r));
    const list = Array.from(map.values());
    list.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
    return list;
  }, [ownRepertorios, publicRepertorios, collaboratorRepertorios]);

  // Keep `viewingItem` synchronized with real-time updates
  useEffect(() => {
    setViewingItem((prev) => {
      if (!prev) return null;
      return repertorios.find((it) => it.id === prev.id) || null;
    });
  }, [repertorios]);

  // 3. Auth Handlers
  const handleSignIn = async () => {
    setAuthError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      console.error('Erro ao autenticar:', err);
      setAuthError('Não foi possível concluir o login com o Google. Tente novamente.');
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
  };

  // 4. CRUD & Collaboration Handlers
  const generateSafeId = (prefix = 'rep') => {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  };

  const getUserDisplayName = (u: User) => {
    return (u.displayName || u.email?.split('@')[0] || 'Usuário').trim().slice(0, 120);
  };

  const handleSaveRepertorio = async (formData: RepertorioFormInput) => {
    if (!user) return;

    const cleanFields = {
      nome: formData.nome.trim().slice(0, 160),
      titulo: formData.titulo.trim().slice(0, 200),
      autor: formData.autor.trim().slice(0, 140),
      eixoTematico: formData.eixoTematico.trim().slice(0, 80),
      tipoObra: formData.tipoObra.trim().slice(0, 80),
      ano: formData.ano.trim().slice(0, 30),
      citacaoChave: formData.citacaoChave.trim().slice(0, 600),
      resumo: formData.resumo.trim().slice(0, 5000),
      criticas: formData.criticas.trim().slice(0, 5000),
      conexaoTemas: formData.conexaoTemas.trim().slice(0, 5000),
      exemploParagrafo: formData.exemploParagrafo.trim().slice(0, 5000),
      tags: formData.tags
        .slice(0, 15)
        .map((t) => t.trim().slice(0, 50))
        .filter(Boolean),
    };

    if (editingItem) {
      const docRef = doc(db, 'repertorios', editingItem.id);
      const isOwner = editingItem.ownerId === user.uid;

      try {
        if (isOwner) {
          // Tier 1: Owner Full Edit (includes visibility and favorite)
          await updateDoc(docRef, {
            ...cleanFields,
            isPublic: Boolean(formData.isPublic),
            favorito: Boolean(formData.favorito),
            updatedAt: serverTimestamp(),
          });
        } else {
          // Tier 2: Approved Collaborator Content-Only Edit
          await updateDoc(docRef, {
            ...cleanFields,
            updatedAt: serverTimestamp(),
          });
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `repertorios/${editingItem.id}`);
      }
    } else {
      const newId = generateSafeId('rep');
      const docRef = doc(db, 'repertorios', newId);
      try {
        await setDoc(docRef, {
          ownerId: user.uid,
          ownerName: getUserDisplayName(user),
          isPublic: Boolean(formData.isPublic),
          allowedEditors: [],
          ...cleanFields,
          imagemData: '',
          favorito: Boolean(formData.favorito),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `repertorios/${newId}`);
      }
    }
  };

  const handleToggleFavorite = async (item: Repertorio) => {
    if (!user || item.ownerId !== user.uid) return;
    const docRef = doc(db, 'repertorios', item.id);
    try {
      await updateDoc(docRef, {
        favorito: !item.favorito,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `repertorios/${item.id}`);
    }
  };

  const handleTogglePublic = async (item: Repertorio) => {
    if (!user || item.ownerId !== user.uid) return;
    const docRef = doc(db, 'repertorios', item.id);
    try {
      await updateDoc(docRef, {
        isPublic: !item.isPublic,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `repertorios/${item.id}`);
    }
  };

  const handleDeleteRepertorio = async (id: string) => {
    if (!user) return;
    const docRef = doc(db, 'repertorios', id);
    try {
      await deleteDoc(docRef);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `repertorios/${id}`);
    }
  };

  // Send Edit Access Request to Owner
  const handleRequestEditAccess = async (item: Repertorio, message?: string) => {
    if (!user || item.ownerId === user.uid) return;

    // Check if there is already a pending request from this user for this repertorio
    const existingPending = outgoingRequests.find(
      (r) => r.repertorioId === item.id && r.status === 'pending'
    );
    if (existingPending) return;

    // If there was a rejected one, delete it before creating a fresh request
    const existingRejected = outgoingRequests.find(
      (r) => r.repertorioId === item.id && r.status === 'rejected'
    );
    if (existingRejected) {
      try {
        await deleteDoc(doc(db, 'editRequests', existingRejected.id));
      } catch {
        // Ignore cleanup failure
      }
    }

    const reqId = generateSafeId('req');
    const reqRef = doc(db, 'editRequests', reqId);

    try {
      await setDoc(reqRef, {
        repertorioId: item.id,
        repertorioNome: item.nome.slice(0, 160),
        ownerId: item.ownerId,
        requesterId: user.uid,
        requesterName: getUserDisplayName(user),
        status: 'pending',
        message: (message || '').trim().slice(0, 300),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `editRequests/${reqId}`);
    }
  };

  // Owner Accepts Edit Request -> Adds requesterId to repertorio.allowedEditors + marks request 'accepted'
  const handleAcceptEditRequest = async (req: EditRequest) => {
    if (!user || req.ownerId !== user.uid) return;

    const targetRep = repertorios.find((r) => r.id === req.repertorioId);
    const currentEditors = targetRep?.allowedEditors || [];
    if (currentEditors.length >= 15 && !currentEditors.includes(req.requesterId)) {
      return;
    }

    const batch = writeBatch(db);
    const reqRef = doc(db, 'editRequests', req.id);
    const repRef = doc(db, 'repertorios', req.repertorioId);

    batch.update(reqRef, {
      status: 'accepted',
      updatedAt: serverTimestamp(),
    });

    if (targetRep) {
      batch.update(repRef, {
        allowedEditors: arrayUnion(req.requesterId),
        updatedAt: serverTimestamp(),
      });
    }

    try {
      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `editRequests/${req.id}`);
    }
  };

  // Owner Rejects Edit Request
  const handleRejectEditRequest = async (req: EditRequest) => {
    if (!user || req.ownerId !== user.uid) return;
    const reqRef = doc(db, 'editRequests', req.id);
    try {
      await updateDoc(reqRef, {
        status: 'rejected',
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `editRequests/${req.id}`);
    }
  };

  // Delete / Dismiss Notification
  const handleDeleteEditRequest = async (id: string) => {
    if (!user) return;
    const reqRef = doc(db, 'editRequests', id);
    try {
      await deleteDoc(reqRef);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `editRequests/${id}`);
    }
  };

  const handleSeedInitialCollection = async () => {
    if (!user || isSeeding) return;
    setIsSeeding(true);
    try {
      for (const sample of CURATED_SEED_REPERTORIOS) {
        const newId = generateSafeId('rep');
        const docRef = doc(db, 'repertorios', newId);
        await setDoc(docRef, {
          ownerId: user.uid,
          ownerName: getUserDisplayName(user),
          isPublic: sample.isPublic,
          allowedEditors: [],
          nome: sample.nome,
          titulo: sample.titulo,
          autor: sample.autor,
          eixoTematico: sample.eixoTematico,
          tipoObra: sample.tipoObra,
          ano: sample.ano || '',
          citacaoChave: sample.citacaoChave || '',
          resumo: sample.resumo,
          criticas: sample.criticas || '',
          conexaoTemas: sample.conexaoTemas || '',
          exemploParagrafo: sample.exemploParagrafo || '',
          tags: sample.tags,
          imagemData: '',
          favorito: sample.favorito,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'repertorios');
    } finally {
      setIsSeeding(false);
    }
  };

  // 5. Dynamic Filter Lists
  const uniqueAutores = useMemo(() => {
    const set = new Set<string>();
    repertorios.forEach((r) => {
      if (r.autor) set.add(r.autor);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [repertorios]);

  const uniqueTags = useMemo(() => {
    const counts = new Map<string, number>();
    repertorios.forEach((r) => {
      r.tags.forEach((t) => {
        counts.set(t, (counts.get(t) || 0) + 1);
      });
    });
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([tag]) => tag);
  }, [repertorios]);

  // 6. Multi-Field Search & Filtering Logic
  const filteredRepertorios = useMemo(() => {
    const q = normalizeText(searchQuery);

    return repertorios.filter((item) => {
      // Ownership / Global Sharing Filter
      if (user) {
        if (ownershipFilter === 'meus' && item.ownerId !== user.uid) return false;
        if (
          ownershipFilter === 'comunidade' &&
          (!item.isPublic || item.ownerId === user.uid)
        ) {
          return false;
        }
        if (
          ownershipFilter === 'colaborador' &&
          !item.allowedEditors.includes(user.uid)
        ) {
          return false;
        }
      }

      if (selectedEixo !== 'Todos' && item.eixoTematico !== selectedEixo) return false;
      if (selectedTipo !== 'Todos' && item.tipoObra !== selectedTipo) return false;
      if (selectedAutor !== 'Todos' && item.autor !== selectedAutor) return false;
      if (selectedTag !== 'Todas' && !item.tags.includes(selectedTag)) return false;

      if (!q) return true;

      const matchNome = normalizeText(item.nome).includes(q);
      const matchTitulo = normalizeText(item.titulo).includes(q);
      const matchAutor = normalizeText(item.autor).includes(q);
      const matchEixo = normalizeText(item.eixoTematico).includes(q);
      const matchTipo = normalizeText(item.tipoObra).includes(q);
      const matchTags = item.tags.some((t) => normalizeText(t).includes(q));
      const matchTextos =
        normalizeText(item.resumo).includes(q) ||
        normalizeText(item.criticas || '').includes(q) ||
        normalizeText(item.conexaoTemas || '').includes(q) ||
        normalizeText(item.exemploParagrafo || '').includes(q);

      switch (searchScope) {
        case 'nome':
          return matchNome;
        case 'titulo':
          return matchTitulo;
        case 'autor':
          return matchAutor;
        case 'eixo':
          return matchEixo;
        case 'tipo':
          return matchTipo;
        case 'tags':
          return matchTags;
        case 'todos':
        default:
          return (
            matchNome ||
            matchTitulo ||
            matchAutor ||
            matchEixo ||
            matchTipo ||
            matchTags ||
            matchTextos
          );
      }
    });
  }, [
    repertorios,
    user,
    ownershipFilter,
    searchQuery,
    searchScope,
    selectedEixo,
    selectedTipo,
    selectedAutor,
    selectedTag,
  ]);

  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    ownershipFilter !== 'todos' ||
    selectedEixo !== 'Todos' ||
    selectedTipo !== 'Todos' ||
    selectedAutor !== 'Todos' ||
    selectedTag !== 'Todas';

  const clearAllFilters = () => {
    setSearchQuery('');
    setSearchScope('todos');
    setOwnershipFilter('todos');
    setSelectedEixo('Todos');
    setSelectedTipo('Todos');
    setSelectedAutor('Todos');
    setSelectedTag('Todas');
  };

  // Key that updates whenever any search or filter criterion changes to trigger entrance animations
  const filterAnimationKey = `${viewMode}-${ownershipFilter}-${searchScope}-${selectedEixo}-${selectedTipo}-${selectedAutor}-${selectedTag}-${normalizeText(searchQuery)}`;

  const myRequestForViewingItem = useMemo(() => {
    if (!viewingItem) return null;
    return outgoingRequests.find((r) => r.repertorioId === viewingItem.id) || null;
  }, [viewingItem, outgoingRequests]);

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-[#0F172A]">
      {/* TOP BAR */}
      <header className="sticky top-0 z-30 flex items-center justify-between px-6 lg:px-10 py-3.5 border-b border-slate-200 bg-white/95 backdrop-blur-xs">
        {/* Brand */}
        <a
          href="#explorar"
          onClick={(e) => {
            e.preventDefault();
            clearAllFilters();
          }}
          className="text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap"
        >
          RepertórioHub
        </a>

        {/* Primary Actions + Notification Bell */}
        <div className="flex items-center gap-2.5">
          {user ? (
            <>
              <NotificationBell
                currentUserId={user.uid}
                incomingRequests={incomingRequests}
                outgoingRequests={outgoingRequests}
                onAcceptRequest={handleAcceptEditRequest}
                onRejectRequest={handleRejectEditRequest}
                onDeleteRequest={handleDeleteEditRequest}
                onOpenRepertorioById={(repId) => {
                  const found = repertorios.find((r) => r.id === repId);
                  if (found) setViewingItem(found);
                }}
              />

              <button
                type="button"
                onClick={() => {
                  setEditingItem(null);
                  setIsFormOpen(true);
                }}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg text-white bg-blue-600 hover:bg-blue-700 transition-colors whitespace-nowrap shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Novo Repertório</span>
              </button>

              <button
                type="button"
                onClick={handleSignOut}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg text-slate-600 hover:text-slate-900 border border-slate-200 bg-white hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
                title={`Sair (${user.email || user.displayName})`}
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Sair</span>
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={handleSignIn}
              className="flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg text-white bg-blue-600 hover:bg-blue-700 transition-colors whitespace-nowrap shrink-0"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Entrar com Google</span>
            </button>
          )}
        </div>
      </header>

      {/* MAIN VIEWPORT */}
      <main className="flex-1 w-full max-w-[1380px] mx-auto px-6 lg:px-10 py-8">
        {!authReady ? (
          <div className="py-24 text-center text-sm text-slate-500">
            Carregando ambiente...
          </div>
        ) : !user ? (
          /* UNAUTHENTICATED MODERN WORKSPACE LANDING */
          <div className="py-10 lg:py-16">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center border-b border-slate-200 pb-14">
              <div className="lg:col-span-7 space-y-5">
                <p className="text-xs font-semibold text-blue-600 tracking-wide">
                  Plataforma Colaborativa de Organização e Busca de Repertórios
                </p>
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900 tracking-tight leading-[1.12] max-w-2xl">
                  Centralize, filtre e compartilhe repertórios em segundos.
                </h1>
                <p className="text-base text-slate-600 leading-relaxed max-w-xl">
                  Um espaço de trabalho moderno para armazenar referências, conceitos, obras e exemplos de parágrafo. Mantenha cards privados ou torne-os públicos para leitura global com sistema de solicitação de edição colaborativa.
                </p>

                {authError && (
                  <div className="p-3.5 rounded-lg border border-red-200 bg-red-50 text-xs text-red-700 max-w-md">
                    {authError}
                  </div>
                )}

                <div className="pt-2 flex flex-wrap items-center gap-4">
                  <button
                    type="button"
                    onClick={handleSignIn}
                    className="px-6 py-3 text-sm font-semibold rounded-lg text-white bg-blue-600 hover:bg-blue-700 transition-colors whitespace-nowrap shadow-xs"
                  >
                    Começar Agora com Google
                  </button>
                  <span className="text-xs text-slate-500">
                    Cards privados ou públicos · Solicitações de edição em tempo real
                  </span>
                </div>
              </div>

              {/* Right Column: Sample Modern UI Card */}
              <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 p-6 lg:p-7 space-y-4 shadow-xs">
                <div className="flex items-center justify-between text-xs text-slate-500 border-b border-slate-100 pb-3">
                  <span className="text-blue-600 font-semibold">
                    Tecnologia, Ciência e Sociedade
                  </span>
                  <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                    <Globe className="w-3.5 h-3.5" />
                    Público (Leitura)
                  </span>
                </div>
                <div>
                  <p className="text-xs text-slate-500">
                    Zygmunt Bauman · <span className="text-slate-800 font-medium">Modernidade Líquida</span>
                  </p>
                  <h2 className="text-xl font-bold text-slate-900 mt-1">
                    Modernidade Líquida e Fragilidade dos Laços
                  </h2>
                </div>
                <div className="pl-3.5 border-l-2 border-blue-600 text-xs text-slate-600 bg-slate-50 py-2.5 pr-3 rounded-r-md">
                  “Vivemos em tempos líquidos. Nada foi feito para durar, tampouco as relações humanas e as instituições sociais.”
                </div>
                <div className="space-y-2.5 text-xs text-slate-600 leading-relaxed">
                  <p>
                    <strong className="text-slate-900 font-semibold block mb-0.5">
                      Resumo da Obra
                    </strong>
                    Contrapõe a rigidez das instituições do século XX à fluidez contemporânea, na qual vínculos e identidades tornam-se voláteis.
                  </p>
                  <p>
                    <strong className="text-slate-900 font-semibold block mb-0.5">
                      Conexão com Temas
                    </strong>
                    Saúde mental na era digital, superficialidade nas redes sociais, hiperconsumo e enfraquecimento da empatia coletiva.
                  </p>
                </div>
                <div className="pt-3 border-t border-slate-100 flex items-center gap-2 text-xs text-slate-500 font-mono-tabular">
                  <span className="text-blue-600">#sociologia</span>
                  <span>·</span>
                  <span className="text-blue-600">#consumismo</span>
                  <span>·</span>
                  <span className="text-blue-600">#redes-sociais</span>
                </div>
              </div>
            </div>

            {/* Feature Overview Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-10">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 mb-1.5">
                  01. Busca Multi-Critério Instantânea
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Pesquise simultaneamente ou isole a busca por Nome do Repertório, Título da Obra, Autor, Eixo Temático, Tipo de Obra e Tags.
                </p>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-900 mb-1.5">
                  02. Formatação Rápida e Revisão
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Use atalhos rápidos como Ctrl + B para negrito, Shift + H para marca-texto azul suave e corretor gramatical integrado.
                </p>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-900 mb-1.5">
                  03. Compartilhamento Global e Colaboração
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Publique cards para leitura global e gerencie solicitações de edição de outros usuários diretamente pelo sino de notificações.
                </p>
              </div>
            </div>
          </div>
        ) : (
          /* AUTHENTICATED WORKSPACE */
          <div className="space-y-6">
            {/* Workspace Header */}
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mb-1">
                  <span>Explorar Global</span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono-tabular">
                    {ownRepertorios.length} meus
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono-tabular">
                    {repertorios.filter((r) => r.isPublic).length} públicos
                  </span>
                  {collaboratorRepertorios.length > 0 && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono-tabular text-emerald-700 font-medium">
                        {collaboratorRepertorios.length} liberados para edição
                      </span>
                    </>
                  )}
                </div>
                <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 tracking-tight">
                  Explorar Repertórios
                </h1>
              </div>

              {/* Ownership Scope Filter + View Mode Switcher & Quick Seed */}
              <div className="flex flex-wrap items-center gap-3">
                {ownRepertorios.length === 0 && !loadingData && (
                  <button
                    type="button"
                    onClick={handleSeedInitialCollection}
                    disabled={isSeeding}
                    className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg text-blue-700 border border-blue-200 bg-blue-50 hover:bg-blue-100/80 transition-colors whitespace-nowrap"
                  >
                    <Database className="w-3.5 h-3.5" />
                    <span>
                      {isSeeding ? 'Importando...' : 'Importar 6 Repertórios de Exemplo'}
                    </span>
                  </button>
                )}

                {/* Visibility / Ownership Segmented Filter */}
                <div className="flex items-center p-1 rounded-lg bg-slate-200/70">
                  {(
                    [
                      { id: 'todos', label: 'Todos' },
                      { id: 'meus', label: 'Meus Cards' },
                      { id: 'comunidade', label: 'Públicos (Global)' },
                      { id: 'colaborador', label: 'Colaborador' },
                    ] as { id: OwnershipFilter; label: string }[]
                  ).map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setOwnershipFilter(tab.id)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                        ownershipFilter === tab.id
                          ? 'bg-white text-slate-900 shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                <div className="flex items-center p-1 rounded-lg bg-slate-200/70">
                  <button
                    type="button"
                    onClick={() => setViewMode('grid')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                      viewMode === 'grid'
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                    <span>Cards</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('table')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                      viewMode === 'table'
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <ListIcon className="w-3.5 h-3.5" />
                    <span>Lista Compacta</span>
                  </button>
                </div>
              </div>
            </div>

            {/* MULTI-CRITERION SEARCH & FILTER CONSOLE */}
            <section
              aria-label="Sistema de Pesquisa e Filtros"
              className="bg-white rounded-xl border border-slate-200 p-5 space-y-4 shadow-2xs"
            >
              {/* Primary Search Row with Field Scope Selector */}
              <div className="flex flex-col md:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Pesquisar por nome, autor, eixo temático, tipo de obra, título ou tags..."
                    className="w-full pl-10 pr-9 py-2.5 text-sm rounded-lg bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-blue-600 transition-colors"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                      aria-label="Limpar busca"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Search Scope Segmented Selector */}
                <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-100 overflow-x-auto">
                  {(
                    [
                      { id: 'todos', label: 'Tudo' },
                      { id: 'nome', label: 'Nome' },
                      { id: 'titulo', label: 'Título' },
                      { id: 'autor', label: 'Autor' },
                      { id: 'eixo', label: 'Eixo' },
                      { id: 'tipo', label: 'Tipo de Obra' },
                      { id: 'tags', label: 'Tags' },
                    ] as { id: SearchScope; label: string }[]
                  ).map((scope) => (
                    <button
                      key={scope.id}
                      type="button"
                      onClick={() => setSearchScope(scope.id)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                        searchScope === scope.id
                          ? 'bg-white text-slate-900 shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {scope.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Facet Dropdowns Row: Eixo Temático, Tipo de Obra, Autor, Tags */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
                <div>
                  <label className="block text-[11px] font-medium text-slate-500 mb-1">
                    Eixo Temático
                  </label>
                  <select
                    value={selectedEixo}
                    onChange={(e) => setSelectedEixo(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-slate-50 border border-slate-200 text-slate-800 focus:bg-white focus:outline-none focus:border-blue-600 transition-colors"
                  >
                    <option value="Todos">Todos os Eixos</option>
                    {EIXOS_TEMATICOS.map((eixo) => (
                      <option key={eixo} value={eixo}>
                        {eixo}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-500 mb-1">
                    Tipo de Obra
                  </label>
                  <select
                    value={selectedTipo}
                    onChange={(e) => setSelectedTipo(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-slate-50 border border-slate-200 text-slate-800 focus:bg-white focus:outline-none focus:border-blue-600 transition-colors"
                  >
                    <option value="Todos">Todos os Tipos</option>
                    {TIPOS_DE_OBRA.map((tipo) => (
                      <option key={tipo} value={tipo}>
                        {tipo}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-500 mb-1">
                    Autor
                  </label>
                  <select
                    value={selectedAutor}
                    onChange={(e) => setSelectedAutor(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-slate-50 border border-slate-200 text-slate-800 focus:bg-white focus:outline-none focus:border-blue-600 transition-colors"
                  >
                    <option value="Todos">Todos os Autores ({uniqueAutores.length})</option>
                    {uniqueAutores.map((autor) => (
                      <option key={autor} value={autor}>
                        {autor}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-500 mb-1">
                    Tag
                  </label>
                  <select
                    value={selectedTag}
                    onChange={(e) => setSelectedTag(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-slate-50 border border-slate-200 text-slate-800 focus:bg-white focus:outline-none focus:border-blue-600 transition-colors"
                  >
                    <option value="Todas">Todas as Tags ({uniqueTags.length})</option>
                    {uniqueTags.map((tag) => (
                      <option key={tag} value={tag}>
                        #{tag}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Active Filter Status Bar */}
              {hasActiveFilters && (
                <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs">
                  <div className="flex flex-wrap items-center gap-2 text-slate-600">
                    <SlidersHorizontal className="w-3.5 h-3.5 text-blue-600" />
                    <span>
                      Mostrando <strong className="font-mono-tabular text-slate-900">{filteredRepertorios.length}</strong> de{' '}
                      <span className="font-mono-tabular">{repertorios.length}</span> repertórios
                    </span>
                    {ownershipFilter !== 'todos' && (
                      <span>· Filtro: <strong>{ownershipFilter}</strong></span>
                    )}
                    {selectedEixo !== 'Todos' && (
                      <span>· Eixo: <strong>{selectedEixo}</strong></span>
                    )}
                    {selectedTipo !== 'Todos' && (
                      <span>· Tipo: <strong>{selectedTipo}</strong></span>
                    )}
                    {selectedAutor !== 'Todos' && (
                      <span>· Autor: <strong>{selectedAutor}</strong></span>
                    )}
                    {selectedTag !== 'Todas' && (
                      <span>· Tag: <strong>#{selectedTag}</strong></span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={clearAllFilters}
                    className="text-xs font-semibold text-blue-600 hover:underline whitespace-nowrap"
                  >
                    Limpar filtros
                  </button>
                </div>
              )}
            </section>

            {/* DATA VIEWPORT: Loading / Empty / Grid / Table */}
            {loadingData ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {[1, 2, 3].map((n) => (
                  <div
                    key={n}
                    className="h-64 rounded-xl border border-slate-200 bg-white p-6 animate-pulse flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      <div className="h-3 bg-slate-100 rounded w-1/2" />
                      <div className="h-5 bg-slate-100 rounded w-3/4" />
                      <div className="h-16 bg-slate-50 rounded w-full mt-4" />
                    </div>
                    <div className="h-3 bg-slate-100 rounded w-1/3" />
                  </div>
                ))}
              </div>
            ) : filteredRepertorios.length === 0 ? (
              <div className="rounded-xl border border-slate-200 bg-white p-12 text-center max-w-xl mx-auto my-8 space-y-4">
                <FolderSearch className="w-8 h-8 text-slate-400 mx-auto stroke-[1.5]" />
                <h2 className="text-lg font-bold text-slate-900">
                  {repertorios.length === 0
                    ? 'Nenhum repertório cadastrado ainda'
                    : 'Nenhum resultado encontrado'}
                </h2>
                <p className="text-xs text-slate-500 leading-relaxed">
                  {repertorios.length === 0
                    ? 'Comece adicionando seu primeiro repertório com resumo, críticas, conexão com temas e exemplo de parágrafo, ou carregue os exemplos iniciais.'
                    : 'Tente ajustar o termo pesquisado ou limpar os filtros selecionados acima.'}
                </p>
                <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
                  {repertorios.length === 0 ? (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingItem(null);
                          setIsFormOpen(true);
                        }}
                        className="px-4 py-2 text-xs font-semibold rounded-lg text-white bg-blue-600 hover:bg-blue-700 transition-colors"
                      >
                        Criar Primeiro Repertório
                      </button>
                      <button
                        type="button"
                        onClick={handleSeedInitialCollection}
                        disabled={isSeeding}
                        className="px-4 py-2 text-xs font-medium rounded-lg text-slate-700 border border-slate-200 bg-slate-50 hover:bg-slate-100 transition-colors"
                      >
                        {isSeeding ? 'Importando...' : 'Importar 6 Exemplos'}
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={clearAllFilters}
                      className="px-4 py-2 text-xs font-medium rounded-lg text-slate-700 border border-slate-200 bg-white hover:bg-slate-50 transition-colors"
                    >
                      Limpar filtros
                    </button>
                  )}
                </div>
              </div>
            ) : viewMode === 'grid' ? (
              /* MODERN SAAS CARDS GRID */
              <div
                key={filterAnimationKey}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
              >
                {filteredRepertorios.map((item, idx) => {
                  const staggerClass = `delay-item-${Math.min(idx, 8)}`;
                  const isOwner = item.ownerId === user.uid;
                  const isCollaborator = item.allowedEditors.includes(user.uid);
                  const canEdit = isOwner || isCollaborator;
                  const myPendingReq = outgoingRequests.find(
                    (r) => r.repertorioId === item.id && r.status === 'pending'
                  );

                  return (
                    <article
                      key={item.id}
                      onClick={() => setViewingItem(item)}
                      className={`animate-card-enter ${staggerClass} group rounded-xl border border-slate-200 bg-white hover:border-blue-400 hover:-translate-y-0.5 hover:shadow-md transition-all duration-200 ease-out flex flex-col justify-between cursor-pointer overflow-hidden`}
                    >
                      <div>
                        <div className="p-5">
                          {/* Quiet 1-line unboxed metadata kicker */}
                          <div className="flex items-center justify-between gap-2 text-xs text-slate-500 mb-2">
                            <div className="truncate">
                              <span className="text-blue-600 font-semibold">
                                {item.eixoTematico}
                              </span>
                              <span aria-hidden="true"> · </span>
                              <span>{item.tipoObra}</span>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              {isOwner ? (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleTogglePublic(item);
                                  }}
                                  title={
                                    item.isPublic
                                      ? 'Público (Leitura): clique para tornar privado'
                                      : 'Privado: clique para tornar público'
                                  }
                                  className={`inline-flex items-center gap-1 text-[11px] font-medium transition-colors ${
                                    item.isPublic
                                      ? 'text-emerald-600 hover:text-emerald-700'
                                      : 'text-slate-400 hover:text-slate-700'
                                  }`}
                                >
                                  {item.isPublic ? (
                                    <Globe className="w-3.5 h-3.5" />
                                  ) : (
                                    <Lock className="w-3.5 h-3.5" />
                                  )}
                                </button>
                              ) : (
                                <span
                                  className="inline-flex items-center gap-1 text-[11px] text-emerald-600"
                                  title={`Compartilhado por ${item.ownerName || 'Usuário'}`}
                                >
                                  <Globe className="w-3.5 h-3.5" />
                                </span>
                              )}

                              {isOwner && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleToggleFavorite(item);
                                  }}
                                  className="text-slate-300 hover:text-blue-600 transition-colors shrink-0"
                                  aria-label="Destacar repertório"
                                >
                                  <Star
                                    className={`w-4 h-4 ${
                                      item.favorito ? 'fill-blue-600 text-blue-600' : ''
                                    }`}
                                  />
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Primary Repertorio Title */}
                          <h2 className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors leading-snug">
                            {item.nome}
                          </h2>

                          {/* Obra & Autor + Shared Owner Info */}
                          <p className="text-xs text-slate-500 mt-1">
                            <span className="font-medium text-slate-800">{item.autor}</span>
                            <span aria-hidden="true"> · </span>
                            <span>{item.titulo}</span>
                            {item.ano && (
                              <span className="font-mono-tabular text-slate-400"> ({item.ano})</span>
                            )}
                            {!isOwner && item.ownerName && (
                              <span className="text-slate-400"> · por {item.ownerName}</span>
                            )}
                          </p>

                          {/* Resumo Preview */}
                          <p className="text-xs text-slate-600 leading-relaxed mt-3.5 line-clamp-3">
                            <FormattedText text={item.resumo} />
                          </p>

                          {/* Thematic Connection Preview */}
                          {item.conexaoTemas && (
                            <div className="mt-3.5 pt-3 border-t border-slate-100">
                              <p className="text-[11px] text-slate-500 line-clamp-2">
                                <strong className="text-slate-700 font-semibold">
                                  Conexão:{' '}
                                </strong>
                                <FormattedText text={item.conexaoTemas} />
                              </p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Card Footer: Unboxed Tags & Actions */}
                      <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/60 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 text-[11px] text-slate-500 font-mono-tabular truncate">
                          {item.tags.length > 0 ? (
                            item.tags.slice(0, 3).map((tag, tagIdx) => (
                              <React.Fragment key={tag}>
                                {tagIdx > 0 && <span aria-hidden="true">·</span>}
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedTag(tag);
                                  }}
                                  className="hover:text-blue-600 hover:underline truncate"
                                >
                                  #{tag}
                                </button>
                              </React.Fragment>
                            ))
                          ) : (
                            <span>Sem tags</span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {canEdit ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingItem(item);
                                setIsFormOpen(true);
                              }}
                              className="p-1 text-slate-400 hover:text-slate-900 transition-colors"
                              aria-label="Editar repertório"
                              title={
                                isOwner
                                  ? 'Editar meu repertório'
                                  : 'Editar repertório (Colaborador autorizado)'
                              }
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          ) : myPendingReq ? (
                            <span className="text-[11px] text-amber-700 font-medium">
                              Pendente
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRequestEditAccess(item);
                              }}
                              className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 hover:text-blue-600 transition-colors"
                              title="Solicitar permissão de edição ao proprietário"
                            >
                              <Send className="w-3 h-3" />
                              <span>Pedir Edição</span>
                            </button>
                          )}

                          <span className="text-xs font-semibold text-blue-600 group-hover:underline whitespace-nowrap">
                            Abrir
                          </span>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              /* HIGH-DENSITY MODERN TABLE VIEW */
              <div
                key={filterAnimationKey}
                className="animate-card-enter rounded-xl border border-slate-200 bg-white overflow-x-auto"
              >
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold text-slate-600">
                      <th className="py-3 px-4">Nome do Repertório</th>
                      <th className="py-3 px-4">Título da Obra</th>
                      <th className="py-3 px-4">Autor</th>
                      <th className="py-3 px-4">Eixo Temático</th>
                      <th className="py-3 px-4">Acesso</th>
                      <th className="py-3 px-4 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {filteredRepertorios.map((item, idx) => {
                      const staggerClass = `delay-item-${Math.min(idx, 8)}`;
                      const isOwner = item.ownerId === user.uid;
                      const isCollaborator = item.allowedEditors.includes(user.uid);
                      const canEdit = isOwner || isCollaborator;

                      return (
                        <tr
                          key={item.id}
                          onClick={() => setViewingItem(item)}
                          className={`animate-card-enter ${staggerClass} hover:bg-slate-50 transition-colors duration-150 cursor-pointer`}
                        >
                          <td className="py-3.5 px-4 font-semibold text-slate-900">
                            <div className="flex items-center gap-2">
                              {item.favorito && isOwner && (
                                <Star className="w-3.5 h-3.5 fill-blue-600 text-blue-600 shrink-0" />
                              )}
                              <span>{item.nome}</span>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-slate-700 font-medium">
                            {item.titulo}
                          </td>
                          <td className="py-3.5 px-4 text-slate-600">{item.autor}</td>
                          <td className="py-3.5 px-4 text-blue-600 font-medium">
                            {item.eixoTematico}
                          </td>
                          <td className="py-3.5 px-4 text-slate-500">
                            {isOwner ? (
                              item.isPublic ? (
                                <span className="inline-flex items-center gap-1 text-emerald-700">
                                  <Globe className="w-3.5 h-3.5" />
                                  Público
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-slate-500">
                                  <Lock className="w-3.5 h-3.5" />
                                  Privado
                                </span>
                              )
                            ) : isCollaborator ? (
                              <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Editor
                              </span>
                            ) : (
                              <span className="text-slate-500">
                                Leitura ({item.ownerName || 'Comunidade'})
                              </span>
                            )}
                          </td>
                          <td
                            className="py-3.5 px-4 text-right whitespace-nowrap"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="inline-flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => setViewingItem(item)}
                                className="p-1 text-slate-400 hover:text-slate-900"
                                aria-label="Visualizar"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              {canEdit && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingItem(item);
                                    setIsFormOpen(true);
                                  }}
                                  className="p-1 text-slate-400 hover:text-slate-900"
                                  aria-label="Editar"
                                >
                                  <Edit3 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </main>

      {/* MODERN CLEAN FOOTER */}
      <footer className="mt-auto border-t border-slate-200 bg-white py-5 px-6 lg:px-10 text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-4">
        <span className="font-medium text-slate-700">RepertórioHub</span>
        <span>
          Compartilhamento Global (Privado / Público) · Solicitações de Edição em Tempo Real
        </span>
      </footer>

      {/* ADD / EDIT FORM MODAL */}
      {isFormOpen && user && (
        <RepertorioModal
          currentUserId={user.uid}
          initialData={editingItem}
          onClose={() => {
            setIsFormOpen(false);
            setEditingItem(null);
          }}
          onSave={handleSaveRepertorio}
        />
      )}

      {/* FULL DETAIL MODAL */}
      {viewingItem && user && (
        <RepertorioDetailModal
          currentUserId={user.uid}
          repertorio={viewingItem}
          myEditRequest={myRequestForViewingItem}
          onClose={() => setViewingItem(null)}
          onEdit={(rep) => {
            setViewingItem(null);
            setEditingItem(rep);
            setIsFormOpen(true);
          }}
          onDelete={handleDeleteRepertorio}
          onToggleFavorite={handleToggleFavorite}
          onTogglePublic={handleTogglePublic}
          onRequestEditAccess={handleRequestEditAccess}
          onSelectTag={(tag) => {
            setSelectedTag(tag);
          }}
        />
      )}
    </div>
  );
}
