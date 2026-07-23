import { Routes, Route } from 'react-router-dom';
import ProductListPage from './pages/ProductListPage';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<ProductListPage />} />
      <Route
        path="/products/:id"
        element={<div style={{ padding: '2rem' }}>Product Detail Page coming soon</div>}
      />
    </Routes>
  );
}