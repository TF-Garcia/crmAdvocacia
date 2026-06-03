import { lazy, Suspense } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import DeferredToaster from "@/components/DeferredToaster";

const Index = lazy(() => import("./pages/Index"));

const PageLoader = () => (
  <div className="min-h-screen bg-background" aria-label="Carregando" />
);

const App = () => (
  <BrowserRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
    <DeferredToaster />
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="*" element={<Index />} />
      </Routes>
    </Suspense>
  </BrowserRouter>
);

export default App;
