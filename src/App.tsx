import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Editor from './pages/Editor'
import Export from './pages/Export'
import ComingSoon from './pages/ComingSoon'

export default function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/editor" element={<Editor />} />
        <Route path="/export" element={<Export />} />
        <Route path="/instruments" element={<ComingSoon section="Instrumentos" />} />
        <Route path="/history" element={<ComingSoon section="Historial" />} />
      </Routes>
    </BrowserRouter>
  )
}
