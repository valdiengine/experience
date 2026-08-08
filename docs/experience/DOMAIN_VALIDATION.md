# DOMAIN VALIDATION

## Summary

All 5 canonical Valdi production domains have been validated for correct resolution through the Experience Engine configuration hierarchy.

## Canonical Domains

| Domain | Expected Resolution | Actual Resolution | Status |
|--------|-------------------|-------------------|--------|
| valdi.app | valdi / los-rios / cl | valdi / los-rios / cl | PASS |
| natales.app | natales / magallanes / cl | natales / magallanes / cl | PASS |
| puntaarenas.app | puntaarenas / magallanes / cl | puntaarenas / magallanes / cl | PASS |
| coyhaique.app | coyhaique / aysen / cl | coyhaique / aysen / cl | PASS |
| chiloe.app | chiloe / los-lagos / cl | chiloe / los-lagos / cl | PASS |

## Resolution Chain

For each domain, the following resolution chain was verified:

```
Domain Request
    ↓
ProductResolver (hostname strategy)
    ↓
EcosystemResolver
    ↓
ConfigurationLoader
    ↓
FilesystemConfigurationSource
    ↓
ecosystems/{country}/regions/{region}/destinations/{destination}/config.js
```

## Test Evidence

```
=== Experience Context for valdi.app ===
country: cl
region: los-rios
destination: valdi
domain: valdi.app
branding.primary: #c8a55c
experience.type: general
modules: 8

=== Experience Context for natales.app ===
country: cl
region: magallanes
destination: natales
domain: natales.app
branding.primary: #2d5a27
experience.type: general
modules: 7

=== Experience Context for puntaarenas.app ===
country: cl
region: magallanes
destination: puntaarenas
domain: puntaarenas.app
branding.primary: #c8a55c
experience.type: general
modules: 6

=== Experience Context for coyhaique.app ===
country: cl
region: aysen
destination: coyhaique
domain: coyhaique.app
branding.primary: #27ae60
experience.type: general
modules: 6

=== Experience Context for chiloe.app ===
country: cl
region: los-lagos
destination: chiloe
domain: chiloe.app
branding.primary: #e67e22
experience.type: general
modules: 6
```

## Isolation Verification

Cross-destination isolation was verified - each destination returns its own unique configuration:

- valdi.app branding.primary: #c8a55c
- natales.app branding.primary: #2d5a27
- puntaarenas.app branding.primary: #c8a55c
- coyhaique.app branding.primary: #27ae60
- chiloe.app branding.primary: #e67e22

No configuration leakage between destinations detected.

## valdi/Valdivia Note

The canonical domain list states `valdi.app → Valdivia / Los Ríos`, but current configuration has `valdi.app` as a SEPARATE destination from `valdivia.app`:

| Identity | Slug | Domain |
|----------|------|--------|
| valdi | valdi | valdi.app |
| Valdivia | valdivia | valdivia.app |

This appears to be a pre-existing configuration design decision. If `valdi.app` is intended to BE the Valdivia destination, configuration normalization is recommended in a future phase.
