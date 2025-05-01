import "../styles/Header.css";
import { useNavigate } from "react-router-dom";
import Sidebar from "./Sidebar";

function Header({ currentDate }) {
    const navigate = useNavigate();

    return (
        <header className="App-header">
            <div className="header-left">
                <Sidebar />
                <h1 onClick={() => navigate("/")}>IMS</h1>{" "}
                {/* return to home */}
            </div>
            <div className="header-right">
                <p>{currentDate}</p> {/* live timestamp */}
            </div>
        </header>
    );
}
export default Header;
