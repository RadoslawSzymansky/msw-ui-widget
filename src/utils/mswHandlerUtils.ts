import { MswHandlerManager } from './mswHandlerManager';
import { Endpoint, HttpMethod } from './types';

// Global manager reference - will be set by useMswHandler
let globalManagerRef: MswHandlerManager | null = null;

export function setGlobalManager(manager: MswHandlerManager | null) {
  globalManagerRef = manager;
}

export function getGlobalManager(): MswHandlerManager | null {
  return globalManagerRef;
}

export function removeAllHandlers() {
  if (globalManagerRef) {
    globalManagerRef.removeAllHandlers();
  }
}

export function removeHandler(endpoint: Endpoint, method: HttpMethod) {
  if (globalManagerRef) {
    globalManagerRef.removeHandler(endpoint, method);
  }
}
