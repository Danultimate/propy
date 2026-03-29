import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from '@/components/Layout'
import ClientsPage from '@/pages/ClientsPage'
import ClientDetailPage from '@/pages/ClientDetailPage'
import RunDetailPage from '@/pages/RunDetailPage'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Navigate to="/clients" replace />} />
        <Route path="/clients" element={<ClientsPage />} />
        <Route path="/clients/:clientId" element={<ClientDetailPage />} />
        <Route path="/clients/:clientId/runs/:runId" element={<RunDetailPage />} />
      </Route>
    </Routes>
  )
}
