/**
 * Config Index — Central export for all config files
 *
 * Import from here instead of individual config files:
 * import { PLATFORM_CONFIG, PRODUCT_CONFIG } from './config/index.js'
 */

export { PLATFORM_CONFIG, default as platformConfig } from './platform.config.js'
export { PRODUCT_CONFIG, THEME_STORAGE_KEY, default as productConfig } from './product.config.js'
