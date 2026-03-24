import { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import { fetchClients, saveClients, fetchUploads, saveUploads, migrateLocalToSupabase } from "@/data/store";
import { supabaseConfigured } from "@/lib/supabase";

const queryClient = new QueryClient();

function SupabaseInit() {
  useEffect(() => {
    if (!supabaseConfigured) return;
    (async () => {
      // One-time migration from localStorage to Supabase
      if (!localStorage.getItem("cf-sb-migrated")) {
        await migrateLocalToSupabase();
        localStorage.setItem("cf-sb-migrated", "1");
      }
      // Pull latest data from Supabase and refresh local cache
      const [clients, uploads] = await Promise.all([fetchClients(), fetchUploads()]);
      if (clients.length > 0) saveClients(clients);
      if (uploads.length > 0) saveUploads(uploads);
    })();
  }, []);
  return null;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <SupabaseInit />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
