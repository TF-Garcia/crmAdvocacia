import { lazy, Suspense } from "react";
import { HashRouter, Route, Routes } from "react-router-dom";

const Index = lazy(() => import("./pages/Index"));

const PageLoader = () => (
  <div className="min-h-screen bg-background" aria-label="Carregando" />
);

const App = () => (
  <HashRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="*" element={<Index />} />
      </Routes>
    </Suspense>
  </HashRouter>
);

export default App;
