# AI Documentation Flow

```mermaid
flowchart TD
    A[AI_BOOTSTRAP.md] --> B[00_READ_FIRST.md]
    B --> C[PROJECT_CONTEXT.md]
    C --> D[ARCHITECTURE_FINGERPRINT.md]
    D --> E[AI_SESSION_REPORT.md]
    D --> F[AI_DECISIONS.md]
    D --> G[ARCHITECTURE_CHANGELOG.md]
    D --> H[AI_RULES.md]
    D --> I[AI_HANDSHAKE.md]
    E --> J[CURRENT_STATE.md]
    F --> J
    G --> J
    H --> J
    I --> J
    J --> K[NEXT_PHASE.md]
    J --> L[Implementation]
    L --> M[Smoke Test]
    M --> N[Validation]
    N --> O[Audit]
    O --> P[Documentation Update]
    P --> Q[AI_SESSION_REPORT.md Append]
    P --> R[ARCHITECTURE_CHANGELOG.md Update]
    P --> S[AI_DOCUMENTATION_AUDIT.md Update]

    style A fill:#e1f5fe
    style B fill:#e1f5fe
    style C fill:#e1f5fe
    style D fill:#fff3e0
    style L fill:#e8f5e9
    style M fill:#fff3e0
    style N fill:#fff3e0
    style O fill:#fff3e0
```

## Legend

- **Blue**: Entry documents (mandatory reading)
- **Orange**: Core architecture documents
- **Green**: Implementation phase
- **Yellow**: Validation phase

## Flow Description

1. Every AI session starts at **AI_BOOTSTRAP.md**
2. Follow reading order through **00_READ_FIRST.md**
3. Build context via **PROJECT_CONTEXT.md** and **ARCHITECTURE_FINGERPRINT.md**
4. Verify via **AI_HANDSHAKE.md** checklist
5. Implement
6. Run **Smoke Test**
7. Validate
8. Audit
9. Update documentation
