export class WordPressPageMapper {
  toEngine(wpPage) {
    return {
      cmsId: String(wpPage.id),
      provider: 'wordpress',
      type: 'page',
      title: wpPage.title?.rendered || '',
      slug: wpPage.slug || '',
      content: wpPage.content?.rendered || '',
      excerpt: wpPage.excerpt?.rendered || '',
      status: this.#mapStatus(wpPage.status),
      authorId: wpPage.author ? String(wpPage.author) : null,
      parentId: wpPage.parent ? String(wpPage.parent) : null,
      template: wpPage.template || 'default',
      order: wpPage.menu_order || 0,
      featuredMediaId: wpPage.featured_media ? String(wpPage.featured_media) : null,
      createdAt: wpPage.date || null,
      updatedAt: wpPage.modified || null,
      meta: {
        wpLink: wpPage.link || null,
        wpType: wpPage.type || 'page',
        wpParent: wpPage.parent || null,
      },
      raw: wpPage,
    }
  }

  toProvider(enginePage) {
    const page = {
      title: enginePage.title || '',
      slug: enginePage.slug || '',
      status: this.#reverseMapStatus(enginePage.status),
      content: enginePage.content || '',
      excerpt: enginePage.excerpt || '',
      author: enginePage.authorId ? parseInt(enginePage.authorId, 10) : undefined,
      parent: enginePage.parentId ? parseInt(enginePage.parentId, 10) : undefined,
      template: enginePage.template || undefined,
      menu_order: enginePage.order !== undefined ? enginePage.order : undefined,
      featured_media: enginePage.featuredMediaId ? parseInt(enginePage.featuredMediaId, 10) : undefined,
    }

    Object.keys(page).forEach(key => {
      if (page[key] === undefined) delete page[key]
    })

    return page
  }

  #mapStatus(wpStatus) {
    const map = {
      publish: 'published',
      draft: 'draft',
      pending: 'pending',
      private: 'private',
      future: 'scheduled',
      trash: 'archived',
    }
    return map[wpStatus] || 'draft'
  }

  #reverseMapStatus(engineStatus) {
    const map = {
      published: 'publish',
      draft: 'draft',
      pending: 'pending',
      private: 'private',
      scheduled: 'future',
      archived: 'trash',
    }
    return map[engineStatus] || 'draft'
  }
}

export default WordPressPageMapper
