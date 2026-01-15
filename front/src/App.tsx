import React from 'react';
import './styles/global.css';
// import Layout from "./components/layout/Layout";
import Header from "./components/layout/Header";

const App: React.FC = () => {
  return(
      <div className="App">
        <Header/>
      </div>
  )
};

export default App;