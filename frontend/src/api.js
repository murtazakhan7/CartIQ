import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8000',
});

export const getCategories = () =>
  api.get('/api/categories/').then((res) => res.data);

export const getProducts = (params = {}) =>
  api.get('/api/products/', { params }).then((res) => res.data);

export const getProductDetail = (id) =>
  api.get(`/api/products/${id}/`).then((res) => res.data);

export const getSimilarProducts = (id) =>
  api.get(`/api/products/${id}/similar/`).then((res) => res.data);

export const getDelivery = (countryCode) =>
  api.get('/api/delivery/', { params: { country: countryCode } }).then((res) => res.data);