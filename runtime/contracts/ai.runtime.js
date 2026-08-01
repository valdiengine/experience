import { BaseRuntimeContract } from './base.runtime.js'

export class AiRuntime extends BaseRuntimeContract {
  constructor(config = {}) {
    super(config)
    this.name = 'ai'
  }

  async generate(prompt, options) {
    return null
  }

  async chat(messages, options) {
    return null
  }

  async embed(text) {
    return []
  }

  async classify(text, categories) {
    return []
  }

  async summarize(text, options) {
    return null
  }

  async translate(text, targetLanguage) {
    return null
  }

  async analyze(text, options) {
    return null
  }

  async moderate(text) {
    return { flagged: false, categories: [] }
  }

  async complete(prompt, options) {
    return null
  }

  supports(feature) {
    const features = ['chat', 'completion', 'embedding', 'vision', 'audio', 'moderation', 'streaming', 'function-calling']
    return features.includes(feature)
  }
}

export default AiRuntime
