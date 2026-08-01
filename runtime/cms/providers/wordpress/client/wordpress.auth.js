export class WordPressAuth {
  #method = null
  #credentials = null

  constructor(config = {}) {
    this.#method = config.authMethod || 'application_password'
    this.#credentials = null
  }

  async initialize(secrets) {
    this.#credentials = {
      username: secrets.username,
      password: secrets.applicationPassword || secrets.password,
      token: secrets.token || null,
    }

    if (!this.#credentials.username || !this.#credentials.password) {
      throw new Error('WordPress credentials incomplete')
    }
  }

  getAuthHeaders() {
    switch (this.#method) {
      case 'application_password':
        return this.#getBasicAuthHeaders()
      case 'oauth2':
        return this.#getOAuthHeaders()
      case 'jwt':
        return this.#getJwtHeaders()
      case 'custom_token':
        return this.#getCustomTokenHeaders()
      default:
        return this.#getBasicAuthHeaders()
    }
  }

  #getBasicAuthHeaders() {
    const encoded = Buffer.from(`${this.#credentials.username}:${this.#credentials.password}`).toString('base64')
    return { Authorization: `Basic ${encoded}` }
  }

  #getOAuthHeaders() {
    return { Authorization: `Bearer ${this.#credentials.token}` }
  }

  #getJwtHeaders() {
    return { Authorization: `Bearer ${this.#credentials.token}` }
  }

  #getCustomTokenHeaders() {
    return { 'X-WP-Token': this.#credentials.token }
  }

  get method() {
    return this.#method
  }

  get configured() {
    return this.#credentials !== null
  }

  supports(method) {
    const supported = ['application_password', 'oauth2', 'jwt', 'custom_token']
    return supported.includes(method)
  }
}

export default WordPressAuth
