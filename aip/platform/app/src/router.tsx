/* eslint-disable react-refresh/only-export-components */
import {
  createBrowserRouter,
  useRouteError,
  isRouteErrorResponse,
  Navigate,
} from "react-router-dom";
import AuthCallback from "./AuthCallback";
import AppLayout from "./AppLayout";
import SearchPage from "./pages/SearchPage";
import BuilderPage from "./pages/BuilderPage";
import { PlatformProvider } from "./Platform";

function ErrorPage() {
  const error = useRouteError();

  if (isRouteErrorResponse(error)) {
    return (
      <div style={{ padding: "2rem", fontFamily: "system-ui, sans-serif" }}>
        <h1>
          {error.status} {error.statusText}
        </h1>
        {error.data && <p>{error.data}</p>}
      </div>
    );
  }

  return (
    <div style={{ padding: "2rem", fontFamily: "system-ui, sans-serif" }}>
      <h1>Something went wrong</h1>
      <p>
        {error instanceof Error
          ? error.message
          : "An unexpected error occurred."}
      </p>
    </div>
  );
}

export const router = createBrowserRouter(
  [
    {
      path: "/",
      element: <PlatformProvider><AppLayout /></PlatformProvider>,
      errorElement: <ErrorPage />,
      children: [
        { index: true, element: <Navigate to="/search" replace /> },
        { path: "search", element: <SearchPage /> },
        { path: "builder", element: <BuilderPage /> },
      ],
    },
    {
      // This is the route defined in your application's redirect URL
      path: "/auth/callback",
      element: <AuthCallback />,
      errorElement: <ErrorPage />,
    },
  ],
  { basename: import.meta.env.BASE_URL },
);
