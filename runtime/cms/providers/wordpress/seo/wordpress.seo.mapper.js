export class WordPressSeoMapper {
  toEngine(wpSeo, entityId, entityType) {
    const yoastMeta = wpSeo?.yoast_meta || wpSeo || {}
    const rankMathMeta = wpSeo?.rank_math_meta || {}

    const source = yoastMeta.title ? 'yoast' : rankMathMeta.title ? 'rank_math' : 'unknown'

    return {
      entityId,
      entityType,
      provider: 'wordpress',
      seoSource: source,
      title: yoastMeta.title || rankMathMeta.title || '',
      description: yoastMeta.description || rankMathMeta.description || '',
      canonicalUrl: yoastMeta.canonical || rankMathMeta.canonical || '',
      ogTitle: yoastMeta.og_title || rankMathMeta.og_title || '',
      ogDescription: yoastMeta.og_description || rankMathMeta.og_description || '',
      ogImage: yoastMeta.og_image || rankMathMeta.og_image || '',
      ogType: yoastMeta.og_type || rankMathMeta.og_type || 'article',
      twitterTitle: yoastMeta.twitter_title || rankMathMeta.twitter_title || '',
      twitterDescription: yoastMeta.twitter_description || rankMathMeta.twitter_description || '',
      twitterImage: yoastMeta.twitter_image || rankMathMeta.twitter_image || '',
      schemaType: yoastMeta.schema_type || rankMathMeta.schema_type || 'WebPage',
      keywords: yoastMeta.keywords || rankMathMeta.keywords || '',
      noIndex: yoastMeta.noindex || rankMathMeta.noindex || false,
      noFollow: yoastMeta.nofollow || rankMathMeta.nofollow || false,
      meta: {
        source,
        wpPostId: entityId,
        focusKeyword: yoastMeta.focus_keyword || rankMathMeta.focus_keyword || '',
        seoScore: yoastMeta.seo_score || rankMathMeta.seo_score || null,
      },
      raw: wpSeo,
    }
  }

  extractFromPost(wpPost) {
    const yoastMeta = wpPost.yoast_head_json || wpPost.yoast_meta || {}
    const rankMathMeta = wpPost.rank_math_meta || {}

    return {
      entityId: String(wpPost.id),
      entityType: wpPost.type || 'post',
      provider: 'wordpress',
      title: yoastMeta.title || rankMathMeta.title || wpPost.title?.rendered || '',
      description: yoastMeta.description || rankMathMeta.description || '',
      canonicalUrl: yoastMeta.canonical || rankMathMeta.canonical || wpPost.link || '',
      ogTitle: yoastMeta.og_title || rankMathMeta.og_title || '',
      ogDescription: yoastMeta.og_description || rankMathMeta.og_description || '',
      ogImage: yoastMeta.og_image?.[0]?.url || rankMathMeta.og_image || '',
      schemaType: yoastMeta.schema_type || 'WebPage',
      noIndex: yoastMeta.noindex || false,
      keywords: yoastMeta.keywords || rankMathMeta.keywords || '',
    }
  }

  toProvider(engineSeo) {
    return {
      yoast_meta: {
        title: engineSeo.title || undefined,
        description: engineSeo.description || undefined,
        canonical: engineSeo.canonicalUrl || undefined,
        og_title: engineSeo.ogTitle || undefined,
        og_description: engineSeo.ogDescription || undefined,
        og_image: engineSeo.ogImage || undefined,
        noindex: engineSeo.noIndex || undefined,
        keywords: engineSeo.keywords || undefined,
      },
    }
  }
}

export default WordPressSeoMapper
