
import { Property } from '../types';

const STORAGE_KEY = 'elite_estates_user_properties';

export const getStoredProperties = (): Property[] => {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored ? JSON.parse(stored) : [];
};

export const saveProperty = (property: Property) => {
  const current = getStoredProperties();
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...current, property]));
};
