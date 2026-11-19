/**
 * Mustarred Company Simulator - Mobile Responsiveness & Accessibility Test Suite
 *
 * Validates interface sizing, readability, touch targets, and layout constraints
 * across mobile viewport breakpoints: 375px, 390px, 430px, and mobile landscape.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

describe('Mobile Responsiveness & Viewport Breakpoints Audit', () => {
  const cssPath = path.resolve('src/style.css');
  const cssContent = fs.readFileSync(cssPath, 'utf-8');

  it('defines comprehensive media queries for mobile portrait (<=768px, <=480px) and mobile landscape', () => {
    assert.ok(
      cssContent.includes('@media (max-width: 768px)'),
      'Missing base mobile breakpoint @media (max-width: 768px)'
    );
    assert.ok(
      cssContent.includes('@media (max-width: 480px)'),
      'Missing narrow mobile breakpoint @media (max-width: 480px)'
    );
    assert.ok(
      cssContent.includes('@media (max-height: 520px) and (orientation: landscape)'),
      'Missing mobile landscape breakpoint @media (max-height: 520px) and (orientation: landscape)'
    );
  });

  it('preserves desktop layout untouched outside media queries', () => {
    // Top-level modal-dialog desktop rules
    assert.ok(cssContent.includes('max-width: 960px;'));
    assert.ok(cssContent.includes('padding: 24px;'));
    // Desktop HUD rules
    assert.ok(cssContent.includes('padding: 10px 20px;'));
    assert.ok(cssContent.includes('gap: 16px;'));
  });

  it('Requirement 1 & 2: increases font sizes, line heights, and spacing for comfortable reading on mobile', () => {
    const mobileSection = cssContent.slice(cssContent.indexOf('@media (max-width: 768px)'));

    // Dialogue speech bubbles & briefing text
    assert.ok(mobileSection.includes('line-height: 1.65;'));
    assert.ok(mobileSection.includes('.briefing-speech-bubble'));
    assert.ok(mobileSection.includes('.spoken-briefing'));

    // Character names & titles
    assert.ok(mobileSection.includes('.colleague-name'));
    assert.ok(mobileSection.includes('.colleague-title'));

    // Instructions, intel points & Q&A
    assert.ok(mobileSection.includes('.intel-column ul li'));
    assert.ok(mobileSection.includes('.qa-quote'));
    assert.ok(mobileSection.includes('.qa-question-btn'));
  });

  it('Requirement 3: makes dialogue panels use most of the screen width with appropriate margins', () => {
    const mobileSection = cssContent.slice(cssContent.indexOf('@media (max-width: 768px)'));

    assert.ok(mobileSection.includes('.modal-backdrop'));
    assert.ok(mobileSection.includes('padding: 10px 8px;'));
    assert.ok(mobileSection.includes('max-width: 100% !important;'));
    assert.ok(mobileSection.includes('width: 100% !important;'));
  });

  it('Requirement 4: increases touch target sizes for buttons, inputs, radios, and inquiries (>= 44px)', () => {
    const mobileSection = cssContent.slice(cssContent.indexOf('@media (max-width: 768px)'));

    // Minimum button and action heights
    assert.ok(mobileSection.includes('min-height: 48px;'));
    assert.ok(mobileSection.includes('min-height: 44px;'));

    // Directive input font size 16px (prevents iOS auto-zoom)
    assert.ok(mobileSection.includes('font-size: 16px;'));

    // Radio button touch size enlargement
    assert.ok(mobileSection.includes('width: 22px;'));
    assert.ok(mobileSection.includes('height: 22px;'));

    // Safeguard checkbox touch size enlargement
    assert.ok(mobileSection.includes('width: 20px;'));
    assert.ok(mobileSection.includes('height: 20px;'));
  });

  it('Requirement 5: reorganises the HUD on mobile to prevent compression and unreadability', () => {
    const mobileSection = cssContent.slice(cssContent.indexOf('@media (max-width: 768px)'));

    // Flexible column layout
    assert.ok(mobileSection.includes('.hud-topbar'));
    assert.ok(mobileSection.includes('flex-direction: column;'));

    // 3-column Grid layout for 3 primary metric cards (Cash Reserves, IT Stability, HR Morale)
    assert.ok(mobileSection.includes('.hud-center'));
    assert.ok(mobileSection.includes('grid-template-columns: repeat(3, 1fr);'));

    // Expandable financial details drawer
    assert.ok(mobileSection.includes('.hud-finance-expandable'));
    assert.ok(mobileSection.includes('.hud-finance-dropdown'));

    // Narrow screen (<=480px) keeps 3-column primary metrics grid and compact dropdown
    const narrowSection = cssContent.slice(cssContent.indexOf('@media (max-width: 480px)'));
    assert.ok(narrowSection.includes('grid-template-columns: repeat(3, 1fr);'));
  });

  it('Requirement 6: ensures long dialogue and decision panels are independently scrollable', () => {
    const mobileSection = cssContent.slice(cssContent.indexOf('@media (max-width: 768px)'));

    assert.ok(mobileSection.includes('.modal-body'));
    assert.ok(mobileSection.includes('overflow-y: auto;'));
    assert.ok(mobileSection.includes('-webkit-overflow-scrolling: touch;'));
    assert.ok(mobileSection.includes('overscroll-behavior: contain;'));
  });

  it('Requirement 7: prevents text clipping, overlapping elements, and horizontal overflow', () => {
    const mobileSection = cssContent.slice(cssContent.indexOf('@media (max-width: 768px)'));

    assert.ok(mobileSection.includes('overflow-x: hidden;'));
    assert.ok(mobileSection.includes('word-break: break-word;'));

    // Factor row stacks on mobile to prevent 140px fixed label clipping
    assert.ok(mobileSection.includes('.factor-row'));
    assert.ok(mobileSection.includes('flex-direction: column;'));
  });

  it('Requirement 8: supports narrow phone widths (375px, 390px, 430px) and landscape mode', () => {
    // 375px (iPhone SE): covered by @media (max-width: 480px)
    const narrowSection = cssContent.slice(cssContent.indexOf('@media (max-width: 480px)'));
    assert.ok(narrowSection.includes('padding: 4px;'));
    assert.ok(narrowSection.includes('max-height: 96vh;'));

    // Mobile landscape (e.g. 667x375, 844x390, 932x430)
    const landscapeSection = cssContent.slice(
      cssContent.indexOf('@media (max-height: 520px) and (orientation: landscape)')
    );
    assert.ok(landscapeSection.includes('.hud-topbar'));
    assert.ok(landscapeSection.includes('flex-direction: row;'));
    assert.ok(landscapeSection.includes('.pillars-group'));
    assert.ok(landscapeSection.includes('display: none;')); // Conserves width
    assert.ok(landscapeSection.includes('max-height: 98vh;'));
  });

  it('Requirement 9: ensures compact outcome screen layout on mobile (<=480px) without overflow or clipping', () => {
    const narrowSection = cssContent.slice(cssContent.indexOf('@media (max-width: 480px)'));
    assert.ok(narrowSection.includes('.modal-backdrop.is-resolution-overlay'));
    assert.ok(narrowSection.includes('align-items: flex-start;'));
    assert.ok(narrowSection.includes('.resolution-dialog'));
    assert.ok(narrowSection.includes('margin: 0 auto;'));
    assert.ok(narrowSection.includes('.resolution-dialog .modal-body'));
    assert.ok(narrowSection.includes('min-height: 0;'));
    assert.ok(narrowSection.includes('overflow-y: auto;'));
    assert.ok(narrowSection.includes('.resolution-dialog .modal-footer .btn-large'));
    assert.ok(narrowSection.includes('min-height: 44px;'));
    assert.ok(narrowSection.includes('.compact-health-strip'));
    assert.ok(narrowSection.includes('grid-template-columns: repeat(3, 1fr);'));
    assert.ok(narrowSection.includes('.compact-metric-pill'));
    assert.ok(narrowSection.includes('min-width: 0;'));
    assert.ok(narrowSection.includes('.outcome-action-summary'));
    assert.ok(narrowSection.includes('.outcome-tunde-quote-card'));
    assert.ok(narrowSection.includes('.compact-takeaway-card'));
    assert.ok(narrowSection.includes('.resolution-expandable-details'));
  });
});
