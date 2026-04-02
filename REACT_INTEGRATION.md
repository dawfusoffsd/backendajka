# React Integration Guide

## API Service (src/services/api.js)

```javascript
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Generic fetch wrapper
async function fetchAPI(endpoint, options = {}) {
  const response = await fetch(`${API_URL}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });
  
  const data = await response.json();
  
  if (!data.success) {
    throw new Error(data.error || 'API Error');
  }
  
  return data.data;
}

// Categories
export const getCategories = () => fetchAPI('/categories');
export const createCategory = (data) => fetchAPI('/categories', {
  method: 'POST',
  body: JSON.stringify(data),
});

// Employees
export const getEmployees = () => fetchAPI('/employees');
export const createEmployee = (data) => fetchAPI('/employees', {
  method: 'POST',
  body: JSON.stringify(data),
});

// Inventory
export const getInventory = () => fetchAPI('/inventory');
export const createInventoryItem = (data) => fetchAPI('/inventory', {
  method: 'POST',
  body: JSON.stringify(data),
});

// Assignments
export const getAssignments = () => fetchAPI('/assignments');
export const createAssignment = (data) => fetchAPI('/assignments', {
  method: 'POST',
  body: JSON.stringify(data),
});

// Stats
export const getStats = () => fetchAPI('/stats');
