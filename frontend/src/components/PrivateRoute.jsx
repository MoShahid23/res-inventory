import { Navigate } from "react-router-dom";
import { isTokenValid, getToken, clearToken } from "../utils/auth";

const PrivateRoute = ({ children }) => {
    const token = getToken();

    // block if token missing or expired
    if (!token || !isTokenValid(token)) {
        clearToken();
        return <Navigate to="/" replace />;
    }

    return children;
};

export default PrivateRoute;
