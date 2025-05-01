import "../styles/MainMenu.css";
import React, { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { usePageHeading } from "./PageHeadingContext";
import toast from "react-hot-toast";

import newDeliveryIcon from "/assets/add_icon.png";
import deliveryHistoryIcon from "/assets/history_icon.png";
import stockTakeIcon from "/assets/checklist_icon.png";

function MainMenu() {
    const { setPageHeading } = usePageHeading();
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        setPageHeading(""); // no page heading needed here
    }, [setPageHeading]);

    useEffect(() => {
        if (location.state?.showToast) {
            toast.success("Delivery recorded");
            // prevent toast from showing again on refresh
            navigate(location.pathname, { replace: true });
        }
    }, [location]);

    return (
        <main>
            <button
                className="action-button"
                onClick={() => navigate("/new-delivery")}
            >
                <img src={newDeliveryIcon} className="icon" />
                NEW DELIVERY
            </button>
            <button
                className="action-button"
                onClick={() => navigate("/delivery-history")}
            >
                <img src={deliveryHistoryIcon} className="icon" />
                DELIVERY HISTORY
            </button>
            <button
                className="action-button"
                onClick={() => navigate("/stock-take")}
            >
                <img src={stockTakeIcon} className="icon" />
                STOCK TAKE
            </button>
        </main>
    );
}

export default MainMenu;
