import { useRoutes } from "react-router-dom";
import CssBaseline from "@mui/material/CssBaseline";

import { MatxTheme } from "./components";
// ALL CONTEXTS
import { AuthProvider } from "./contexts/JWTAuthContext";
import { BluetoothPrinterProvider } from "./contexts/BluetoothPrinterContext";
import { SerialPrinterProvider } from "./contexts/SerialPrinterContext";
import AutoPrintDaemon from "./components/AutoPrintDaemon";
import SettingsProvider from "./contexts/SettingsContext";
// ROUTES
import routes from "./routes";
// FAKE SERVER
import "../fake-db";

export default function App() {
  const content = useRoutes(routes);

  return (
    <SettingsProvider>
      <AuthProvider>
        <SerialPrinterProvider>
          <BluetoothPrinterProvider>
            <MatxTheme>
              <CssBaseline />
              <AutoPrintDaemon />
              {content}
            </MatxTheme>
          </BluetoothPrinterProvider>
        </SerialPrinterProvider>
      </AuthProvider>
    </SettingsProvider>
  );
}
