import React from 'react';
import Header from './Header';
// import Footer from './Footer';

interface LayoutProps {
    children: React.ReactNode;
    showHeader?: boolean;
}

const Layout: React.FC<LayoutProps> = ({ children, showHeader = true }) => {
    return (
        <div className="layout">
            {showHeader ? <Header /> : null}
            <main className="main pt-20">
                {children}
            </main>
            {/*<Footer />*/}
        </div>
    );
}

export default Layout;