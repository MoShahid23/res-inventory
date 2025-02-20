import "./App.css";
import { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Header } from "./components";
import MainMenu from "./components/MainMenu";
import NewDelivery from "./components/NewDelivery"; // Import the new component

function App() {
    const [currentDate, setCurrentDate] = useState(new Date().toLocaleString());

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentDate(new Date().toLocaleString());
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    return (
        <Router>
            <div className="App">
                <Header currentDate={currentDate} />
                <Routes>
                    <Route path="/" element={<MainMenu />} />
                    <Route path="/new-delivery" element={<NewDelivery />} />
                </Routes>
            </div>
        </Router>
    );
}

export default App;
