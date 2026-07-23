import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8000',
});

export const getCategories = () =>
  api.get('/api/categories/').then((res) => res.data);

export const getProducts = (params = {}) =>
  api.get('/api/products/', { params }).then((res) => res.data);