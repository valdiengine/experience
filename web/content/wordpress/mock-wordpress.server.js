/**
 * Mock WordPress Server
 *
 * A mock WordPress REST API server for testing the WordPress adapter.
 * Simulates real WordPress responses including errors and delays.
 */

import { createServer } from 'http'

const MOCK_POSTS = [
  {
    id: 1,
    slug: 'test-post-valdi',
    title: { rendered: 'Test Post for Valdi' },
    excerpt: { rendered: '<p>This is a test post for Valdi destination.</p>' },
    content: { rendered: '<p>This is the full content of the test post. It includes <strong>bold</strong> and <em>italic</em> text.</p><p><img src="https://example.com/image.jpg" alt="Test Image" /></p>' },
    date: '2024-01-15T10:00:00',
    modified: '2024-01-16T12:00:00',
    status: 'publish',
    author: 1,
    categories: [1],
    tags: [1],
    featured_media: 1,
    format: 'standard',
    link: 'https://valdi.example.com/blog/test-post-valdi',
    _embedded: {
      author: [{ id: 1, name: 'John Doe', slug: 'john-doe' }],
      'wp:term': [
        [{ id: 1, name: 'News', slug: 'news' }],
        [{ id: 1, name: 'Featured', slug: 'featured' }]
      ]
    }
  },
  {
    id: 2,
    slug: 'test-post-natales',
    title: { rendered: 'Test Post for Natales' },
    excerpt: { rendered: '<p>This is a test post for Natales destination.</p>' },
    content: { rendered: '<p>Natales specific content with <a href="https://example.com">a link</a>.</p>' },
    date: '2024-01-20T10:00:00',
    modified: '2024-01-21T12:00:00',
    status: 'publish',
    author: 1,
    categories: [1],
    tags: [],
    featured_media: 2,
    format: 'standard',
    link: 'https://natales.example.com/blog/test-post-natales'
  },
  {
    id: 3,
    slug: 'malicious-post',
    title: { rendered: '<script>alert(1)</script> Malicious Post' },
    excerpt: { rendered: '<p><img src=x onerror=alert(1)> excerpt</p>' },
    content: { rendered: '<p>Content with <script>alert(1)</script> and <img src=x onerror=alert(1)>.</p><a href="javascript:alert(1)">Evil Link</a>' },
    date: '2024-01-25T10:00:00',
    modified: '2024-01-26T12:00:00',
    status: 'publish',
    author: 1,
    categories: [],
    tags: [],
    featured_media: 0,
    format: 'standard',
    link: 'https://valdi.example.com/blog/malicious-post'
  }
]

const MOCK_MEDIA = [
  {
    id: 1,
    source_url: 'https://example.com/image1.jpg',
    alt_text: 'Test Image 1',
    title: { rendered: 'Image 1' },
    caption: { rendered: 'Caption for image 1' },
    media_details: { width: 1920, height: 1080 },
    mime_type: 'image/jpeg'
  },
  {
    id: 2,
    source_url: 'https://example.com/image2.jpg',
    alt_text: 'Test Image 2',
    title: { rendered: 'Image 2' },
    caption: { rendered: 'Caption for image 2' },
    media_details: { width: 800, height: 600 },
    mime_type: 'image/jpeg'
  }
]

const MOCK_CATEGORIES = [
  { id: 1, name: 'News', slug: 'news', description: 'News category', count: 10 },
  { id: 2, name: 'Events', slug: 'events', description: 'Events category', count: 5 }
]

const MOCK_TAGS = [
  { id: 1, name: 'Featured', slug: 'featured', count: 3 },
  { id: 2, name: 'Important', slug: 'important', count: 2 }
]

const MOCK_USERS = [
  {
    id: 1,
    name: 'John Doe',
    slug: 'john-doe',
    avatar_urls: {
      '48': 'https://example.com/avatar-48.jpg',
      '96': 'https://example.com/avatar-96.jpg'
    }
  }
]

function parseJson(body) {
  try {
    return JSON.parse(body)
  } catch {
    return null
  }
}

function sendJson(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(data))
}

function sendEmpty(res, status) {
  res.writeHead(status, { 'Content-Type': 'application/json' })
  res.end('[]')
}

const server = createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost')

  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') {
    res.writeHead(204)
    res.end()
    return
  }

  if (url.pathname === '/wp-json/wp/v2/posts') {
    const searchParams = url.searchParams
    const slug = searchParams.get('slug')
    const page = searchParams.get('page') || '1'
    const perPage = searchParams.get('per_page') || '10'

    if (slug) {
      const post = MOCK_POSTS.find(p => p.slug === slug)
      if (post) {
        res.setHeader('X-WP-Total', '1')
        res.setHeader('X-WP-TotalPages', '1')
        sendJson(res, 200, [post])
      } else {
        sendEmpty(res, 200)
      }
    } else {
      res.setHeader('X-WP-Total', String(MOCK_POSTS.length))
      res.setHeader('X-WP-TotalPages', '1')
      sendJson(res, 200, MOCK_POSTS)
    }
    return
  }

  if (url.pathname.match(/^\/wp-json\/wp\/v2\/posts\/\d+$/)) {
    const id = parseInt(url.pathname.split('/')[5], 10)
    const post = MOCK_POSTS.find(p => p.id === id)
    if (post) {
      sendJson(res, 200, post)
    } else {
      sendJson(res, 404, { code: 'rest_post_invalid_id', message: 'Invalid post ID.' })
    }
    return
  }

  if (url.pathname === '/wp-json/wp/v2/media') {
    sendJson(res, 200, MOCK_MEDIA)
    return
  }

  if (url.pathname.match(/^\/wp-json\/wp\/v2\/media\/\d+$/)) {
    const id = parseInt(url.pathname.split('/')[5], 10)
    const media = MOCK_MEDIA.find(m => m.id === id)
    if (media) {
      sendJson(res, 200, media)
    } else {
      sendJson(res, 404, { code: 'rest_media_invalid_id', message: 'Invalid media ID.' })
    }
    return
  }

  if (url.pathname === '/wp-json/wp/v2/categories') {
    sendJson(res, 200, MOCK_CATEGORIES)
    return
  }

  if (url.pathname === '/wp-json/wp/v2/tags') {
    sendJson(res, 200, MOCK_TAGS)
    return
  }

  if (url.pathname === '/wp-json/wp/v2/users') {
    sendJson(res, 200, MOCK_USERS)
    return
  }

  if (url.pathname === '/wp-json/wp/v2/types') {
    sendJson(res, 200, { post: { name: 'Posts', slug: 'post' } })
    return
  }

  if (url.pathname === '/slow') {
    setTimeout(() => {
      sendJson(res, 200, MOCK_POSTS)
    }, 10000)
    return
  }

  if (url.pathname === '/error') {
    sendJson(res, 500, { code: 'internal_server_error', message: 'Server error' })
    return
  }

  if (url.pathname === '/wp-json/') {
    sendJson(res, 200, {
      name: 'Mock WordPress',
      description: 'Mock WordPress for testing',
      url: 'http://localhost',
      home: 'http://localhost',
      statuses: {},
      authentication: {},
      routes: {
        '/wp/v2/posts': { endpoints: [] },
        '/wp/v2/media': { endpoints: [] }
      },
      namespaces: ['wp/v2']
    })
    return
  }

  sendJson(res, 404, { code: 'rest_no_route', message: 'No route was found matching the URL and request method.' })
})

export function startMockWordPressServer(port = 3098) {
  return new Promise((resolve) => {
    server.listen(port, () => {
      console.log(`Mock WordPress server running on port ${port}`)
      resolve(server)
    })
  })
}

export function stopMockWordPressServer() {
  return new Promise((resolve) => {
    server.close(() => {
      console.log('Mock WordPress server stopped')
      resolve()
    })
  })
}

export { MOCK_POSTS, MOCK_MEDIA }

export default {
  startMockWordPressServer,
  stopMockWordPressServer,
  MOCK_POSTS,
  MOCK_MEDIA
}
