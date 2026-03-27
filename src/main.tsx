
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { UILanguageProvider } from './contexts/UILanguageContext'

createRoot(document.getElementById("root")!).render(
  <UILanguageProvider>
    <App />
  </UILanguageProvider>
);
