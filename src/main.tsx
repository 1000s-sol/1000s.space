import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import { SolanaWalletProviderWrap } from './components/SolanaWalletProvider.tsx'
import App from './App.tsx'
import { GamePage } from './pages/GamePage.tsx'

import '@solana/wallet-adapter-react-ui/styles.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SolanaWalletProviderWrap>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<App />} />
          <Route path="/games/:gameId" element={<GamePage />} />
        </Routes>
      </BrowserRouter>
    </SolanaWalletProviderWrap>
  </StrictMode>,
)
