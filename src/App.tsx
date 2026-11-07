import React, { useState, useEffect } from 'react';
import { Language, Experience, ExperienceCategory } from './types';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { WhyUs } from './components/WhyUs';
import { ExperienceMatcher } from './components/ExperienceMatcher';
import { TheIslands } from './components/TheIslands';
import { InteractiveTravelMap } from './components/InteractiveTravelMap';
import { FloatingGallery } from './components/FloatingGallery';
import { ExperienceDetailModal } from './components/ExperienceDetailModal';
import { GunaStory } from './components/GunaStory';
import { Reviews } from './components/Reviews';
import { FaqSection } from './components/FaqSection';
import { TripPlannerSection } from './components/TripPlannerSection';
import { ExperienceBookingModal } from './components/planner/ExperienceBookingModal';
import { FinalCta } from './components/FinalCta';
import { Footer } from './components/Footer';
import { AdminAuthGuard } from './components/admin/AdminAuthGuard';
import { IslandDesignPreview } from './components/preview/IslandDesignPreview';
import { TermsAndConditionsPage } from './components/TermsAndConditionsPage';
import { LandingExperiencePage } from './components/landing/LandingExperiencePage';
import { updateSeoMetadata, SeoRoute } from './utils/seo';
import { EXPERIENCES_DATA } from './data/experiences';
import { supabase } from './lib/supabase';
import { TermsModal } from './components/TermsModal';
import { AudioDiagnosticPanel } from './components/AudioDiagnosticPanel';

const isAuthCallbackUrl = (): boolean => {
  if (typeof window === 'undefined') return false;
  const hash = window.location.hash || '';
  const search = window.location.search || '';
  return (
    hash.includes('type=recovery') ||
    hash.includes('type=invite') ||
    hash.includes('access_token=') ||
    hash.includes('error=') ||
    hash.includes('error_code=') ||
    search.includes('code=') ||
    search.includes('type=recovery') ||
    search.includes('type=invite') ||
    search.includes('error=') ||
    search.includes('error_code=')
  );
};

import { normalizePath, getLandingRouteInfo, LandingExperienceType } from './utils/landingRoutes';
export { normalizePath, getLandingRouteInfo };

export default function App() {
  const [currentLang, setCurrentLang] = useState<Language>(() => {
    if (typeof window === 'undefined') return 'en';
    const landingInfo = getLandingRouteInfo(window.location.pathname);
    if (landingInfo.lang) return landingInfo.lang;
    const params = new URLSearchParams(window.location.search);
    return params.get('lang') === 'es' ? 'es' : 'en';
  });
  const [selectedExperienceForModal, setSelectedExperienceForModal] = useState<Experience | null>(null);
  const [isTermsModalOpen, setIsTermsModalOpen] = useState<boolean>(false);
  const [termsModalTab, setTermsModalTab] = useState<'overnight' | 'day-trip'>('day-trip');

  useEffect(() => {
    const handleOpenTerms = (e: Event) => {
      const customEvent = e as CustomEvent<'overnight' | 'day-trip'>;
      if (customEvent.detail) {
        setTermsModalTab(customEvent.detail);
      }
      setIsTermsModalOpen(true);
    };
    window.addEventListener('open-terms', handleOpenTerms as EventListener);
    return () => {
      window.removeEventListener('open-terms', handleOpenTerms as EventListener);
    };
  }, []);
  
  // Dedicated Experience Booking Modal State
  const [isPlannerModalOpen, setIsPlannerModalOpen] = useState<boolean>(false);
  const [plannerModalCategory, setPlannerModalCategory] = useState<ExperienceCategory | undefined>(undefined);
  const [plannerPreSelectedCategory, setPlannerPreSelectedCategory] = useState<ExperienceCategory | ''>('');

  // Routing State for /admin route, including Supabase auth callback detection from root URL
  const [isAdminRoute, setIsAdminRoute] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    if (window.location.pathname.startsWith('/admin')) return true;
    if (isAuthCallbackUrl()) {
      // Securely transfer URL to /admin preserving token/hash/code for AdminAuthGuard
      window.history.replaceState(
        {},
        '',
        '/admin' + window.location.search + window.location.hash
      );
      return true;
    }
    return false;
  });

  const [isPreviewRoute, setIsPreviewRoute] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.location.pathname.startsWith('/island-design-preview');
  });

  const [isTermsRoute, setIsTermsRoute] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.location.pathname.startsWith('/terms-and-conditions');
  });

  const [landingRoute, setLandingRoute] = useState<LandingExperienceType | null>(() => {
    if (typeof window === 'undefined') return null;
    return getLandingRouteInfo(window.location.pathname).type;
  });

  const handleLanguageChange = (newLang: Language) => {
    setCurrentLang(newLang);
    if (typeof window !== 'undefined') {
      const path = window.location.pathname;
      const landingInfo = getLandingRouteInfo(path);
      if (landingInfo.type) {
        const targetUrl = newLang === 'es' ? `/es/san-blas-${landingInfo.type}` : `/san-blas-${landingInfo.type}`;
        window.history.pushState({}, '', targetUrl);
        window.dispatchEvent(new Event('popstate'));
        return;
      }
      if (path.startsWith('/terms-and-conditions')) {
        const targetUrl = newLang === 'es' ? `${path}?lang=es` : path;
        window.history.replaceState({}, '', targetUrl);
        return;
      }
      const url = new URL(window.location.href);
      if (newLang === 'es') {
        url.searchParams.set('lang', 'es');
      } else {
        url.searchParams.delete('lang');
      }
      window.history.replaceState({}, '', url.pathname + url.search + url.hash);
    }
  };

  // Dynamically update document SEO metadata when language or route changes
  useEffect(() => {
    let route: SeoRoute = 'home';
    if (typeof window !== 'undefined') {
      const path = window.location.pathname;
      const landingInfo = getLandingRouteInfo(path);
      if (landingInfo.type === 'day-trips') {
        route = 'landing-day-trips';
      } else if (landingInfo.type === 'overnight-stays') {
        route = 'landing-overnight-stays';
      } else if (landingInfo.type === 'sailing') {
        route = 'landing-sailing';
      } else if (path.startsWith('/terms-and-conditions/day-tour')) {
        route = 'terms-day-tour';
      } else if (path.startsWith('/terms-and-conditions/overnight')) {
        route = 'terms-overnight';
      } else if (path.startsWith('/terms-and-conditions')) {
        route = 'terms-hub';
      }
    }
    updateSeoMetadata(route, currentLang);
  }, [currentLang, isTermsRoute, landingRoute]);

  // Handle Shareable Experience Deep Links (?experience=id or ?exp=id)
  const handleSetExperienceModal = (exp: Experience | null) => {
    setSelectedExperienceForModal(exp);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      if (exp) {
        url.searchParams.set('experience', exp.id);
      } else {
        url.searchParams.delete('experience');
        url.searchParams.delete('exp');
      }
      window.history.pushState({}, '', url.pathname + url.search + url.hash);
    }
  };

  useEffect(() => {
    const handleLocationChange = () => {
      const atAdmin = window.location.pathname.startsWith('/admin') || isAuthCallbackUrl();
      const atPreview = window.location.pathname.startsWith('/island-design-preview');
      const atTerms = window.location.pathname.startsWith('/terms-and-conditions');
      const landingInfo = getLandingRouteInfo(window.location.pathname);

      if (atAdmin && !window.location.pathname.startsWith('/admin')) {
        window.history.replaceState(
          {},
          '',
          '/admin' + window.location.search + window.location.hash
        );
      }
      setIsAdminRoute(atAdmin);
      setIsPreviewRoute(atPreview);
      setIsTermsRoute(atTerms);
      setLandingRoute(landingInfo.type);

      // Sync experience parameter on back/forward or initial navigate
      const params = new URLSearchParams(window.location.search);
      const expParam = params.get('experience') || params.get('exp');
      if (expParam) {
        const found = EXPERIENCES_DATA.find((e) => e.id === expParam || e.category === expParam);
        if (found) {
          setSelectedExperienceForModal(found);
        }
      } else {
        setSelectedExperienceForModal(null);
      }

      // Sync language parameter if landing page specifies language or URL param changed
      if (landingInfo.lang) {
        if (landingInfo.lang !== currentLang) {
          setCurrentLang(landingInfo.lang);
        }
      } else {
        const langParam = params.get('lang');
        if (langParam === 'es' && currentLang !== 'es') {
          setCurrentLang('es');
        } else if (!langParam && currentLang === 'es') {
          setCurrentLang('en');
        }
      }
    };

    // Initial check on load
    handleLocationChange();

    window.addEventListener('popstate', handleLocationChange);
    return () => window.removeEventListener('popstate', handleLocationChange);
  }, [currentLang]);

  // Listen for Supabase PASSWORD_RECOVERY events
  useEffect(() => {
    if (!supabase) return;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/admin')) {
          window.history.replaceState(
            {},
            '',
            '/admin' + window.location.search + window.location.hash
          );
        }
        setIsAdminRoute(true);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleNavigateToPublic = () => {
    if (typeof window !== 'undefined') {
      const url = currentLang === 'es' ? '/?lang=es' : '/';
      window.history.pushState({}, '', url);
      setIsAdminRoute(false);
      setIsPreviewRoute(false);
      setIsTermsRoute(false);
      setLandingRoute(null);
      window.scrollTo(0, 0);
    }
  };

  const handleOpenPlanner = (category?: ExperienceCategory) => {
    if (category) {
      setPlannerModalCategory(category);
      setPlannerPreSelectedCategory(category);
    } else {
      setPlannerModalCategory(undefined);
    }
    setIsPlannerModalOpen(true);
  };

  const handleExploreExperiences = () => {
    const expEl = document.getElementById('experiences') || document.getElementById('planner') || document.getElementById('finder');
    if (expEl) {
      expEl.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleViewExperienceDetailsById = (id: string) => {
    const found = EXPERIENCES_DATA.find((e) => e.id === id);
    if (found) {
      handleSetExperienceModal(found);
    }
  };

  // Render Island Design Preview Prototype Route
  if (isPreviewRoute) {
    return (
      <IslandDesignPreview
        currentLang={currentLang}
        onLanguageChange={handleLanguageChange}
        onBackToWebsite={handleNavigateToPublic}
      />
    );
  }

  // Render Admin Auth Guard / Dashboard at /admin with secure authorization
  if (isAdminRoute) {
    return <AdminAuthGuard onBackToWebsite={handleNavigateToPublic} />;
  }

  // Render Official Terms & Conditions Document Route
  if (isTermsRoute) {
    let initialPolicy: 'hub' | 'overnight' | 'day-tour' = 'hub';
    if (typeof window !== 'undefined') {
      if (window.location.pathname.includes('/overnight')) initialPolicy = 'overnight';
      else if (window.location.pathname.includes('/day-tour')) initialPolicy = 'day-tour';
    }
    return (
      <TermsAndConditionsPage
        currentLang={currentLang}
        onLanguageChange={handleLanguageChange}
        onBackToWebsite={handleNavigateToPublic}
        onOpenPlanner={() => handleOpenPlanner()}
        initialPolicy={initialPolicy}
      />
    );
  }

  // Render Premium Bilingual SEO Landing Experience Pages
  if (landingRoute) {
    return (
      <>
        <LandingExperiencePage
          experienceType={landingRoute}
          currentLang={currentLang}
          onLanguageChange={handleLanguageChange}
          onBackToHome={handleNavigateToPublic}
          onOpenBooking={(cat) => handleOpenPlanner(cat)}
        />

        {/* Dedicated Experience Discovery & Booking Flow Modal */}
        <ExperienceBookingModal
          isOpen={isPlannerModalOpen}
          onClose={() => setIsPlannerModalOpen(false)}
          currentLang={currentLang}
          onLanguageChange={handleLanguageChange}
          initialCategory={plannerModalCategory}
          onOpenExperienceDetails={(exp) => {
            setIsPlannerModalOpen(false);
            handleSetExperienceModal(exp);
          }}
        />
      </>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF8F2] text-[#173D36] selection:bg-[#E2D2BB] selection:text-[#173D36]">
      {/* Top Bar Navigation: Mathematically Centered GUNA YALA + Direct Sub-Navigation */}
      <Navbar
        currentLang={currentLang}
        onLanguageChange={handleLanguageChange}
        onOpenPlanner={() => handleOpenPlanner()}
      />

      {/* Main Editorial Flow */}
      <main className="flex-1">
        {/* 1. Full-Screen Cinematic Destination Video Hero (LOCKED) */}
        <Hero
          currentLang={currentLang}
          onExploreClick={handleExploreExperiences}
          onPlanClick={() => handleOpenPlanner()}
        />

        {/* 2. Discover Guna Yala: Autonomous Sanctuary & Natural Stewardship */}
        <WhyUs currentLang={currentLang} />

        {/* 3. Find Your Experience: Refined Guided Questionnaire Flow */}
        <ExperienceMatcher
          currentLang={currentLang}
          onSelectExperience={(cat) => handleOpenPlanner(cat)}
          onViewExperienceDetails={handleViewExperienceDetailsById}
        />

        {/* 4. Interactive Island Discovery Section (The Islands of Guna Yala - 7 Islands) */}
        <TheIslands
          currentLang={currentLang}
          onOpenPlanner={(cat, island) => handleOpenPlanner(cat as any)}
        />

        {/* Interactive Editorial Archipelago Travel Map Section */}
        <InteractiveTravelMap
          currentLang={currentLang}
          onOpenPlanner={(cat) => handleOpenPlanner(cat)}
        />

        {/* Motion Lab 2 Floating Gallery: Cinematic Visual Moments Showcase */}
        <FloatingGallery
          currentLang={currentLang}
          onOpenPlanner={(cat) => handleOpenPlanner(cat as any)}
        />

        {/* 6. The Guna Experience: Authentic & Respectful Indigenous Cultural Storytelling */}
        <GunaStory currentLang={currentLang} />

        {/* 7. What Travelers Say: Real Google Social Proof (5.0 Rating · 54 Reviews) */}
        <Reviews currentLang={currentLang} />

        {/* 9. Essential Island FAQ */}
        <FaqSection currentLang={currentLang} />

        {/* 10. Easy Structured Trip Planning & Experience Selection (How Do You Want to Experience Guna Yala?) */}
        <TripPlannerSection
          currentLang={currentLang}
          preSelectedCategory={plannerPreSelectedCategory}
          onOpenExperienceDetails={(exp) => handleSetExperienceModal(exp)}
        />

        {/* 11. Final Call to Action */}
        <FinalCta
          currentLang={currentLang}
          onPlanClick={() => handleOpenPlanner()}
        />
      </main>

      {/* Footer */}
      <Footer
        currentLang={currentLang}
        onLanguageChange={handleLanguageChange}
        onOpenPlanner={() => handleOpenPlanner()}
      />

      {/* Dedicated Experience Discovery & Booking Flow Modal */}
      <ExperienceBookingModal
        isOpen={isPlannerModalOpen}
        onClose={() => setIsPlannerModalOpen(false)}
        currentLang={currentLang}
        onLanguageChange={handleLanguageChange}
        initialCategory={plannerModalCategory}
        onOpenExperienceDetails={(exp) => {
          setIsPlannerModalOpen(false);
          handleSetExperienceModal(exp);
        }}
      />

      {/* Deep-Dive Experience Modal */}
      <ExperienceDetailModal
        experience={selectedExperienceForModal}
        currentLang={currentLang}
        onLanguageChange={handleLanguageChange}
        onClose={() => handleSetExperienceModal(null)}
        onInquire={(cat) => handleOpenPlanner(cat)}
        onSelectExperience={(exp) => handleSetExperienceModal(exp)}
      />

      {/* Official Terms & Conditions Modal */}
      <TermsModal
        isOpen={isTermsModalOpen}
        onClose={() => setIsTermsModalOpen(false)}
        currentLang={currentLang}
        initialTab={termsModalTab}
      />

      {/* Development-Only Audio Diagnostic Panel */}
      <AudioDiagnosticPanel />
    </div>
  );
}
