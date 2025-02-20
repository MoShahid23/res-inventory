import "../styles/Header.css";
import { useNavigate } from "react-router-dom";

function Header({ currentDate }) {
    const navigate = useNavigate();

    return (
        <header className="App-header">
            <div className="header-left">
                <button className="hamburger-menu">☰</button>
                <h1 onClick={() => navigate("/")}>IMS</h1>
            </div>
            <div className="header-right">
                <p>{currentDate}</p>
            </div>
        </header>
    );
}

export default Header;