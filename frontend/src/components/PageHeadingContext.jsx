import { createContext, useContext, useState } from "react";

// holds page heading state across views
const PageHeadingContext = createContext();

// hook to use heading context
export function usePageHeading() {
    return useContext(PageHeadingContext);
}

// wraps the app and provides heading state
export function PageHeadingProvider({ children }) {
    const [pageHeading, setPageHeading] = useState("");

    return (
        <PageHeadingContext.Provider value={{ pageHeading, setPageHeading }}>
            {children}
        </PageHeadingContext.Provider>
    );
}
