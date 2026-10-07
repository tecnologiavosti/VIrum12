import { lazy, Suspense } from "react";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { AnimatePresence } from "framer-motion";
import { RequireUser } from "@/components/guards/RoleGuards";
import { RouteMeta } from "@/components/seo/RouteMeta";
import { DynamicSEOHead } from "@/components/seo/DynamicSEOHead";
import { AnalyticsInjector } from "@/components/seo/AnalyticsInjector";

// Eagerly load Index (landing page) for fast first paint
import Index from "./pages/Index";

/**
 * Resilient lazy import.
 *
 * Vite gera arquivos JS com hash. Se o browser/Lovable mantiver um index.html
 * antigo em cache depois de um novo deploy, esse index pode tentar carregar
 * um chunk que já não existe. O import dinâmico então rejeita com
 * "Failed to fetch dynamically imported module" e o React pode ficar em tela
 * branca. Neste caso fazemos UMA atualização forçada para obter o manifest
 * HTML/chunks da versão atual. O sessionStorage evita loop infinito.
 */
function lazyWithRecovery<T extends React.ComponentType<any>>(
  importer: () => Promise<{ default: T }>,
) {
  return lazy(async () => {
    try {
      return await importer();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const isChunkError =
        /failed to fetch dynamically imported module|importing a module script failed|loading chunk|chunkloaderror/i.test(message);

      if (isChunkError && typeof window !== "undefined") {
        const recoveryKey = "virum:chunk-recovery";
        const alreadyRecovered = sessionStorage.getItem(recoveryKey) === "1";

        if (!alreadyRecovered) {
          sessionStorage.setItem(recoveryKey, "1");
          window.location.reload();
        }
      }

      throw error;
    }
  });
}

const Auth = lazyWithRecovery(() => import("./pages/Auth"));
const Dashboard = lazyWithRecovery(() => import("./pages/Dashboard"));
const Pricing = lazyWithRecovery(() => import("./pages/Pricing"));
const HowItWorks = lazyWithRecovery(() => import("./pages/HowItWorks"));
const NewDiagnosis = lazyWithRecovery(() => import("./pages/NewDiagnosis"));
const DiagnosisResult = lazyWithRecovery(() => import("./pages/DiagnosisResult"));
const SharedDiagnosis = lazyWithRecovery(() => import("./pages/SharedDiagnosis"));
const Terms = lazyWithRecovery(() => import("./pages/Terms"));
const Privacy = lazyWithRecovery(() => import("./pages/Privacy"));
const Cookies = lazyWithRecovery(() => import("./pages/Cookies"));
const NotFound = lazyWithRecovery(() => import("./pages/NotFound"));
const ResetPassword = lazyWithRecovery(() => import("./pages/ResetPassword"));
const Profile = lazyWithRecovery(() => import("./pages/Profile"));
const PaymentSuccess = lazyWithRecovery(() => import("./pages/PaymentSuccess"));
const PaymentFailed = lazyWithRecovery(() => import("./pages/PaymentFailed"));
const FAQ = lazyWithRecovery(() => import("./pages/FAQ"));
const AdminLayout = lazyWithRecovery(() => import("./pages/admin/AdminLayout"));
const AdminDashboard = lazyWithRecovery(() => import("./pages/admin/AdminDashboard"));
const AdminPlans = lazyWithRecovery(() => import("./pages/admin/AdminPlans"));
const AdminUsers = lazyWithRecovery(() => import("./pages/admin/AdminUsers"));
const AdminSettings = lazyWithRecovery(() => import("./pages/admin/AdminSettings"));
const AdminLibrary = lazyWithRecovery(() => import("./pages/admin/AdminLibrary"));
const AdminFinance = lazyWithRecovery(() => import("./pages/admin/AdminFinance"));
const AdminCoupons = lazyWithRecovery(() => import("./pages/admin/AdminCoupons"));
const AdminUserDetail = lazyWithRecovery(() => import("./pages/admin/AdminUserDetail"));
const AdminAffiliates = lazyWithRecovery(() => import("./pages/admin/AdminAffiliates"));
const AdminAffiliateProducts = lazyWithRecovery(() => import("./pages/admin/AdminAffiliateProducts"));
const AdminAffiliateDetail = lazyWithRecovery(() => import("./pages/admin/AdminAffiliateDetail"));
const AdminBlogList = lazyWithRecovery(() => import("./pages/admin/AdminBlogList"));
const AdminBlogEditor = lazyWithRecovery(() => import("./pages/admin/AdminBlogEditor"));
const AdminDiagnosticFormImages = lazyWithRecovery(() => import("./pages/admin/AdminDiagnosticFormImages"));
const AdminAIMonitoring = lazyWithRecovery(() => import("./pages/admin/AdminAIMonitoring"));
const AdminDiagnoses = lazyWithRecovery(() => import("./pages/admin/AdminDiagnoses"));
const AdminDiagnosisDetail = lazyWithRecovery(() => import("./pages/admin/AdminDiagnosisDetail"));
const AdminSEO = lazyWithRecovery(() => import("./pages/admin/AdminSEO"));
const Blog = lazyWithRecovery(() => import("./pages/Blog"));
const BlogPost = lazyWithRecovery(() => import("./pages/BlogPost"));
const PainelMigracao = lazyWithRecovery(() => import("./pages/PainelMigracao"));

function LazyFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
        <p className="text-xs text-muted-foreground">Carregando...</p>
      </div>
    </div>
  );
}

const queryClient = new QueryClient();

function AnimatedRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <DynamicSEOHead />
      <AnalyticsInjector />
      <RouteMeta />
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<RequireUser><Index /></RequireUser>} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/account" element={<RequireUser><Dashboard /></RequireUser>} />
        <Route path="/pricing" element={<RequireUser><Pricing /></RequireUser>} />
        <Route path="/how-it-works" element={<RequireUser><HowItWorks /></RequireUser>} />
        <Route path="/new-diagnosis" element={<RequireUser><NewDiagnosis /></RequireUser>} />
        <Route path="/diagnosis/share/:token" element={<SharedDiagnosis />} />
        <Route path="/diagnosis/:id" element={<RequireUser><DiagnosisResult /></RequireUser>} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/cookies" element={<Cookies />} />
        <Route path="/faq" element={<FAQ />} />
        <Route path="/blog" element={<Blog />} />
        <Route path="/blog/:slug" element={<BlogPost />} />
        <Route path="/painel-migracao" element={<PainelMigracao />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/profile" element={<RequireUser><Profile /></RequireUser>} />
        <Route path="/payment-success" element={<RequireUser><PaymentSuccess /></RequireUser>} />
        <Route path="/payment-failed" element={<RequireUser><PaymentFailed /></RequireUser>} />
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="finance" element={<AdminFinance />} />
          <Route path="plans" element={<AdminPlans />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="users/:id" element={<AdminUserDetail />} />
          <Route path="diagnoses" element={<AdminDiagnoses />} />
          <Route path="diagnoses/:id" element={<AdminDiagnosisDetail />} />
          <Route path="coupons" element={<AdminCoupons />} />
          <Route path="affiliates" element={<AdminAffiliates />} />
          <Route path="affiliate-products" element={<AdminAffiliateProducts />} />
          <Route path="affiliates/:id" element={<AdminAffiliateDetail />} />
          <Route path="library" element={<AdminLibrary />} />
          <Route path="blog" element={<AdminBlogList />} />
          <Route path="blog/:id" element={<AdminBlogEditor />} />
          <Route path="diagnostic-form-images" element={<AdminDiagnosticFormImages />} />
          <Route path="ai-monitoring" element={<AdminAIMonitoring />} />
          <Route path="seo" element={<AdminSEO />} />
          <Route path="settings" element={<AdminSettings />} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
    </AnimatePresence>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Sonner position="bottom-right" richColors closeButton style={{ zIndex: 999999 }} />
        <BrowserRouter>
          <Suspense fallback={<LazyFallback />}>
            <AnimatedRoutes />
          </Suspense>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
