const SVG_ATTRS = 'viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"'

export const DOMAIN_ICONS = {
  film:   `<svg ${SVG_ATTRS}><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M2 8h20M7 4v4M17 4v4M7 16v4M17 16v4M12 4v4M12 16v4"/></svg>`,
  camera: `<svg ${SVG_ATTRS}><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>`,
}

export const getDomainIcon = (name) => DOMAIN_ICONS[name] || null
