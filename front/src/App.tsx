import React from 'react';
import './styles/global.css';
import AppRoutes from "./routes/AppRoutes";
import {AuthProvider} from "./context/AuthContext.tsx";

const App: React.FC = () => {
  return(
      <AuthProvider>
          <div className="App">
              <AppRoutes/>
          </div>
      </AuthProvider>
  )
};

export default App;