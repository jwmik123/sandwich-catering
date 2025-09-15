# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- **Development server**: `npm run dev` (uses Next.js with Turbopack)
- **Build**: `npm run build`
- **Production server**: `npm start`
- **Lint**: `npm run lint`

## Architecture Overview

This is a Next.js 15 catering order application for The Sandwichbar with the following key integrations:

### Tech Stack
- **Frontend**: Next.js 15 (App Router), React 19, Tailwind CSS
- **CMS**: Sanity (headless CMS for product management)
- **Payment**: Mollie API
- **Accounting**: Yuki API integration for invoice generation
- **Email**: Resend for transactional emails
- **PDF Generation**: @react-pdf/renderer for invoices and orders
- **SMS**: Twilio integration

### Key Architecture Components

**Multi-Step Order Wizard**: The main application flow is a 6-step wizard (`app/page.js`):
1. Sandwich amount selection
2. Offer selection (variety or custom)
3. Order summary
4. Delivery details
5. Company/contact details
6. Payment processing

**State Management**: Custom hooks handle complex order state:
- `useOrderForm.js` - Main order form state and delivery cost calculations
- `useOrderValidation.js` - Step-by-step validation logic

**API Integrations**:
- `lib/yuki-api.js` - Complete Yuki accounting system integration with SOAP API
- Payment processing via Mollie webhooks
- Sanity CMS for product catalog management

**Data Flow**:
- Products are fetched from Sanity CMS
- Orders are stored in Sanity with quote generation
- Payment processed via Mollie
- Invoices automatically created in Yuki accounting system
- PDF generation for invoices and order confirmations

### Important File Locations

- **Sanity schema**: `sanity/schemaTypes/`
- **API routes**: `app/api/` (create-invoice, create-payment, webhooks, etc.)
- **Components**: Organized in `app/components/` with step components in `steps/`
- **Business logic**: `lib/` contains utilities for external API integrations
- **Configuration**: Sanity config in root, Next.js config uses Turbopack

### Environment Variables Required

The application requires various API keys for:
- Sanity project configuration
- Mollie payment processing
- Yuki accounting API
- Resend email service
- Twilio SMS service

### Development Notes

- Uses Sanity Studio accessible at `/studio` route
- Payment webhooks handle order completion and invoice generation
- PDF generation happens server-side for both invoices and order confirmations
- Custom delivery cost calculation based on postal code
- VAT handling throughout the order flow (9% rate for food items)