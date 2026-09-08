import { Routes, Route } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import TopBar from './components/TopBar'

import Dashboard from './pages/Dashboard'
import CustomerList from './pages/CustomerList'
import CustomerProfile from './pages/CustomerProfile'
import ConfidenceLayer from './pages/ConfidenceLayer'
import FitPassportAdmin from './pages/FitPassportAdmin'
import ReturnInterception from './pages/ReturnInterception'
import ReturnReasonDecoder from './pages/ReturnReasonDecoder'
import CaseThreadList from './pages/CaseThreadList'
import CaseThreadDetail from './pages/CaseThreadDetail'
import TrackEverywhere from './pages/TrackEverywhere'
import AIDial from './pages/AIDial'
import BrandVoiceCertification from './pages/BrandVoiceCertification'
import OverrideWins from './pages/OverrideWins'
import ModelRegistry from './pages/ModelRegistry'
import CapacityLedger from './pages/CapacityLedger'
import MarketplaceSignal from './pages/MarketplaceSignal'
import CareerLattice from './pages/CareerLattice'

export default function App() {
  return (
    <div className="flex h-screen flex-col" style={{ background: 'var(--surface)' }}>
      <TopBar />
      <div className="flex min-h-0 flex-1">
        <Sidebar />
        <main className="min-w-0 flex-1 overflow-y-auto scrollbar-thin p-6">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/customers" element={<CustomerList />} />
            <Route path="/customers/:id" element={<CustomerProfile />} />
            <Route path="/confidence" element={<ConfidenceLayer />} />
            <Route path="/fit-passport" element={<FitPassportAdmin />} />
            <Route path="/fit-passport/:archetypeId" element={<FitPassportAdmin />} />
            <Route path="/returns" element={<ReturnInterception />} />
            <Route path="/returns/decoder" element={<ReturnReasonDecoder />} />
            <Route path="/cases" element={<CaseThreadList />} />
            <Route path="/cases/:id" element={<CaseThreadDetail />} />
            <Route path="/track-everywhere" element={<TrackEverywhere />} />
            <Route path="/governance/dial" element={<AIDial />} />
            <Route path="/governance/voice-certification" element={<BrandVoiceCertification />} />
            <Route path="/governance/override-wins" element={<OverrideWins />} />
            <Route path="/governance/model-registry" element={<ModelRegistry />} />
            <Route path="/business/capacity-ledger" element={<CapacityLedger />} />
            <Route path="/business/marketplace-signal" element={<MarketplaceSignal />} />
            <Route path="/business/career-lattice" element={<CareerLattice />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}
