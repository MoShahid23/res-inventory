import "./App.css";
import { useEffect, useState } from "react";
import {
    BrowserRouter as Router,
    Routes,
    Route,
    Navigate,
} from "react-router-dom";

import { Header } from "./components";
import MainMenu from "./components/MainMenu";
import NewDelivery from "./components/NewDelivery";
import InvoiceHistory from "./components/InvoiceHistory";
import StockTakePage from "./components/StockTakePage";
import ProductManagement from "./components/ProductManagement";
import {
    PageHeadingProvider,
    usePageHeading,
} from "./components/PageHeadingContext";
import { Toaster } from "react-hot-toast";
import PrivateRoute from "./components/PrivateRoute";

import { getToken, fetchAccessToken, redirectToLogin } from "./utils/auth";

function App() {
    const [token, setToken] = useState(getToken() || null); // jwt from localstorage
    const [currentDate, setCurrentDate] = useState(new Date().toLocaleString());

    // update time every second for header
    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentDate(new Date().toLocaleString());
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    // handle login callback from cognito
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get("code");

        if (code && !token) {
            fetchAccessToken(code)
                .then((data) => {
                    if (data.id_token && data.id_token !== "Bearer null") {
                        localStorage.setItem("id_token", data.id_token);
                        setToken(data.id_token);
                        window.history.replaceState({}, document.title, "/");
                    } else {
                        console.error("id token missing", data);
                        redirectToLogin();
                    }
                })
                .catch((err) => {
                    console.error("token exchange failed:", err);
                    redirectToLogin();
                });
        } else if (!token) {
            redirectToLogin();
        }
    }, [token]);

    if (!token) {
        return <div className="loading">Redirecting to login...</div>;
    }

    return (
        <PageHeadingProvider>
            <Toaster
                position="bottom-center"
                toastOptions={{
                    duration: 4000,
                    style: {
                        background: "#2f2f2f",
                        color: "#fff",
                        fontSize: "2rem",
                        border: "2px solid #ffcc00",
                    },
                }}
            />
            <Router>
                <div className="App">
                    <Header currentDate={currentDate} />
                    <PageHeadingDisplay />
                    <Routes>
                        <Route path="/" element={<MainMenu />} />
                        <Route
                            path="/new-delivery"
                            element={
                                <PrivateRoute>
                                    <NewDelivery />
                                </PrivateRoute>
                            }
                        />
                        <Route
                            path="/delivery-history"
                            element={
                                <PrivateRoute>
                                    <InvoiceHistory />
                                </PrivateRoute>
                            }
                        />
                        <Route
                            path="/stock-take"
                            element={
                                <PrivateRoute>
                                    <StockTakePage />
                                </PrivateRoute>
                            }
                        />
                        <Route
                            path="/product-management"
                            element={
                                <PrivateRoute>
                                    <ProductManagement />
                                </PrivateRoute>
                            }
                        />
                        <Route path="*" element={<Navigate to="/" />} />
                    </Routes>
                </div>
            </Router>
        </PageHeadingProvider>
    );
}

function PageHeadingDisplay() {
    const { pageHeading } = usePageHeading();

    // update --main-height to adjust layout when heading is visible
    useEffect(() => {
        document.documentElement.style.setProperty(
            "--main-height",
            pageHeading ? "calc(90vh - 40px - 44px)" : "calc(90vh - 40px)"
        );
    }, [pageHeading]);

    return pageHeading ? (
        <div className="page-heading">
            <span>{pageHeading}</span>
        </div>
    ) : null;
}

export default App;
