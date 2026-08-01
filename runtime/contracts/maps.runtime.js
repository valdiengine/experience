import { BaseRuntimeContract } from './base.runtime.js'

export class MapsRuntime extends BaseRuntimeContract {
  constructor(config = {}) {
    super(config)
    this.name = 'maps'
  }

  async geocode(address) {
    return null
  }

  async reverseGeocode(lat, lng) {
    return null
  }

  async autocomplete(query) {
    return []
  }

  async directions(origin, destination, options) {
    return null
  }

  async distanceMatrix(origins, destinations) {
    return null
  }

  async isochrone(center, time, options) {
    return null
  }

  async places(query, options) {
    return []
  }

  async staticMap(center, zoom, size) {
    return null
  }

  async tileUrl(x, y, z) {
    return null
  }

  supports(feature) {
    const features = ['geocode', 'reverse-geocode', 'directions', 'isochrone', 'places', 'static-map', 'tiles', 'elevation']
    return features.includes(feature)
  }
}

export default MapsRuntime
