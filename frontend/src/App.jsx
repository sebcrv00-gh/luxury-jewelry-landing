import { Routes, Route } from 'react-router-dom'
import Header from './components/Header'
import Footer from './components/Footer'
import Home from './pages/Home'
import Catalog from './pages/Catalog'
import Login from './pages/Login'
import Register from './pages/Register'
import Profile from './pages/Profile'
import Cart from './pages/Cart'
import AdminDashboard from './admin/AdminDashboard'
import FloatingContact from './components/FloatingContact'

export default function App() {
  return (
    <>
      <Header />
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/catalogo" element={<Catalog />} />
          <Route path="/login" element={<Login />} />
          <Route path="/registro" element={<Register />} />
          <Route path="/perfil" element={<Profile />} />
          <Route path="/carrito" element={<Cart />} />
          <Route path="/admin/productos" element={<AdminDashboard />} />
        </Routes>
      </main>
      <Footer />
      <FloatingContact />
    </>
  )
}
