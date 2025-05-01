import React, { useState } from "react";
import { Link } from "react-router-dom";
import "../styles/Sidebar.css";

import sidebarIcon from "/assets/sidebar_icon.svg";

import { clearToken, redirectToLogin } from "../utils/auth";

function Sidebar() {
    const [open, setOpen] = useState(false); // tracks sidebar open/closed

    return (
        <div className={`sidebar-wrapper ${open ? "open" : ""}`}>
            <div className="top-bar">
                <button className="burger-icon" onClick={() => setOpen(!open)}>
                    <img src={sidebarIcon} alt="" />
                </button>
            </div>

            <div className="sidebar-panel">
                <hr />
                <nav className="sidebar-nav">
                    <Link to="/new-delivery" onClick={() => setOpen(false)}>
                        New Delivery
                    </Link>
                    <Link to="/delivery-history" onClick={() => setOpen(false)}>
                        Delivery History
                    </Link>
                    <Link to="/stock-take" onClick={() => setOpen(false)}>
                        Stock Take
                    </Link>
                    <Link
                        to="/product-management"
                        onClick={() => setOpen(false)}
                    >
                        Product Management
                    </Link>
                </nav>
                <button className="LogoutButton" onClick={handleLogout}>
                    Log out
                </button>
            </div>
        </div>
    );
}

const handleLogout = () => {
    clearToken();
    redirectToLogin();
};

export default Sidebar;
