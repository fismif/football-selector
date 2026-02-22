import { createContext, useContext } from 'react';
import type { Group } from '../types';

export const GroupContext = createContext<Group | null>(null);

export function useGroup(): Group {
  const ctx = useContext(GroupContext);
  if (!ctx) throw new Error('useGroup must be used inside GroupLayout');
  return ctx;
}
