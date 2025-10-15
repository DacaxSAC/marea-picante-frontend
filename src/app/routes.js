import { lazy } from "react";
import { Navigate } from "react-router-dom";

import AuthGuard from "./auth/AuthGuard";
import { authRoles } from "./auth/authRoles";

import Loadable from "./components/Loadable";
import MatxLayout from "./components/MatxLayout/MatxLayout";

import materialRoutes from "./views/material-kit/MaterialRoutes";
import CategoryManager from "app/pages/mantenedores/CategoryManager";
import ProductManager from "app/pages/mantenedores/ProductManager";
import TableManager from "./pages/mantenedores/TableManager";
import OrderManager from "./pages/ventas/OrderManager";
import OpeningManager from "./pages/ventas/OpeningManager";
import MovementManager from "./pages/ventas/MovementManager";
import KitchenTicketManager from "./components/KitchenTicketManager";
import PrinterSettingsPage from "./pages/config/PrinterSettingsPage";

// SESSION PAGES
const NotFound = Loadable(lazy(() => import("./views/sessions/NotFound")));
const JwtLogin = Loadable(lazy(() => import("./views/sessions/JwtLogin")));
const JwtRegister = Loadable(lazy(() => import("./views/sessions/JwtRegister")));
const ForgotPassword = Loadable(lazy(() => import("./views/sessions/ForgotPassword")));
// E-CHART PAGE
const AppEchart = Loadable(lazy(() => import("./views/charts/echarts/AppEchart")));
// DASHBOARD PAGE
const Analytics = Loadable(lazy(() => import("./views/dashboard/Analytics")));

// Importaciones nuevas

const routes = [
  {
    element: (
      <AuthGuard>
        <MatxLayout />
      </AuthGuard>
    ),
    children: [
      ...materialRoutes,
      // dashboard route
      { path: "/dashboard/default", element: <Analytics />, auth: authRoles.admin },
      // e-chart route
      { path: "/charts/echarts", element: <AppEchart />, auth: authRoles.editor },
      // Rutas nuevas
      { path: "/mantenedores/mesas", element: <TableManager />, auth: authRoles.admin },
      { path: "/mantenedores/categorias", element: <CategoryManager />, auth: authRoles.admin },
      { path: "/mantenedores/productos", element: <ProductManager />, auth: authRoles.admin },

      { path: "/ventas/ordenes", element: <OrderManager />, auth: authRoles.admin },
      { path: "/ventas/apertura-cierre", element: <OpeningManager />, auth: authRoles.admin },
      { path: "/ventas/movimientos", element: <MovementManager />, auth: authRoles.admin },
      { path: "/cocina/tickets", element: <KitchenTicketManager />, auth: authRoles.admin }, 
      { path: "/config/impresoras", element: <PrinterSettingsPage />, auth: authRoles.admin },
    ]
  },

  // session pages route
  { path: "/session/404", element: <NotFound /> },
  { path: "/session/signin", element: <JwtLogin /> },
  { path: "/session/signup", element: <JwtRegister /> },
  { path: "/session/forgot-password", element: <ForgotPassword /> },

  { path: "/", element: <Navigate to="dashboard/default" /> },
  { path: "*", element: <NotFound /> }
];

export default routes;
