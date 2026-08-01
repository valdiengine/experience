import { GOVERNANCE_ROLES, ROLE_PERMISSIONS } from '../governance.schema.js';
import { GOVERNANCE_EVENTS, createGovernanceEvent } from '../governance.events.js';

export default class GovernanceRoleManager {
  constructor(context) {
    this.context = context;
    this.assignments = new Map();
    this.customPermissions = new Map();
  }

  async assignRole(entityId, role, scope, assignedBy) {
    const key = entityId + ':' + scope;
    const existing = this.assignments.get(key);
    const previousRole = existing?.role;
    this.assignments.set(key, {
      entityId, role, scope, assignedBy,
      assignedAt: new Date(), previousRole
    });
    this.context.eventBus?.emit(createGovernanceEvent(GOVERNANCE_EVENTS.PERMISSION_CHANGED, {
      entityId, role, scope, assignedBy, previousRole
    }));
    return this.assignments.get(key);
  }

  async removeRole(entityId, scope) {
    const key = entityId + ':' + scope;
    const existing = this.assignments.get(key);
    if (!existing) return false;
    this.assignments.delete(key);
    this.context.eventBus?.emit(createGovernanceEvent(GOVERNANCE_EVENTS.PERMISSION_CHANGED, {
      entityId, role: null, scope, previousRole: existing.role
    }));
    return true;
  }

  async addCustomPermission(entityId, scope, permission) {
    const key = entityId + ':' + scope;
    const perms = this.customPermissions.get(key) || [];
    if (!perms.includes(permission)) {
      perms.push(permission);
      this.customPermissions.set(key, perms);
    }
  }

  async removeCustomPermission(entityId, scope, permission) {
    const key = entityId + ':' + scope;
    const perms = this.customPermissions.get(key) || [];
    const idx = perms.indexOf(permission);
    if (idx >= 0) perms.splice(idx, 1);
    this.customPermissions.set(key, perms);
  }

  getRole(entityId, scope) {
    const key = entityId + ':' + scope;
    return this.assignments.get(key) || null;
  }

  getPermissions(entityId, scope) {
    const assignment = this.getRole(entityId, scope);
    if (!assignment) return [];
    const basePermissions = ROLE_PERMISSIONS[assignment.role] || [];
    const customPermissions = this.customPermissions.get(entityId + ':' + scope) || [];
    return [...basePermissions, ...customPermissions];
  }

  hasPermission(entityId, scope, permission) {
    const permissions = this.getPermissions(entityId, scope);
    return permissions.includes(permission) || permissions.includes('*');
  }

  getAssignmentsByScope(scope) {
    return Array.from(this.assignments.values()).filter(a => a.scope === scope);
  }

  getAssignmentsByRole(role) {
    return Array.from(this.assignments.values()).filter(a => a.role === role);
  }

  isInRole(entityId, scope, role) {
    const assignment = this.getRole(entityId, scope);
    return assignment?.role === role;
  }

  getHierarchy() {
    const hierarchy = {};
    for (const role of Object.values(GOVERNANCE_ROLES)) {
      hierarchy[role] = {
        permissions: ROLE_PERMISSIONS[role] || [],
        count: this.getAssignmentsByRole(role).length
      };
    }
    return hierarchy;
  }
}
