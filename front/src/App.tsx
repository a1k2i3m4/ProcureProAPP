import React from 'react';
import './styles/global.css';
import AppRoutes from "./routes/AppRoutes";

const App: React.FC = () => {
  return(
      <div className="App">
          <AppRoutes/>
      </div>
  )
};

export default App;