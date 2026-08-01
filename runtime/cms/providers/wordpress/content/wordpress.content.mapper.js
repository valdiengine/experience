import { WordPressPostMapper } from './wordpress.post.mapper.js'
import { WordPressPageMapper } from './wordpress.page.mapper.js'
import { WordPressMappingError } from '../errors/wordpress.provider.errors.js'

export class WordPressContentMapper {
  #postMapper = null
  #pageMapper = null

  constructor() {
    this.#postMapper = new WordPressPostMapper()
    this.#pageMapper = new WordPressPageMapper()
  }

  toEngine(wpEntity, type) {
    switch (type || wpEntity.type || wpEntity.post_type) {
      case 'post':
        return this.#postMapper.toEngine(wpEntity)
      case 'page':
        return this.#pageMapper.toEngine(wpEntity)
      case 'category':
        return this.#mapCategoryToEngine(wpEntity)
      case 'tag':
        return this.#mapTagToEngine(wpEntity)
      case 'author':
      case 'user':
        return this.#mapAuthorToEngine(wpEntity)
      default:
        return this.#mapGenericToEngine(wpEntity, type)
    }
  }

  toProvider(engineEntity) {
    const type = engineEntity.type || 'post'
    switch (type) {
      case 'post':
        return this.#postMapper.toProvider(engineEntity)
      case 'page':
        return this.#pageMapper.toProvider(engineEntity)
      default:
        throw new WordPressMappingError(`Unsupported content type for provider mapping: ${type}`, { type })
    }
  }

  toEngineBatch(wpEntities, type) {
    return (wpEntities || []).map(entity => this.toEngine(entity, type))
  }

  #mapCategoryToEngine(wpCategory) {
    return {
      cmsId: String(wpCategory.id),
      provider: 'wordpress',
      type: 'category',
      name: wpCategory.name || '',
      slug: wpCategory.slug || '',
      description: wpCategory.description || '',
      parentId: wpCategory.parent ? String(wpCategory.parent) : null,
      count: wpCategory.count || 0,
      meta: {
        wpLink: wpCategory.link || null,
        wpTaxonomy: wpCategory.taxonomy || 'category',
      },
      raw: wpCategory,
    }
  }

  #mapTagToEngine(wpTag) {
    return {
      cmsId: String(wpTag.id),
      provider: 'wordpress',
      type: 'tag',
      name: wpTag.name || '',
      slug: wpTag.slug || '',
      description: wpTag.description || '',
      count: wpTag.count || 0,
      meta: {
        wpLink: wpTag.link || null,
        wpTaxonomy: wpTag.taxonomy || 'post_tag',
      },
      raw: wpTag,
    }
  }

  #mapAuthorToEngine(wpUser) {
    return {
      cmsId: String(wpUser.id),
      provider: 'wordpress',
      type: 'author',
      name: wpUser.name || '',
      slug: wpUser.slug || '',
      avatarUrl: wpUser.avatar_urls?.['96'] || wpUser.avatar_urls?.['48'] || null,
      description: wpUser.description || '',
      meta: {
        wpLink: wpUser.link || null,
        wpUserId: wpUser.id || null,
      },
      raw: wpUser,
    }
  }

  #mapGenericToEngine(wpEntity, type) {
    return {
      cmsId: String(wpEntity.id),
      provider: 'wordpress',
      type: type || 'unknown',
      title: wpEntity.title?.rendered || wpEntity.title || '',
      slug: wpEntity.slug || '',
      content: wpEntity.content?.rendered || '',
      status: wpEntity.status || 'unknown',
      createdAt: wpEntity.date || null,
      updatedAt: wpEntity.modified || null,
      meta: {
        wpLink: wpEntity.link || null,
        wpType: wpEntity.type || type,
      },
      raw: wpEntity,
    }
  }
}

export default WordPressContentMapper
