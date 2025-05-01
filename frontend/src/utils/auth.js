import { jwtDecode } from "jwt-decode";

// get jwt from localstorage
export const getToken = () => localStorage.getItem("id_token");

// remove jwt from localstorage
export const clearToken = () => localStorage.removeItem("id_token");

// check if token is expired
export const isTokenValid = (token) => {
    try {
        const { exp } = jwtDecode(token);
        return exp * 1000 > Date.now();
    } catch {
        return false;
    }
};

// cognito app settings
export const COGNITO_DOMAIN =
    "https://eu-west-2cj9sj96k1.auth.eu-west-2.amazoncognito.com";
export const CLIENT_ID = "6dh2bsajuf0anv3u9a4a322ulm";
export const REDIRECT_URI = "http://localhost:5173";
export const TOKEN_ENDPOINT = `${COGNITO_DOMAIN}/oauth2/token`;

// redirect to hosted login
export const redirectToLogin = () => {
    const loginUrl = `${COGNITO_DOMAIN}/login?client_id=${CLIENT_ID}&response_type=code&scope=email+openid&redirect_uri=${encodeURIComponent(
        REDIRECT_URI
    )}`;
    window.location.href = loginUrl;
};

// exchange code for tokens
export const fetchAccessToken = async (code) => {
    const body = new URLSearchParams({
        grant_type: "authorization_code",
        code,
        client_id: CLIENT_ID,
        redirect_uri: REDIRECT_URI,
    });

    const response = await fetch(TOKEN_ENDPOINT, {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
        },
        body,
    });

    const text = await response.text();
    return JSON.parse(text);
};
