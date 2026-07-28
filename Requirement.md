# Requirements Document

## 1. Application Overview

**Application Name**: Instrict

**Description**: A unified campus multi-marketplace and peer-to-peer errand platform designed for Nigerian university students. The mobile-first web application enables users to order from campus canteens and retail shops, post/accept community errands, and earn through delivery services. The platform supports three user roles: customers, merchants (food vendors and general retailers), and riders/runners. Features include campus-specific content filtering, real-time chat, rating systems, loyalty programs, advanced analytics, multi-language support, payment gateway integration, promotional campaigns, admin management, comprehensive rider verification, and light/dark mode theming.

## 2. Users and Usage Scenarios

**Target Users**:
- Students ordering food/products from campus vendors
- Students posting or accepting campus errands for payment
- Campus food vendors managing orders and menus
- Campus retail shop owners managing inventory and orders
- Student riders/runners delivering orders and completing errands
- Platform administrators managing operations and disputes

**Core Scenarios**:
- Students select their Nigerian university campus on first launch, with auto-location detection
- Students order meals from campus canteens with customized options and delivery to hostels
- Students purchase products from campus retail shops with variant selection
- Students post errands (e.g., document pickup, item delivery) with payout fees
- Riders accept delivery jobs or errand tasks to earn income
- Vendors manage incoming orders, inventory, earnings, and promotional campaigns
- Users communicate via real-time chat and rate service providers
- Students earn loyalty points and redeem rewards
- Administrators oversee platform operations and resolve disputes
- Users switch between light and dark mode based on preference

## 3. Page Structure and Functionality

### 3.1 Page Hierarchy

```
Instrict Platform
├── Campus Selection Screen (First Launch)
├── Landing & Onboarding
│   ├── Landing Screen
│   ├── Unified Auth Screen
│   ├── Student Verification
│   └── Merchant Onboarding Split
│       ├── Food Vendor Profile Setup
│       ├── General Retail Profile Setup
│       └── Subscription Tier Selection
├── Customer Portal
│   ├── Home/Marketplace
│   │   ├── Canteens & Food Tab
│   │   ├── Campus Retail Shops Tab
│   │   ├── Flash Deals Section
│   │   ├── Build Your Plate Modal
│   │   └── Product Variant Picker
│   ├── Community Feed
│   ├── Errand Hub
│   │   ├── Available Tasks Tab
│   │   ├── Post New Errand Tab
│   │   └── My Posted Errands Tab
│   ├── Cart/Checkout
│   │   ├── Multi-Vendor Cart
│   │   ├── Group Order & Split Payment
│   │   └── Scheduled Order Option
│   ├── Activity History
│   ├── Favorites
│   ├── Wallet & Credits
│   ├── Loyalty Rewards
│   ├── Profile
│   │   ├── Student Verification Badge
│   │   ├── Referral Program
│   │   ├── Campus Switcher
│   │   ├── Theme Mode Toggle
│   │   └── Switch to Rider Mode Toggle
│   └── Live Order Tracking Map
├── Vendor Dashboards
│   ├── Food Vendor Interface
│   │   ├── Live Feed Grid
│   │   ├── Menu Inventory Toggles
│   │   ├── Availability Schedule
│   │   ├── Subscription Meals Management
│   │   └── Store Customization
│   ├── General Retail Dashboard
│   │   ├── Inventory Matrix Table
│   │   ├── Order Fulfillment Pipeline
│   │   └── Store Customization
│   └── Shared Vendor Tools
│       ├── Advanced Analytics Dashboard
│       ├── Promotional Campaigns Manager
│       ├── Earnings & Settlement
│       ├── Rating & Reviews Display
│       └── Subscription Tier Management
├── Rider/Runner Portal
│   ├── Rider Onboarding & Verification
│   ├── Active Job Map with Route Optimization
│   ├── Open Job Board
│   │   ├── Food Deliveries Tab
│   │   └── Campus Errands Tab
│   ├── Rider Wallet
│   ├── Trust Profile & Ratings
│   ├── Leaderboard
│   ├── Safety & Insurance Features
│   └── Switch Back to Customer Mode
├── Admin Panel
│   ├── Dashboard Overview
│   ├── User Management
│   ├── Vendor Management
│   ├── Rider Verification & Approval
│   ├── Dispute Resolution Workflow
│   ├── Platform Analytics
│   ├── Geofencing Configuration
│   ├── Campus Management
│   └── System Settings
├── Universal Screens
│   ├── Real-Time Chat Interface
│   ├── Notification Hub
│   ├── Rating & Review Submission
│   ├── Dispute Resolution Overlay
│   ├── Language Selector (English/Yoruba)
│   ├── Theme Mode Toggle (Light/Dark)
│   ├── Campus Indicator & Switcher
│   ├── Accessibility Settings
│   └── Campus Event Bulk Order Interface
└── Payment Integration
    ├── Paystack Gateway
    └── Flutterwave Gateway
```

### 3.2 Campus Selection Screen (First Launch)

- Display full-screen campus selector on first app launch before landing page
- Auto-detect user's location in Nigeria and suggest nearest university campus
- Provide manual search bar for users to search Nigerian universities by name
- Display list of Nigerian universities with campus names
- Show University of Ibadan as primary/default campus option
- Provide \"Select Campus\" button for each university
- Selected campus acts as global context filter determining:
  - Vendors/canteens shown in marketplace
  - Hostels in location dropdown at checkout
  - Errands/tasks visible in errand hub
  - Available riders/runners
  - Campus-specific landmarks in search bar placeholder text
  - All content, vendors, riders, community feed posts scoped to selected campus
- Display selected campus name prominently in app header after selection
- Save campus selection to user profile
- Support both light and dark mode for this screen

### 3.3 Landing & Onboarding

#### 3.3.1 Landing Screen
- Display hero section with messaging: \"Order from Campus Canteens & Retail\" and \"Earn/Post Community Errands\"
- Provide \"Get Started\" call-to-action button
- Display language selector for English/Yoruba
- Display theme mode toggle icon in top navigation bar
- Support both light and dark mode

#### 3.3.2 Unified Auth Screen
- Allow users to register/login using email or student Matric Number credentials
- Differentiate user roles during registration: Customer, Merchant, or Rider
- Provide referral code input field during registration
- Support both light and dark mode

#### 3.3.3 Student Verification
- Validate student status via Matric Number
- Award Student Verification Badge upon successful validation
- Display badge on user profile
- Support both light and dark mode

#### 3.3.4 Merchant Onboarding Split
- Present 2-card choice screen for merchant type selection:
  - **Food Vendor Profile**: Setup for managing live order queues, preparation countdowns, menu availability toggles
  - **General Retail Profile**: Setup for managing product variant matrix, stock level counters, multi-stage packaging pipelines
- Provide Subscription Tier Selection:
  - **Basic (Free)**: Standard features
  - **Premium**: Advanced analytics, promotional tools, priority support
- Support both light and dark mode

### 3.4 Customer Portal

#### 3.4.1 Home/Marketplace
- Display selected campus name in app header
- Display theme mode toggle icon in top navigation bar
- Display segmented control tabs: \"Canteens & Food\" and \"Campus Retail Shops\"
- Provide search bar with campus-specific landmark placeholders (e.g., \"Search food, items, or locations like Indy Hall, SUB\" for University of Ibadan)
- Display Flash Deals Section at top showing time-limited offers from vendors
- List available vendors/shops with basic information, ratings, and favorite icons
- All vendors and shops filtered by selected campus
- Support both light and dark mode

**Canteens & Food Tab**:
- Display food vendors with menu items
- Show item names, prices (₦), availability status, ratings
- Provide \"Add to Cart\" action for each item
- Display favorite icon for quick bookmarking

**Campus Retail Shops Tab**:
- Display retail shops with product listings
- Show product names, prices (₦), stock indicators, ratings
- Provide \"View Details\" action for products with variants
- Display favorite icon for quick bookmarking

#### 3.4.2 Community Feed
- Display social feed where students share recommendations, campus events, vendor tags
- All posts filtered by selected campus
- Provide post creation interface with text, images, vendor tagging
- Show likes, comments, shares on posts
- Display event announcements and community updates
- Support both light and dark mode

#### 3.4.3 Build Your Plate Modal (Food Orders)
- Open when user selects a food item
- Provide radio buttons for portion selection: 1 or 2
- Provide radio buttons for protein choices: Beef or Chicken
- Provide checkboxes for side options: Plantain, Egg
- Display sticky bottom banner with real-time total price calculation
- Provide \"Add to Cart\" button
- Support both light and dark mode

#### 3.4.4 Product Variant Picker (Retail Orders)
- Open when user selects a retail product with variants
- Display grid/list overlay with available sizes, colors, variations
- Show stock indicators for each variant
- Provide \"Add to Cart\" button
- Support both light and dark mode

#### 3.4.5 Cart/Checkout
- Display selected items from multiple vendors with quantities and prices
- Show subtotal, delivery fee, loyalty points discount
- Provide location input section:
  - Dropdown for hostels selection (filtered by selected campus)
  - Text area for \"Block & Room Number\"
  - Toggle: \"Deliver to Room\" vs \"Meet at Porter's Lodge\"
- Provide third-party gift toggle: \"Sending this to someone else?\"
  - When enabled, show inputs for friend's hostel and phone number
- Provide Group Order & Split Payment option:
  - Generate shareable link for group members
  - Display contribution amounts from each participant
  - Show split payment breakdown
- Provide scheduled order option: select delivery date/time up to 3 days ahead
- Provide payment method selection:
  - Wallet/Credits
  - Paystack (Card/Bank)
  - Flutterwave (Card/Bank/USSD)
  - Direct Bank Transfer
- Apply promo code input field
- Provide \"Place Order\" button
- Support both light and dark mode

#### 3.4.6 Errand Hub

**Available Tasks Tab**:
- Display list of posted errands from other users on selected campus
- Show errand title, instructions, payout fee (₦), pickup point, drop-off location
- Provide \"Accept Task\" button for each errand

**Post New Errand Tab**:
- Provide form with fields:
  - Errand Title
  - Instructions (text area)
  - Payout Fee (₦)
  - Pickup Point
  - Drop-off Location
- Display escrow security banner explaining funds held until mutual completion verification
- Provide \"Post Errand\" button

**My Posted Errands Tab**:
- Display user's posted errands with step-by-step progress pipeline:
  - Posted
  - Runner Matched
  - In Progress
  - Completed
- Show errand details and current status
- Support both light and dark mode for all tabs

#### 3.4.7 Activity History
- Display segmented logger with tabs:
  - Order receipts
  - Tracking data
  - Errand logs
  - Transaction ledgers
- Show historical records with dates, amounts, and statuses
- Provide \"Quick Reorder\" button for past orders
- Support both light and dark mode

#### 3.4.8 Favorites
- Display bookmarked vendors and menu items
- Provide quick access to favorite items for reordering
- Show vendor ratings and availability status
- Support both light and dark mode

#### 3.4.9 Wallet & Credits
- Display current wallet balance
- Provide top-up interface with amount input
- Show transaction history
- Display earned credits from referrals and promotions
- Support both light and dark mode

#### 3.4.10 Loyalty Rewards
- Display total loyalty points earned
- Show points earning rate per order
- Provide redemption interface:
  - List available rewards (discounts, free delivery)
  - Show points required for each reward
  - Provide \"Redeem\" button
- Display points history and expiration dates
- Support both light and dark mode

#### 3.4.11 Profile
- Display user information and Student Verification Badge
- Display selected campus name with \"Change Campus\" button
- Provide campus switcher interface to change selected campus
- Display theme mode toggle: Light/Dark with current mode indicator
- Show referral code and \"Invite Friends\" button
- Display referral earnings and bonus credits
- Provide \"Switch to Rider Mode\" toggle
- When toggled, transform navigation to Rider Mode tabs
- Provide accessibility settings: screen reader support, high contrast mode, large text option
- Support both light and dark mode

#### 3.4.12 Live Order Tracking Map
- Display real-time map showing rider's current location
- Show route from vendor to delivery destination
- Display estimated time of arrival (ETA)
- Provide \"Call Rider\" button
- Show order status updates
- Support both light and dark mode

### 3.5 Vendor Dashboards

#### 3.5.1 Food Vendor Interface

**Live Feed Grid**:
- Display Kanban-style cards for incoming orders
- Show countdown timers for each order
- Provide \"Accept Order\" button
- Provide \"Mark as Ready\" button after acceptance
- Display QR code for pickup verification

**Menu Inventory Toggles**:
- Display menu items in rows
- Provide Available/Sold Out slide toggles for each item

**Availability Schedule**:
- Provide interface to set open/close hours for each day
- Auto-mark vendor unavailable outside scheduled hours
- Display current availability status

**Subscription Meals Management**:
- Provide interface to create weekly meal plans
- Set subscription pricing and delivery schedule
- Display active subscribers and upcoming deliveries

**Store Customization**:
- Upload banner images for storefront
- Edit vendor bio and description
- Select featured items to highlight
- Customize store theme colors
- Support both light and dark mode for all interfaces

#### 3.5.2 General Retail Dashboard

**Inventory Matrix Table**:
- Display table with columns: Product Name, Stock Count, Category, Price, Actions
- Provide actions to edit or update inventory

**Order Fulfillment Pipeline**:
- Display orders in stages:
  - New Orders
  - Packing
  - Awaiting Rider Pickup
  - Dispatched
- Provide actions to move orders through stages
- Display QR code for pickup verification

**Store Customization**:
- Upload banner images for storefront
- Edit store bio and description
- Select featured products to highlight
- Customize store theme colors
- Support both light and dark mode for all interfaces

#### 3.5.3 Shared Vendor Tools

**Advanced Analytics Dashboard**:
- Display charts for daily/weekly/monthly revenue
- Show predictive insights: peak order times, popular items, customer trends
- Provide sales forecasting based on historical data
- Display customer demographics and ordering patterns
- Show conversion rates and cart abandonment metrics

**Promotional Campaigns Manager**:
- Create discount campaigns with percentage or fixed amount off
- Set flash sales with time limits
- Generate promo codes with usage limits
- Schedule promotional periods
- Display campaign performance metrics

**Earnings & Settlement**:
- Display total earnings and transaction summaries
- Provide bank account connection setup
- Allow custom withdrawal amount input
- Provide \"Withdraw Funds\" button

**Rating & Reviews Display**:
- Show average rating and total review count
- Display individual customer reviews with star ratings and comments
- Provide response interface for vendor replies

**Subscription Tier Management** (Premium vendors only):
- Display current subscription tier and benefits
- Provide upgrade/downgrade options
- Show billing history and next payment date
- Support both light and dark mode for all tools

### 3.6 Rider/Runner Portal

#### 3.6.1 Rider Onboarding & Verification
- Provide document upload interface:
  - Student ID card
  - Passport photograph
  - Guarantor information
- Submit for admin approval
- Display verification status: Pending, Approved, Rejected
- Support both light and dark mode

#### 3.6.2 Active Job Map with Route Optimization
- Display map HUD with GPS route navigation for campus roads
- Show optimized route using automated algorithm for shortest path
- Display pickup and drop-off locations
- Provide floating action buttons:
  - \"Call Customer\"
  - \"Call Porter's Lodge\"
  - \"Emergency SOS\"
- Display digital student ID component: slide-up badge with \"Verified Student Rider\" seal, name, photo, matriculation metadata
- Show smart batching notification banner when another order is ready for the same hostel destination
- Provide QR code scanner for pickup verification
- Provide \"Mark as Delivered\" or \"Mark as Completed\" button
- Support both light and dark mode

#### 3.6.3 Open Job Board
- Display split view with map and list
- All jobs filtered by selected campus
- Provide filter tabs:
  - **Food Deliveries**: Show canteen order pins on map, list with Pickup Canteen, Target Hostel, Delivery Fee (₦)
  - **Campus Errands**: Show P2P gig pins on map, list with task descriptions, route distances, runner rewards (₦)
- Provide \"Accept Job\" button for each listing
- Display geofencing boundary overlay restricting jobs to selected campus
- Support both light and dark mode

#### 3.6.4 Rider Wallet
- Display total earnings
- Show transaction history
- Provide withdrawal functionality
- Support both light and dark mode

#### 3.6.5 Trust Profile & Ratings
- Display rider's verification status
- Show completed deliveries count
- Display average rating and total reviews
- Show customer reviews with star ratings and comments
- Support both light and dark mode

#### 3.6.6 Leaderboard
- Display top earners of the week
- Show rider rankings by total earnings
- Display rider names, earnings, and delivery counts
- Highlight current user's position
- Support both light and dark mode

#### 3.6.7 Safety & Insurance Features
- Provide incident reporting interface:
  - Accident report form
  - Theft/loss report form
  - Upload photos and evidence
- Display emergency SOS button for immediate assistance
- Show safety tips and guidelines
- Support both light and dark mode

#### 3.6.8 Switch Back to Customer Mode
- Provide toggle to return to Customer Mode navigation

### 3.7 Admin Panel

#### 3.7.1 Dashboard Overview
- Display platform-wide metrics: total users, active orders, revenue
- Show real-time activity feed
- Display pending disputes and verification requests
- Support both light and dark mode

#### 3.7.2 User Management
- List all registered users with search and filter
- Display user details, activity history, verification status
- Provide actions: suspend, ban, verify
- Support both light and dark mode

#### 3.7.3 Vendor Management
- List all vendors with search and filter
- Display vendor details, subscription tier, earnings
- Provide actions: approve, suspend, upgrade tier
- Support both light and dark mode

#### 3.7.4 Rider Verification & Approval
- Display pending rider verification requests
- Show submitted documents and information
- Provide actions: approve, reject, request additional documents
- Support both light and dark mode

#### 3.7.5 Dispute Resolution Workflow
- Display all active disputes with priority levels
- Show dispute details, submitted evidence, involved parties
- Provide resolution actions:
  - Release payment
  - Issue refund
  - Partial settlement
  - Escalate to manual review
- Record resolution notes and outcomes
- Support both light and dark mode

#### 3.7.6 Platform Analytics
- Display comprehensive analytics: user growth, order volume, revenue trends
- Show vendor performance metrics
- Display rider efficiency and earnings data
- Provide export functionality for reports
- Support both light and dark mode

#### 3.7.7 Geofencing Configuration
- Display map interface to define campus boundaries for each Nigerian university
- Set GPS accuracy validation thresholds
- Configure delivery zone restrictions per campus
- Support both light and dark mode

#### 3.7.8 Campus Management
- List all Nigerian universities/campuses in the platform
- Add new campuses with name, location, geofencing boundaries
- Edit campus details and settings
- View campus-specific metrics: active users, vendors, riders
- Support both light and dark mode

#### 3.7.9 System Settings
- Configure platform-wide settings: commission rates, delivery fees, loyalty point rates
- Manage payment gateway integrations
- Set notification templates
- Configure language options
- Support both light and dark mode

### 3.8 Universal Screens

#### 3.8.1 Campus Indicator & Switcher
- Display selected campus name in persistent indicator in top navigation bar
- Provide quick-access campus switcher button in top navigation bar
- When clicked, open campus selection interface:
  - Search bar for Nigerian universities
  - List of available campuses
  - Current campus highlighted
- Save new campus selection to user profile
- Refresh all content to reflect new campus context
- Support both light and dark mode

#### 3.8.2 Theme Mode Toggle (Light/Dark)
- Display theme mode toggle icon in top navigation bar for quick access
- Provide theme mode toggle in Profile page settings
- Auto-detect device's preferred color scheme on first launch
- Save user's mode preference to profile
- Apply smooth transition animation when switching modes
- Support both light and dark mode across all pages, components, modals, overlays, dashboards, vendor interfaces
- Use modern, professional, campus-friendly color palette for both modes

#### 3.8.3 Real-Time Chat Interface
- Provide chat threads between customers, vendors, and riders
- Display message history with timestamps
- Show online/offline status indicators
- Provide text input and send button
- Support image sharing
- Display unread message badges
- Support both light and dark mode

#### 3.8.4 Notification Hub
- Display bell-icon page with notifications:
  - Transactional alerts
  - Delivery ETA milestones
  - Errand matching notifications
  - Promotional offers
  - Chat messages
- Show notification timestamp and details
- Support push notifications for mobile devices
- Support both light and dark mode

#### 3.8.5 Rating & Review Submission
- Provide star rating selector (1-5 stars)
- Provide text area for written review
- Display rating categories: Food Quality, Delivery Speed, Rider Courtesy
- Provide \"Submit Review\" button
- Support both light and dark mode

#### 3.8.6 Dispute Resolution Overlay
- Accessible from any active or historical order
- Provide issue reporting options:
  - \"Item Not Received\"
  - \"Damaged Cargo\"
  - \"Runner Inaccessible\"
  - \"Wrong Item\"
  - \"Quality Issue\"
- Allow user to submit description of issue
- Provide photo upload for evidence
- Freeze escrow/payment for admin review upon submission
- Support both light and dark mode

#### 3.8.7 Language Selector
- Provide toggle between English and Yoruba
- Apply selected language across entire platform
- Save language preference to user profile
- Support both light and dark mode

#### 3.8.8 Accessibility Settings
- Provide screen reader support toggle
- Provide high contrast mode toggle
- Provide large text option with size selector
- Save accessibility preferences to user profile
- Support both light and dark mode

#### 3.8.9 Campus Event Bulk Order Interface
- Provide special interface for event organizers
- Display form fields:
  - Event name and date
  - Number of attendees
  - Menu selection for catering
  - Delivery location and time
- Show bulk pricing and discounts
- Provide \"Request Quote\" button
- Display vendor responses and quotes
- Support both light and dark mode

### 3.9 Payment Integration

#### 3.9.1 Paystack Gateway
- Integrate Paystack API for card and bank payments
- Support payment methods: Card, Bank Transfer, USSD
- Handle payment callbacks and confirmations

#### 3.9.2 Flutterwave Gateway
- Integrate Flutterwave API for card and bank payments
- Support payment methods: Card, Bank Transfer, USSD, Mobile Money
- Handle payment callbacks and confirmations

## 4. Business Rules and Logic

### 4.1 Campus Selection and Context Filtering
- On first app launch, display Campus Selection Screen before landing page
- Auto-detect user's location in Nigeria and suggest nearest university campus
- User selects campus, which becomes global context filter
- Selected campus determines:
  - Vendors/canteens visible in marketplace
  - Hostels available in checkout location dropdown
  - Errands/tasks shown in errand hub
  - Riders/runners available for jobs
  - Campus-specific landmarks in search placeholders
  - All content, vendors, riders, community feed posts scoped to campus
- Selected campus displayed prominently in app header and top navigation bar
- User can change campus anytime from Profile settings or top navigation bar campus switcher
- Campus change refreshes all content to reflect new campus context
- University of Ibadan is primary/default campus
- Platform designed to scale to all Nigerian universities

### 4.2 Theme Mode (Light/Dark)
- System auto-detects device's preferred color scheme on first launch
- User can toggle between light and dark mode from Profile page or top navigation bar
- User's mode preference saved to profile and persists across sessions
- Smooth transition animation applied when switching modes
- All pages, components, modals, overlays, dashboards, vendor interfaces support both modes
- Color palette for both modes is modern, professional, and campus-friendly

### 4.3 Order Processing Flow
- Customer places order → Vendor receives notification → Vendor accepts and prepares order → Rider accepts delivery job → Rider picks up from vendor using QR code verification → Rider delivers to customer → Customer confirms receipt using QR code → Payment released to vendor and rider → Customer prompted to rate and review

### 4.4 Errand Escrow System
- When customer posts errand, payout fee is held in escrow
- Runner accepts task and completes it
- Both customer and runner must verify completion
- Funds released to runner after mutual verification

### 4.5 Rider Mode Toggle
- Users can switch between Customer Mode and Rider Mode via profile toggle
- Navigation tabs dynamically change based on active mode
- User retains single account with dual role capabilities

### 4.6 Smart Batching for Riders
- System detects multiple orders with same destination hostel
- Notifies rider with batching opportunity banner
- Rider can accept multiple jobs for efficient delivery
- Route optimization algorithm calculates shortest path for batched deliveries

### 4.7 Third-Party Gift Orders
- Customer can toggle \"Sending this to someone else?\"
- System requires recipient's hostel and phone number
- Delivery instructions and notifications sent to recipient instead of customer

### 4.8 Payment Processing
- Wallet/Credits: deducted immediately, order confirmed
- Paystack/Flutterwave: processed immediately, order confirmed upon successful payment
- Direct Bank Transfer: customer receives bank details, order confirmed after vendor verifies transfer

### 4.9 Vendor Inventory Management
- Food vendors toggle menu items as Available/Sold Out in real-time
- Retail vendors update stock counts in inventory matrix
- Items with zero stock or marked Sold Out are hidden from customer marketplace
- Vendors auto-marked unavailable outside scheduled hours

### 4.10 Dispute Handling
- Dispute submission freezes payment/escrow
- Admin reviews submitted evidence and descriptions
- Resolution results in payment release, refund, or partial settlement

### 4.11 Loyalty Points System
- Customers earn points per order based on order value
- Points can be redeemed for discounts or free delivery
- Points have expiration dates displayed in loyalty rewards section

### 4.12 Referral Program
- Users receive unique referral code upon registration
- Referrer earns bonus credits when referred user completes first order
- Referred user receives welcome discount

### 4.13 Promotional Campaigns
- Vendors create campaigns with discount percentages or fixed amounts
- Flash sales have time limits and auto-expire
- Promo codes have usage limits and expiration dates
- Discounts applied automatically at checkout

### 4.14 Rider Verification Process
- Rider submits documents via onboarding interface
- Admin reviews documents and approves/rejects
- Approved riders receive verification badge and can accept jobs
- Rejected riders notified with reasons and can resubmit

### 4.15 Geofencing and GPS Validation
- System restricts deliveries to selected campus boundaries
- GPS accuracy validated to ensure rider location precision
- Orders outside geofenced area are rejected

### 4.16 Scheduled Orders
- Customers can schedule orders up to 3 days ahead
- Vendors notified of scheduled orders in advance
- Orders automatically dispatched at scheduled time

### 4.17 Group Orders and Split Payment
- Order initiator generates shareable link
- Group members contribute via link
- Payment split equally or by custom amounts
- Order placed when all contributions received

### 4.18 Multi-Vendor Cart
- Customers add items from multiple vendors in single cart
- System consolidates delivery if vendors in same location
- Separate delivery fees calculated per vendor

### 4.19 Subscription Meals
- Food vendors offer weekly meal plans
- Customers subscribe and receive recurring deliveries
- Payments auto-deducted from wallet/credits
- Subscriptions can be paused or cancelled

### 4.20 QR Code Verification
- Vendor generates QR code for order pickup
- Rider scans QR code to confirm pickup
- Customer shows QR code to rider for contactless handoff
- System records verification timestamps

### 4.21 Real-Time Chat
- Chat threads created automatically when order placed
- Participants: customer, vendor, rider
- Messages delivered in real-time
- Unread message badges displayed in notification hub

### 4.22 Rating and Review System
- Customers rate vendors and riders after order completion
- Star ratings (1-5) and written reviews submitted
- Average ratings displayed on vendor/rider profiles
- Vendors can respond to reviews

### 4.23 Advanced Analytics
- Vendors with premium subscription access predictive insights
- Analytics include sales forecasting, peak times, customer trends
- Data updated in real-time

### 4.24 Push Notifications
- System sends push notifications for order updates, errand matches, delivery ETAs
- Users can enable/disable notifications in settings
- Notifications delivered to mobile devices

### 4.25 Route Optimization
- Automated algorithm calculates shortest path for deliveries
- Considers campus roads, traffic, and multiple stops
- Updates route dynamically based on rider location

### 4.26 Vendor Subscription Tiers
- Basic (Free): Standard features
- Premium: Advanced analytics, promotional tools, priority support
- Vendors can upgrade/downgrade tiers
- Billing processed monthly

### 4.27 Student Verification Badge
- Students verify status via Matric Number validation
- Verified students receive badge displayed on profile
- Badge increases trust for errand postings and rider services

### 4.28 Rider Leaderboard
- Top earners of the week displayed in rider portal
- Rankings updated daily
- Leaderboard motivates rider performance

### 4.29 Safety and Insurance
- Riders can report incidents via safety interface
- Emergency SOS button alerts platform support
- Incident reports reviewed by admin

### 4.30 Accessibility Features
- Screen reader support for visually impaired users
- High contrast mode for better visibility
- Large text option for readability
- Settings saved to user profile

### 4.31 Multi-Language Support
- Platform supports English and Yoruba
- Users select preferred language
- All interface elements translated

### 4.32 Campus Event Bulk Orders
- Event organizers request quotes for catering
- Vendors respond with pricing and availability
- Bulk discounts applied automatically
- Special delivery arrangements for large orders

## 5. Exceptions and Edge Cases

| Scenario | Handling |
|----------|----------|
| User changes campus after placing order | Active orders remain tied to original campus, new orders use new campus context |
| Campus location detection fails | System prompts manual campus selection from list |
| User selects campus outside Nigeria | System displays error message, restricts selection to Nigerian universities |
| Theme mode toggle fails to apply | System retries, falls back to last saved preference |
| Device color scheme changes while app open | System detects change and prompts user to update theme preference |
| Customer cancels order after vendor accepts | Vendor notified, order marked as cancelled, no payment processed, cancellation fee may apply |
| Rider cannot locate customer at delivery | Rider uses \"Call Customer\" button, if unresolved, marks issue in dispute overlay |
| Vendor runs out of stock mid-order | Vendor contacts customer via chat, offers substitution or cancellation |
| Runner does not complete accepted errand | Customer can report via dispute overlay, escrow refunded after review |
| Customer does not verify errand completion | System auto-releases payment to runner after 24-hour timeout |
| Payment fails during checkout | Customer notified, order not placed, prompted to retry payment |
| Rider accepts job but does not pick up | Vendor can reassign job to another rider after 15-minute timeout |
| Customer provides incorrect hostel/room details | Rider contacts customer via call button or chat, updates delivery location if needed |
| Promo code invalid or expired | System displays error message, prompts customer to remove or enter valid code |
| Loyalty points insufficient for redemption | System displays error message, shows required points balance |
| Group order payment incomplete | Order not placed until all contributions received, initiator notified of pending payments |
| Scheduled order time conflicts with vendor availability | System notifies customer, prompts to reschedule or cancel |
| Rider outside geofenced campus boundary | System prevents job acceptance, displays boundary restriction message |
| GPS accuracy below threshold | System alerts rider to improve location accuracy, delays delivery confirmation |
| Chat message fails to send | System retries sending, displays error if persistent failure |
| Push notification not delivered | System logs failure, retries on next app open |
| Vendor subscription payment fails | System notifies vendor, downgrades to basic tier after grace period |
| Rider verification documents rejected | Admin provides rejection reasons, rider can resubmit corrected documents |
| Customer disputes after QR code verification | Admin reviews QR scan timestamps and evidence, resolves based on findings |
| Multi-vendor cart delivery coordination fails | System splits deliveries, notifies customer of separate arrival times |
| Subscription meal delivery missed | System notifies customer, offers refund or reschedule |

## 6. Acceptance Criteria

1. User launches app for first time, Campus Selection Screen appears before landing page
2. System auto-detects user's location in Nigeria, suggests nearest university campus
3. User selects University of Ibadan campus, campus name displayed in app header
4. User registers with email or Matric Number, completes student verification, receives Student Verification Badge
5. User browses marketplace filtered by University of Ibadan, views flash deals, selects food item from canteen
6. User customizes order using Build Your Plate Modal, adds to cart
7. User proceeds to checkout, hostel dropdown shows only University of Ibadan hostels
8. User completes payment, order is placed
9. Vendor receives notification, accepts order, marks as ready
10. Rider accepts delivery job with route optimized for University of Ibadan campus roads
11. Rider delivers to customer, customer confirms receipt via QR code
12. Customer rates vendor and rider, submits review
13. User switches to dark mode from Profile page, entire app transitions to dark theme with smooth animation
14. User changes campus to another Nigerian university from Profile settings, all content refreshes to show new campus vendors, hostels, errands
15. Admin reviews platform analytics, approves pending rider verification, resolves active dispute

## 7. Out of Scope for This Release

- Integration with external logistics providers beyond campus riders
- Cryptocurrency payment options
- AI-powered chatbot for customer support
- Augmented reality (AR) menu visualization
- Voice-activated ordering
- Integration with university academic systems (e.g., class schedules)
- Automated inventory restocking alerts to suppliers
- White-label platform for other universities
- Advanced fraud detection algorithms
- Blockchain-based transaction verification
- Integration with third-party food delivery aggregators
- Vendor performance-based dynamic commission rates
- Customer credit scoring system
- Rider vehicle tracking and maintenance logs
- Automatic campus detection based on IP address or GPS without user confirmation
- Custom theme color palettes beyond light and dark modes
- Scheduled theme mode switching (e.g., auto-switch to dark mode at sunset)




npx shadcn@latest init Select "New York" style, "Slate" as your base color, and "Yes" for CSS variables.



