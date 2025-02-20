import "../styles/MainMenu.css";
import { useNavigate } from "react-router-dom";

import newDeliveryIcon from "../assets/add_icon.png";
import deliveryHistoryIcon from "../assets/history_icon.png";
import stockTakeIcon from "../assets/checklist_icon.png";

function MainMenu() {
    const navigate = useNavigate();

    return (
        <main>
            <button className="action-button new-delivery" onClick={() => navigate("/new-delivery")}>
                <img src={newDeliveryIcon} className="icon"></img>
                NEW DELIVERY
            </button>
            <button className="action-button delivery-history">
                <img src={deliveryHistoryIcon} className="icon"></img>
                DELIVERY HISTORY
            </button>
            <button className="action-button stock-take">
                <img src={stockTakeIcon} className="icon"></img>
                STOCK TAKE
            </button>
        </main>
    );
}

export default MainMenu;