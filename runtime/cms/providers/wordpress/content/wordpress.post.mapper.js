export class WordPressPostMapper {
  toEngine(wpPost) {
    return {
      cmsId: String(wpPost.id),
      provider: 'wordpress',
      type: 'post',
      title: wpPost.title?.rendered || '',
      slug: wpPost.slug || '',
      content: wpPost.content?.rendered || '',
      excerpt: wpPost.excerpt?.rendered || '',
      status: this.#mapStatus(wpPost.status),
      authorId: wpPost.author ? String(wpPost.author) : null,
      categoryIds: wpPost.categories || [],
      tagIds: wpPost.tags || [],
      featuredMediaId: wpPost.featured_media ? String(wpPost.featured_media) : null,
      createdAt: wpPost.date || null,
      updatedAt: wpPost.modified || null,
      meta: {
        wpLink: wpPost.link || null,
        wpType: wpPost.type || 'post',
        wpFormat: wpPost.format || 'standard',
        sticky: wpPost.sticky || false,
        pingStatus: wpPost.ping_status || 'open',
        commentStatus: wpPost.comment_status || 'open',
      },
      raw: wpPost,
    }
  }

  toProvider(enginePost) {
    const post = {
      title: enginePost.title || '',
      slug: enginePost.slug || '',
      status: this.#reverseMapStatus(enginePost.status),
      content: enginePost.content || '',
      excerpt: enginePost.excerpt || '',
      author: enginePost.authorId ? parseInt(enginePost.authorId, 10) : undefined,
      categories: enginePost.categoryIds || [],
      tags: enginePost.tagIds || [],
      featured_media: enginePost.featuredMediaId ? parseInt(enginePost.featuredMediaId, 10) : undefined,
    }

    Object.keys(post).forEach(key => {
      if (post[key] === undefined) delete post[key]
    })

    return post
  }

  #mapStatus(wpStatus) {
    const map = {
      publish: 'published',
      draft: 'draft',
      pending: 'pending',
      private: 'private',
      future: 'scheduled',
      trash: 'archived',
      auto_draft: 'draft',
      inherit: 'published',
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

export default WordPressPostMapper
