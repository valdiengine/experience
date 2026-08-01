export class JwtCookieService {
  #config = {}

  constructor(config = {}) {
    this.#config = {
      name: config.cookieName || 'valdi_token',
      refreshName: config.refreshCookieName || 'valdi_refresh',
      domain: config.domain || '',
      path: config.path || '/',
      secure: config.secure !== false,
      httpOnly: config.httpOnly !== false,
      sameSite: config.sameSite || 'lax',
      maxAge: config.maxAge || 900,
      refreshMaxAge: config.refreshMaxAge || 604800,
      tenantIsolation: config.tenantIsolation !== false,
      subdomainSupport: config.subdomainSupport || false,
      ...config,
    }
  }

  createAccessCookie(token, options = {}) {
    return {
      name: this.#config.name,
      value: token,
      options: {
        httpOnly: this.#config.httpOnly,
        secure: this.#config.secure,
        sameSite: this.#config.sameSite,
        path: this.#config.path,
        domain: this.#resolveDomain(options),
        maxAge: options.maxAge || this.#config.maxAge,
        expires: new Date(Date.now() + ((options.maxAge || this.#config.maxAge) * 1000)).toUTCString(),
      },
    }
  }

  createRefreshCookie(token, options = {}) {
    return {
      name: this.#config.refreshName,
      value: token,
      options: {
        httpOnly: this.#config.httpOnly,
        secure: this.#config.secure,
        sameSite: 'strict',
        path: `${this.#config.path}auth/refresh`,
        domain: this.#resolveDomain(options),
        maxAge: options.maxAge || this.#config.refreshMaxAge,
        expires: new Date(Date.now() + ((options.maxAge || this.#config.refreshMaxAge) * 1000)).toUTCString(),
      },
    }
  }

  createClearCookies(options = {}) {
    return [
      {
        name: this.#config.name,
        value: '',
        options: {
          httpOnly: this.#config.httpOnly,
          secure: this.#config.secure,
          sameSite: this.#config.sameSite,
          path: this.#config.path,
          domain: this.#resolveDomain(options),
          maxAge: 0,
          expires: new Date(0).toUTCString(),
        },
      },
      {
        name: this.#config.refreshName,
        value: '',
        options: {
          httpOnly: true,
          secure: this.#config.secure,
          sameSite: 'strict',
          path: `${this.#config.path}auth/refresh`,
          domain: this.#resolveDomain(options),
          maxAge: 0,
          expires: new Date(0).toUTCString(),
        },
      },
    ]
  }

  parseCookies(cookieHeader) {
    if (!cookieHeader) return { access: null, refresh: null }
    const cookies = {}
    cookieHeader.split(';').forEach(c => {
      const parts = c.trim().split('=')
      if (parts.length >= 2) {
        cookies[parts[0].trim()] = parts.slice(1).join('=')
      }
    })
    return {
      access: cookies[this.#config.name] || null,
      refresh: cookies[this.#config.refreshName] || null,
    }
  }

  rotateCookie(token, options = {}) {
    return this.createAccessCookie(token, options)
  }

  supports(feature) {
    const features = ['http-only', 'secure', 'same-site', 'domain', 'path', 'max-age', 'rotation', 'clear', 'parse', 'tenant-isolation', 'subdomain']
    return features.includes(feature)
  }

  #resolveDomain(options) {
    if (options.domain) return options.domain
    if (this.#config.subdomainSupport && this.#config.domain) {
      return `.${this.#config.domain}`
    }
    return this.#config.domain || undefined
  }
}

export default JwtCookieService
