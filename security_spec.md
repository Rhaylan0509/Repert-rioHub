# Security Specification — RepertórioHub (Global Sharing & Edit Requests)

## 1. Data Invariants
1. **Repertorios Visibility & Ownership**:
   - Documents in `/repertorios/{repertorioId}` are owned by `ownerId`.
   - `read` (`get` and `list`) is granted if `ownerId == request.auth.uid`, OR `isPublic == true`, OR `request.auth.uid in allowedEditors`.
   - Tier 1 (`ownerId == request.auth.uid`) can update content, `isPublic`, `favorito`, and `allowedEditors`.
   - Tier 2 (`request.auth.uid in allowedEditors`) can only update analytical content fields (`nome`, `titulo`, `autor`, `eixoTematico`, `tipoObra`, `ano`, `citacaoChave`, `resumo`, `criticas`, `conexaoTemas`, `exemploParagrafo`, `tags`, `updatedAt`) and is strictly forbidden from altering `isPublic`, `ownerId`, `favorito`, or `allowedEditors`.
2. **EditRequests Workflow & Terminal State Locking**:
   - Documents in `/editRequests/{requestId}` can only be created by a verified user where `requesterId == request.auth.uid`, `status == 'pending'`, `ownerId != requesterId`, and `/repertorios/$(repertorioId)` exists with matching `ownerId`.
   - Updates to `/editRequests/{requestId}` can only be performed by the repertoire owner (`existing().ownerId == request.auth.uid`), transitioning from `'pending'` to a terminal status (`'accepted'` or `'rejected'`). Once terminal, no further updates are allowed.
   - `allow list` on `/editRequests` strictly enforces `resource.data.ownerId == request.auth.uid || resource.data.requesterId == request.auth.uid`.
