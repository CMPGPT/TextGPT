"use client";

import { useState, useEffect } from 'react';

/**
 * A hook for caching form values during a session
 * Values persist during page navigation but are reset on page refresh
 * 
 * @param key Unique key to store the form data under
 * @param initialValues Initial values for the form
 * @returns [cachedValues, setCachedValues] tuple
 */
export function useFormCache<T>(key: string, initialValues: T): [T, (values: T) => void] {
  // Initialize with the provided values
  const [cachedValues, setCachedValues] = useState<T>(initialValues);
  
  // On mount, try to load values from sessionStorage
  useEffect(() => {
    try {
      const storedValue = sessionStorage.getItem(`form_cache_${key}`);
      if (storedValue) {
        setCachedValues(JSON.parse(storedValue));
      }
    } catch (error) {
      console.error('Error loading cached form data:', error);
    }
  }, [key]);
  
  // Update the cache whenever values change
  const updateCache = (values: T) => {
    setCachedValues(values);
    try {
      sessionStorage.setItem(`form_cache_${key}`, JSON.stringify(values));
    } catch (error) {
      console.error('Error saving form cache:', error);
    }
  };
  
  return [cachedValues, updateCache];
} 