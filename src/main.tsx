import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router";

import "./index.css";
import App from "./App.tsx";
import Node from "./components/Node.tsx";
import { ThemeProvider } from "@/components/theme-provider";
import { SWRConfig } from "swr";
import { fetcher } from "./lib/utils.ts";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider defaultTheme="dark" storageKey="ui-theme">
      <SWRConfig value={{ fetcher }}>
        <BrowserRouter>
          <Routes>
            <Route index path="/" element={<App />} />
            <Route path="node/:node" element={<Node />} />
          </Routes>
        </BrowserRouter>
      </SWRConfig>
    </ThemeProvider>
  </StrictMode>
);
