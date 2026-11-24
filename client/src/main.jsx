import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import { AuthProvider } from './context/AuthContext.jsx';

// Import CSS Design System (Pure Plain CSS, No Framework)
import './styles/variables.css';
import './styles/reset.css';
import './styles/global.css';
import './styles/layout.css';
import './styles/card.css';
import './styles/modal.css';
import './styles/form.css';
import './styles/media.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>
);
