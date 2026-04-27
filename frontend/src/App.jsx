import { Routes, Route, useLocation } from 'react-router-dom'
import Header from './components/Header'
import Footer from './components/Footer'
import Home from './pages/Home'
import Catalog from './pages/Catalog'
import Login from './pages/Login'
import Register from './pages/Register'
import Profile from './pages/Profile'
import Cart from './pages/Cart'
import Checkout from './pages/Checkout'
import AdminDashboard from './admin/AdminDashboard'
import ClientDashboard from './pages/ClientDashboard'
import FloatingContact from './components/FloatingContact'

function RouteTransition({ children }) {
  const location = useLocation();
  return (
    <div key={location.pathname} className="luxury-page-transition" style={{ flex: 1, display: 'flex', flexDirection: 'column', width: '100%' }}>
      {children}
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route
        path="/*"
        element={
          <>
            <Header />
            <main style={{ flex: 1, display: 'flex', flexDirection: 'column', width: '100%' }}>
              <RouteTransition>
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/catalogo" element={<Catalog />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/registro" element={<Register />} />
                  <Route path="/perfil" element={<Profile />} />
                  <Route path="/carrito" element={<Cart />} />
                  <Route path="/checkout" element={<Checkout />} />
                </Routes>
              </RouteTransition>
            </main>
            <Footer />
            <FloatingContact />
          </>
        }
      />
      <Route path="/admin/*" element={
        <RouteTransition>
          <AdminDashboard />
        </RouteTransition>
      } />
      <Route path="/mi-cuenta/*" element={
        <>
          <Header />
          <ClientDashboard />
        </>
      } />
    </Routes>
  )
}
