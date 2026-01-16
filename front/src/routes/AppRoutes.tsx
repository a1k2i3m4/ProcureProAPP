import React, {lazy, Suspense} from "react";
import {BrowserRouter, Route, Routes} from "react-router-dom";
import Layout from "../components/layout/Layout";
import LoadingPage from "../pages/LoadingPage";
import NotFoundPage from "../pages/NotFoundPage.tsx";

const HomePage = lazy(() => import('../pages/HomePage'));


const AppRoutes: React.FC = () => {
    return (
        <BrowserRouter>
            <Suspense fallback={<LoadingPage/>}>
                <Routes>
                    <Route path="/" element={<Layout><HomePage /></Layout>}/>


                    <Route path="*" element={<Layout><NotFoundPage/></Layout>} />
                </Routes>
            </Suspense>
        </BrowserRouter>
    )
}
export default AppRoutes;