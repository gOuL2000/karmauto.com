"use client";

import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { ProductFilters } from "@/components/product/product-filters";
import { ProductGrid } from "@/components/product/product-grid";
import { useCategoryStore } from "@/store/category-store";
import { useProductStore } from "@/store/product-store";
import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

export default function ProductsPage() {
  const { loadCategoriesFromDB } = useCategoryStore();
  const { setFilters } = useProductStore();
  const searchParams = useSearchParams();

  // Load categories from database on mount
  useEffect(() => {
    loadCategoriesFromDB();
  }, [loadCategoriesFromDB]);

  // Sync filters from URL to store
  useEffect(() => {
    const searchQuery = searchParams.get("search");
    const vehicleId = searchParams.get("vehicle");
    
    const filterUpdates: any = {};
    if (searchQuery) {
      filterUpdates.search = decodeURIComponent(searchQuery);
    }
    if (vehicleId) {
      filterUpdates.vehicle = vehicleId;
    }
    
    if (Object.keys(filterUpdates).length > 0) {
      setFilters(filterUpdates);
    }
  }, [searchParams, setFilters]);

  // Mark body so bottom nav can be forced centered on this page (RTL fix)
  useEffect(() => {
    document.body.classList.add("page-products");
    return () => {
      document.body.classList.remove("page-products");
    };
  }, []);

  // Fix mobile zoom issue: Prevent automatic zoom and ensure proper viewport scaling
  useEffect(() => {
    // Prevent automatic zoom on mobile by ensuring viewport is properly set
    const preventZoom = () => {
      // Set viewport meta tag if not already set
      let viewport = document.querySelector('meta[name="viewport"]');
      if (!viewport) {
        viewport = document.createElement('meta');
        viewport.setAttribute('name', 'viewport');
        document.getElementsByTagName('head')[0].appendChild(viewport);
      }
      viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover');
      
      // Prevent horizontal overflow (only overflow — do NOT set body width so bottom nav stays centered in RTL)
      document.body.style.overflowX = 'hidden';
      document.documentElement.style.overflowX = 'hidden';
      
      // Constrain only main content so we never touch layout of fixed bottom nav
      const mainElement = document.querySelector('main');
      if (mainElement) {
        (mainElement as HTMLElement).style.maxWidth = '100%';
        (mainElement as HTMLElement).style.overflowX = 'hidden';
        // Only limit width of elements inside main (do not touch body or elements outside main)
        const inMain = mainElement.querySelectorAll('*');
        inMain.forEach((el) => {
          const element = el as HTMLElement;
          const computedStyle = window.getComputedStyle(element);
          const width = computedStyle.width;
          if (width && !width.includes('%') && !width.includes('vw') && !width.includes('auto')) {
            const widthValue = parseFloat(width);
            if (widthValue > window.innerWidth) {
              element.style.maxWidth = '100%';
            }
          }
        });
      }
    };
    
    // Execute immediately
    preventZoom();
    
    // Also execute after a short delay to catch dynamically loaded content
    const preventZoomTimeout = setTimeout(preventZoom, 100);
    
    // Reset body and html overflow on mount (in case it was set by another page)
    document.body.style.overflow = "";
    document.documentElement.style.overflow = "";
    document.body.style.position = "";
    document.documentElement.style.position = "";
    
    // Remove ALL stuck overlays (Radix UI Dialog/Sheet overlays) - more aggressive approach
    const removeStuckOverlays = () => {
      // First, force remove all Radix overlays regardless of state
      const allOverlays = document.querySelectorAll('[data-radix-dialog-overlay], [data-radix-portal]');
      allOverlays.forEach((overlay) => {
        const element = overlay as HTMLElement;
        if (!element) return;
        
        const computedStyle = window.getComputedStyle(element);
        const bgColor = computedStyle.backgroundColor;
        
        // Check if it's a black/dark overlay
        const isDarkOverlay = (
          bgColor.includes('rgba(0, 0, 0') || 
          bgColor.includes('rgb(0, 0, 0') ||
          bgColor.includes('rgba(0,0,0') ||
          element.classList.contains('bg-black') ||
          element.classList.contains('bg-black/80') ||
          element.classList.contains('bg-black/50')
        );
        
        // If it's a dark overlay, remove it immediately
        if (isDarkOverlay) {
          element.style.cssText = 'display: none !important; opacity: 0 !important; visibility: hidden !important; pointer-events: none !important; z-index: -1 !important;';
          if (element.parentNode) {
            element.remove();
          }
        }
      });
      
      // Remove any fixed elements with high z-index that might be blocking
      // BUT preserve the bottom navigation (z-index 9999)
      const allFixedElements = document.querySelectorAll('*');
      allFixedElements.forEach((el) => {
        const element = el as HTMLElement;
        if (!element) return;
        
        // Skip bottom navigation - it should always be visible
        if (element.closest('[class*="bottom-navigation"]') || 
            element.getAttribute('data-bottom-nav') === 'true' ||
            element.classList.contains('fixed') && element.classList.contains('bottom-0') && parseInt(window.getComputedStyle(element).zIndex) >= 9999) {
          return;
        }
        
        const computedStyle = window.getComputedStyle(element);
        const position = computedStyle.position;
        const zIndex = parseInt(computedStyle.zIndex) || 0;
        const bgColor = computedStyle.backgroundColor;
        
        // Check if it's a blocking overlay (but not bottom nav)
        if (position === 'fixed' && zIndex >= 30 && zIndex < 9999) {
          const isDarkOverlay = (
            bgColor.includes('rgba(0, 0, 0') || 
            bgColor.includes('rgb(0, 0, 0') ||
            bgColor.includes('rgba(0,0,0')
          );
          
          if (isDarkOverlay) {
            element.style.cssText = 'display: none !important; opacity: 0 !important; visibility: hidden !important; pointer-events: none !important; z-index: -1 !important;';
            if (element.parentNode) {
              element.remove();
            }
          }
        }
      });
      
      // Ensure bottom navigation is visible (set only visibility props — do NOT use cssText so we keep left/right/width/flex and avoid RTL shift)
      const bottomNav = document.querySelector('[data-bottom-nav="true"]') as HTMLElement;
      if (bottomNav) {
        bottomNav.style.display = 'flex';
        bottomNav.style.visibility = 'visible';
        bottomNav.style.opacity = '1';
        bottomNav.style.zIndex = '9999';
      }
      
      // Force remove any body classes that might be blocking
      document.body.classList.remove('overflow-hidden', 'pointer-events-none', 'fixed');
      document.documentElement.classList.remove('overflow-hidden', 'pointer-events-none', 'fixed');
      
      // Reset all inline styles that might block
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.height = '';
      document.documentElement.style.overflow = '';
      document.documentElement.style.position = '';
      document.documentElement.style.height = '';
    };
    
    // Remove immediately
    removeStuckOverlays();
    
    // Also remove after a short delay (in case they're added dynamically)
    const timeout = setTimeout(removeStuckOverlays, 100);
    
    // Cleanup on unmount
    return () => {
      clearTimeout(preventZoomTimeout);
      document.body.style.overflow = "";
      document.documentElement.style.overflow = "";
      document.body.style.position = "";
      document.documentElement.style.position = "";
      document.body.style.overflowX = "";
      document.documentElement.style.overflowX = "";
    };
  }, []);

  return (
    <div className="flex min-h-screen flex-col w-full max-w-full overflow-x-hidden">
      <Header />
      <main className="flex-1 container py-4 sm:py-6 md:py-8 px-2 sm:px-3 md:px-4 w-full max-w-full overflow-x-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6 md:gap-8">
          {/* Desktop Filters - داخل کادر کلی فیلتر */}
          <aside className="hidden lg:block lg:col-span-1">
            <div className="rounded-xl border border-border/50 bg-card/50 dark:bg-card/30 shadow-sm overflow-hidden sticky top-24">
              <div className="border-b border-border/40 bg-muted/30 dark:bg-muted/20 px-4 py-3">
                <h2 className="text-base font-semibold text-foreground">فیلتر محصولات</h2>
              </div>
              <div className="p-4">
                <ProductFilters />
              </div>
            </div>
          </aside>
          <div className="lg:col-span-3 w-full">
            <ProductGrid />
            {/* Alternative: <ProductList /> for list view */}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

