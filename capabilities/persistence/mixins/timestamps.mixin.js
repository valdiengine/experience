export const TimestampsMixin = (Base) => class extends Base {
  #addTimestamps(data, operation) {
    const now = new Date().toISOString()
    if (operation === 'create') return { ...data, createdAt: now, updatedAt: now }
    if (operation === 'update') return { ...data, updatedAt: now }
    return data
  }
}
