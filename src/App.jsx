import { Routes, Route } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import TopBar from './components/TopBar'
import CommandPalette from './components/CommandPalette'
import ToastHost from './components/ToastHost'

import Dashboard from './pages/Dashboard'
import TeamToday from './pages/TeamToday'
import CustomerList from './pages/CustomerList'
import CustomerProfile from './pages/CustomerProfile'
import ConfidenceLayer from './pages/ConfidenceLayer'
import FitPassportAdmin from './pages/FitPassportAdmin'
import AdvisorWorkspace from './pages/AdvisorWorkspace'
import ReturnInterception from './pages/ReturnInterception'
import ReturnReasonDecoder from './pages/ReturnReasonDecoder'
import CaseThreadList from './pages/CaseThreadList'
import CaseThreadDetail from './pages/CaseThreadDetail'
import TrackEverywhere from './pages/TrackEverywhere'
import GrievanceRadar from './pages/GrievanceRadar'
import AIDial from './pages/AIDial'
import BrandVoiceCertification from './pages/BrandVoiceCertification'
import OverrideWins from './pages/OverrideWins'
import ModelRegistry from './pages/ModelRegistry'
import CapacityLedger from './pages/CapacityLedger'
import MarketplaceSignal from './pages/MarketplaceSignal'
import CareerLattice from './pages/CareerLattice'
import FeedbackLoop from './pages/FeedbackLoop'

export default function App() {
  return (
    <div className="flex h-screen" style={{ background: 'var(--surface)' }}>
      <Sidebar />
      {/* Single scroll container for the right column: TopBar sticks to its
          top so page content genuinely scrolls beneath the glass chrome. */}
      <div className="relative flex min-w-0 flex-1 flex-col overflow-y-auto scrollbar-thin">
        <TopBar />
        <main className="min-w-0 flex-1 p-6">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/today" element={<TeamToday />} />
            <Route path="/customers" element={<CustomerList />} />
            <Route path="/customers/:id" element={<CustomerProfile />} />
            <Route path="/confidence" element={<ConfidenceLayer />} />
            <Route path="/fit-passport" element={<FitPassportAdmin />} />
            <Route path="/fit-passport/:archetypeId" element={<FitPassportAdmin />} />
            <Route path="/advisor-workspace" element={<AdvisorWorkspace />} />
            <Route path="/returns" element={<ReturnInterception />} />
            <Route path="/returns/decoder" element={<ReturnReasonDecoder />} />
            <Route path="/cases" element={<CaseThreadList />} />
            <Route path="/cases/:id" element={<CaseThreadDetail />} />
            <Route path="/track-everywhere" element={<TrackEverywhere />} />
            <Route path="/grievance-radar" element={<GrievanceRadar />} />
            <Route path="/governance/dial" element={<AIDial />} />
            <Route path="/governance/voice-certification" element={<BrandVoiceCertification />} />
            <Route path="/governance/override-wins" element={<OverrideWins />} />
            <Route path="/governance/model-registry" element={<ModelRegistry />} />
            <Route path="/business/capacity-ledger" element={<CapacityLedger />} />
            <Route path="/business/marketplace-signal" element={<MarketplaceSignal />} />
            <Route path="/business/career-lattice" element={<CareerLattice />} />
            <Route path="/feedback-loop" element={<FeedbackLoop />} />
          </Routes>
        </main>
      </div>
      <CommandPalette />
      <ToastHost />
    </div>
  )
}
