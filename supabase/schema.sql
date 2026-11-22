-- ==============================================================================
-- SAGA DELIVERY PLATFORM - PHASE 1 DATABASE SCHEMA & SEED DATA
-- Minimalist White & Emerald Green (#10B981) Multi-Cafe Architecture
-- ==============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Clean up existing objects if re-running
DROP TABLE IF EXISTS wallet_transactions CASCADE;
DROP TABLE IF EXISTS wallets CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS menu_items CASCADE;
DROP TABLE IF EXISTS cafes CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

DROP TYPE IF EXISTS transaction_status CASCADE;
DROP TYPE IF EXISTS transaction_type CASCADE;
DROP TYPE IF EXISTS payment_status CASCADE;
DROP TYPE IF EXISTS order_status CASCADE;
DROP TYPE IF EXISTS kyc_status CASCADE;
DROP TYPE IF EXISTS user_role CASCADE;

-- ------------------------------------------------------------------------------
-- 1. ENUMS & DOMAINS
-- ------------------------------------------------------------------------------
CREATE TYPE user_role AS ENUM ('customer', 'cafe_owner', 'rider', 'admin', 'platform');
CREATE TYPE kyc_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE order_status AS ENUM ('placed', 'confirmed', 'preparing', 'ready_for_pickup', 'out_for_delivery', 'delivered', 'cancelled');
CREATE TYPE payment_status AS ENUM ('pending', 'paid', 'failed', 'refunded');
CREATE TYPE transaction_type AS ENUM (
    'merchant_credit',
    'merchant_payout',
    'settlement_release',
    'rider_earning',
    'rider_payout',
    'commission_deduction',
    'refund'
);
CREATE TYPE transaction_status AS ENUM ('held', 'available', 'settled', 'withdrawn', 'cancelled');

-- ------------------------------------------------------------------------------
-- 2. PROFILES TABLE (Roles, Phone & WhatsApp Auth Verification)
-- ------------------------------------------------------------------------------
CREATE TABLE profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role user_role NOT NULL DEFAULT 'customer',
    full_name TEXT NOT NULL,
    email TEXT,
    phone TEXT NOT NULL UNIQUE,
    whatsapp_number TEXT NOT NULL,
    is_phone_verified BOOLEAN NOT NULL DEFAULT false,
    is_whatsapp_verified BOOLEAN NOT NULL DEFAULT false,
    is_online BOOLEAN NOT NULL DEFAULT true,
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for lookup & phone authentication
CREATE INDEX idx_profiles_phone ON profiles(phone);
CREATE INDEX idx_profiles_whatsapp ON profiles(whatsapp_number);
CREATE INDEX idx_profiles_role ON profiles(role);

-- ------------------------------------------------------------------------------
-- 3. CAFES TABLE (Multi-Cafe KYC, Commission & Operating Status)
-- ------------------------------------------------------------------------------
CREATE TABLE cafes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    tagline TEXT,
    description TEXT,
    address TEXT NOT NULL,
    city TEXT NOT NULL DEFAULT 'Bengaluru',
    latitude NUMERIC(10, 7),
    longitude NUMERIC(10, 7),
    banner_url TEXT,
    logo_url TEXT,
    rating NUMERIC(2, 1) NOT NULL DEFAULT 4.8,
    rating_count INTEGER NOT NULL DEFAULT 0,
    delivery_time_min INTEGER NOT NULL DEFAULT 25,
    min_order_amount_inr NUMERIC(10, 2) NOT NULL DEFAULT 200.00, -- ₹200 platform minimum order value
    kyc_status kyc_status NOT NULL DEFAULT 'pending',
    fssai_number TEXT,
    gstin_number TEXT,
    fssai_doc_url TEXT,
    gstin_doc_url TEXT,
    rejection_reason TEXT,
    commission_rate NUMERIC(5, 2) NOT NULL DEFAULT 15.00, -- 15% platform commission
    is_open BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_cafes_slug ON cafes(slug);
CREATE INDEX idx_cafes_kyc_status ON cafes(kyc_status);
CREATE INDEX idx_cafes_is_open ON cafes(is_open);

-- ------------------------------------------------------------------------------
-- 4. MENU ITEMS TABLE (Categories, Dietary Flags, INR Pricing)
-- ------------------------------------------------------------------------------
CREATE TABLE menu_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cafe_id UUID NOT NULL REFERENCES cafes(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    price_inr NUMERIC(10, 2) NOT NULL CHECK (price_inr >= 0),
    category TEXT NOT NULL,
    image_url TEXT NOT NULL,
    is_veg BOOLEAN NOT NULL DEFAULT true,
    is_available BOOLEAN NOT NULL DEFAULT true,
    preparation_time_min INTEGER NOT NULL DEFAULT 15,
    tags TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_menu_items_cafe ON menu_items(cafe_id);
CREATE INDEX idx_menu_items_category ON menu_items(category);
CREATE INDEX idx_menu_items_is_available ON menu_items(is_available);

-- ------------------------------------------------------------------------------
-- 5. ORDERS TABLE (JSONB Items, Multi-Actor Order Flow & Breakdown)
-- ------------------------------------------------------------------------------
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number TEXT NOT NULL UNIQUE,
    customer_id UUID NOT NULL REFERENCES profiles(id),
    cafe_id UUID NOT NULL REFERENCES cafes(id),
    rider_id UUID REFERENCES profiles(id),
    items JSONB NOT NULL, -- Array of [{ menu_item_id, name, price_inr, quantity, instructions }]
    subtotal_inr NUMERIC(10, 2) NOT NULL,
    delivery_fee_inr NUMERIC(10, 2) NOT NULL DEFAULT 30.00,
    platform_fee_inr NUMERIC(10, 2) NOT NULL DEFAULT 5.00,
    total_amount_inr NUMERIC(10, 2) NOT NULL,
    status order_status NOT NULL DEFAULT 'placed',
    delivery_address JSONB NOT NULL, -- { recipient_name, phone, street, building, landmark, postal_code }
    special_instructions TEXT,
    payment_status payment_status NOT NULL DEFAULT 'pending',
    payment_method TEXT NOT NULL DEFAULT 'upi',
    payment_order_id TEXT,
    payment_session_id TEXT,
    delivery_otp TEXT,
    pickup_photo_url TEXT,
    delivery_photo_url TEXT,
    pickup_timestamp TIMESTAMPTZ,
    delivery_timestamp TIMESTAMPTZ,
    estimated_delivery_minutes INTEGER DEFAULT 25,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_orders_customer ON orders(customer_id);
CREATE INDEX idx_orders_cafe ON orders(cafe_id);
CREATE INDEX idx_orders_rider ON orders(rider_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);

-- ------------------------------------------------------------------------------
-- 6. WALLETS & TRANSACTIONS (3-Day Escrow Settlement Hold & Rider Earnings)
-- ------------------------------------------------------------------------------
CREATE TABLE wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
    role user_role NOT NULL,
    cafe_id UUID REFERENCES cafes(id) ON DELETE SET NULL,
    balance_inr NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    on_hold_balance_inr NUMERIC(12, 2) NOT NULL DEFAULT 0.00, -- 3-day settlement holds
    total_earned_inr NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    total_withdrawn_inr NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_wallets_user ON wallets(user_id);
CREATE INDEX idx_wallets_cafe ON wallets(cafe_id);

CREATE TABLE wallet_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
    order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
    amount_inr NUMERIC(10, 2) NOT NULL,
    type transaction_type NOT NULL,
    status transaction_status NOT NULL DEFAULT 'held',
    settlement_hold_until TIMESTAMPTZ, -- Set to NOW() + INTERVAL '3 days' for merchant credits
    settled_at TIMESTAMPTZ,
    description TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_wallet_tx_wallet ON wallet_transactions(wallet_id);
CREATE INDEX idx_wallet_tx_status ON wallet_transactions(status);
CREATE INDEX idx_wallet_tx_hold_until ON wallet_transactions(settlement_hold_until);

-- ------------------------------------------------------------------------------
-- 7. AUTOMATIC TIMESTAMP TRIGGER
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_cafes_updated_at BEFORE UPDATE ON cafes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_menu_items_updated_at BEFORE UPDATE ON menu_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_wallets_updated_at BEFORE UPDATE ON wallets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_wallet_transactions_updated_at BEFORE UPDATE ON wallet_transactions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ------------------------------------------------------------------------------
-- 8. 3-DAY SETTLEMENT RELEASE FUNCTION
-- Releases on-hold merchant balances after 72 hours
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION release_matured_merchant_settlements()
RETURNS INTEGER AS $$
DECLARE
    matured_record RECORD;
    released_count INTEGER := 0;
BEGIN
    FOR matured_record IN
        SELECT wt.id, wt.wallet_id, wt.amount_inr
        FROM wallet_transactions wt
        WHERE wt.status = 'held'
          AND wt.settlement_hold_until IS NOT NULL
          AND wt.settlement_hold_until <= NOW()
    LOOP
        -- Move funds from on_hold_balance_inr to balance_inr
        UPDATE wallets
        SET on_hold_balance_inr = on_hold_balance_inr - matured_record.amount_inr,
            balance_inr = balance_inr + matured_record.amount_inr,
            updated_at = NOW()
        WHERE id = matured_record.wallet_id;

        -- Mark transaction as settled
        UPDATE wallet_transactions
        SET status = 'settled',
            settled_at = NOW(),
            updated_at = NOW()
        WHERE id = matured_record.id;

        released_count := released_count + 1;
    END LOOP;

    RETURN released_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ------------------------------------------------------------------------------
-- 9. ROW LEVEL SECURITY (RLS) POLICIES
-- ------------------------------------------------------------------------------
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE cafes ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;

-- Current user helper function
CREATE OR REPLACE FUNCTION current_profile_id()
RETURNS UUID AS $$
    SELECT COALESCE(
        auth.uid(),
        NULLIF(current_setting('app.current_user_id', true), '')::UUID
    );
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION current_profile_role()
RETURNS user_role AS $$
    SELECT role FROM profiles WHERE id = current_profile_id();
$$ LANGUAGE sql STABLE;

-- PROFILES POLICIES
CREATE POLICY "Public profiles can be read"
    ON profiles FOR SELECT
    USING (true);

CREATE POLICY "Users can edit own profile"
    ON profiles FOR UPDATE
    USING (id = current_profile_id() OR current_profile_role() = 'admin');

CREATE POLICY "Users can create profile"
    ON profiles FOR INSERT
    WITH CHECK (true);

-- CAFES POLICIES
CREATE POLICY "Approved cafes are publicly visible"
    ON cafes FOR SELECT
    USING (kyc_status = 'approved' OR owner_id = current_profile_id() OR current_profile_role() = 'admin');

CREATE POLICY "Cafe owners can update their own cafe"
    ON cafes FOR UPDATE
    USING (owner_id = current_profile_id() OR current_profile_role() = 'admin');

CREATE POLICY "Admins can manage cafes"
    ON cafes FOR ALL
    USING (current_profile_role() = 'admin');

-- MENU ITEMS POLICIES
CREATE POLICY "Available menu items are publicly visible"
    ON menu_items FOR SELECT
    USING (
        is_available = true 
        OR cafe_id IN (SELECT id FROM cafes WHERE owner_id = current_profile_id())
        OR current_profile_role() = 'admin'
    );

CREATE POLICY "Cafe owners manage their menu items"
    ON menu_items FOR ALL
    USING (
        cafe_id IN (SELECT id FROM cafes WHERE owner_id = current_profile_id())
        OR current_profile_role() = 'admin'
    );

-- ORDERS POLICIES
CREATE POLICY "Customers view own orders"
    ON orders FOR SELECT
    USING (
        customer_id = current_profile_id()
        OR cafe_id IN (SELECT id FROM cafes WHERE owner_id = current_profile_id())
        OR rider_id = current_profile_id()
        OR current_profile_role() = 'admin'
    );

CREATE POLICY "Customers can place orders"
    ON orders FOR INSERT
    WITH CHECK (
        customer_id = current_profile_id()
        OR current_profile_id() IS NULL -- Allowed during checkout / guest onboarding
    );

CREATE POLICY "Stakeholders can update order status"
    ON orders FOR UPDATE
    USING (
        cafe_id IN (SELECT id FROM cafes WHERE owner_id = current_profile_id())
        OR rider_id = current_profile_id()
        OR current_profile_role() = 'admin'
    );

-- WALLETS POLICIES
CREATE POLICY "Users view own wallet"
    ON wallets FOR SELECT
    USING (user_id = current_profile_id() OR current_profile_role() = 'admin');

CREATE POLICY "Admins manage wallets"
    ON wallets FOR ALL
    USING (current_profile_role() = 'admin');

-- WALLET TRANSACTIONS POLICIES
CREATE POLICY "Users view own wallet transactions"
    ON wallet_transactions FOR SELECT
    USING (
        wallet_id IN (SELECT id FROM wallets WHERE user_id = current_profile_id())
        OR current_profile_role() = 'admin'
    );

CREATE POLICY "System/Admins insert wallet transactions"
    ON wallet_transactions FOR INSERT
    WITH CHECK (true);

-- ------------------------------------------------------------------------------
-- 10. REALISTIC SEED DATA (Bangalore Multi-Cafe Network)
-- ------------------------------------------------------------------------------

-- Seed Profiles: Cafe Owners, Riders, Customers, Admin
INSERT INTO profiles (id, role, full_name, phone, whatsapp_number, is_phone_verified, is_whatsapp_verified, avatar_url) VALUES
('11111111-1111-4111-a111-111111111111', 'admin', 'SAGA Central Ops', '+919999900000', '+919999900000', true, true, 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'),
('22222222-2222-4222-a222-222222222222', 'cafe_owner', 'Rohan Mehta', '+919880011223', '+919880011223', true, true, 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150'),
('33333333-3333-4333-a333-333333333333', 'cafe_owner', 'Ananya Rao', '+919880022334', '+919880022334', true, true, 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150'),
('44444444-4444-4444-a444-444444444444', 'cafe_owner', 'Kabir Sen', '+919880033445', '+919880033445', true, true, 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150'),
('55555555-5555-4555-a555-555555555555', 'cafe_owner', 'Priya Nambiar', '+919880044556', '+919880044556', true, true, 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150'),
('66666666-6666-4666-a666-666666666666', 'rider', 'Vikram Singh', '+919770055667', '+919770055667', true, true, 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150'),
('77777777-7777-4777-a777-777777777777', 'rider', 'Rahul Verma', '+919770066778', '+919770066778', true, true, 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150'),
('88888888-8888-4888-a888-888888888888', 'customer', 'Arjun Nair', '+919900012345', '+919900012345', true, true, 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150'),
('99999999-9999-4999-a999-999999999999', 'customer', 'Neha Sharma', '+919900023456', '+919900023456', true, true, 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150');

-- Seed Cafes: Multi-Storefront Network in Bengaluru
INSERT INTO cafes (id, owner_id, name, slug, tagline, description, address, city, latitude, longitude, banner_url, logo_url, rating, rating_count, delivery_time_min, min_order_amount_inr, kyc_status, commission_rate, is_open) VALUES
(
    'c1111111-1111-4111-b111-111111111111',
    '22222222-2222-4222-a222-222222222222',
    'Saga Cafe - Koramangala',
    'saga-koramangala',
    'Artisan Sourdough Pizzas & Specialty Roast',
    'Hand-tossed slow-fermented crusts, fresh mozzarella, and farm-to-table Italian ingredients in the heart of 4th Block.',
    '80 Feet Rd, 4th Block, Koramangala, Bengaluru, Karnataka 560034',
    'Bengaluru',
    12.934533,
    77.626579,
    'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1200',
    'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=200',
    4.9,
    412,
    25,
    200.00,
    'approved',
    15.00,
    true
),
(
    'c2222222-2222-4222-b222-222222222222',
    '33333333-3333-4333-a333-333333333333',
    'Saga Cafe - Indiranagar',
    'saga-indiranagar',
    'Gourmet Brioche Burgers & Botanical Brews',
    'Signature smashed patties, truffle parmesan frites, and nitro cold brews crafted with premium Arabica single-origin beans.',
    '100 Feet Rd, HAL 2nd Stage, Indiranagar, Bengaluru, Karnataka 560038',
    'Bengaluru',
    12.971891,
    77.641151,
    'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=1200',
    'https://images.unsplash.com/photo-1559925393-8be0ec4767c8?w=200',
    4.8,
    328,
    20,
    200.00,
    'approved',
    15.00,
    true
),
(
    'c3333333-3333-4333-b333-333333333333',
    '44444444-4444-4444-a444-444444444444',
    'Saga Cafe - HSR Layout',
    'saga-hsr',
    'All-Day Artisan Brunch, Paninis & Sweet Treat Bakes',
    'Crispy golden Belgian waffles, loaded club sandwiches, peri peri baskets, and decadent tiramisu jars.',
    '27th Main Rd, Sector 1, HSR Layout, Bengaluru, Karnataka 560102',
    'Bengaluru',
    12.911622,
    77.638863,
    'https://images.unsplash.com/photo-1445116572660-2380a988636b?w=1200',
    'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=200',
    4.9,
    195,
    30,
    200.00,
    'approved',
    15.00,
    true
),
(
    'c4444444-4444-4444-b444-444444444444',
    '55555555-5555-4555-a555-555555555555',
    'Saga Green Roastery - Whitefield',
    'saga-whitefield',
    'Micro-Batch Roastery & Clean Green Deli',
    'Organic bowls, flat whites, poured single origins, and artisan sourdough toasts crafted with green mindfulness.',
    'ITPB Main Rd, Whitefield, Bengaluru, Karnataka 560066',
    'Bengaluru',
    12.986341,
    77.731422,
    'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=1200',
    'https://images.unsplash.com/photo-1442512595331-e89e73853f31?w=200',
    4.7,
    142,
    35,
    200.00,
    'approved',
    15.00,
    false -- Closed right now for evening batch roasting
);

-- Seed Menu Items (Matching Stitch Designs & High-Res Food Photography)
INSERT INTO menu_items (cafe_id, name, description, price_inr, category, image_url, is_veg, is_available, preparation_time_min, tags) VALUES
-- Saga Cafe - Koramangala (Pizzas & Italian)
(
    'c1111111-1111-4111-b111-111111111111',
    'Farm Fresh Pizza',
    'Loaded with fresh crunchy onions, bell peppers, button mushrooms, and charred mozzarella on hand-tossed artisan crust.',
    249.00,
    'Pizza',
    'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800',
    true,
    true,
    18,
    ARRAY['Bestseller', 'Chef Special']
),
(
    'c1111111-1111-4111-b111-111111111111',
    'Paneer Tikka Pizza',
    'Traditional spiced clay-oven paneer cubes, roasted capsicum, charred onions with a fresh mint coriander drizzle.',
    329.00,
    'Pizza',
    'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800',
    true,
    true,
    20,
    ARRAY['Popular', 'Spicy']
),
(
    'c1111111-1111-4111-b111-111111111111',
    'Classic Margherita Pizza',
    'Slow-simmered San Marzano tomato sauce, fresh buffalo mozzarella, aromatic basil leaves, and cold-pressed olive oil.',
    199.00,
    'Pizza',
    'https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?w=800',
    true,
    true,
    15,
    ARRAY['Must Try', 'Classic']
),
(
    'c1111111-1111-4111-b111-111111111111',
    'Peri Peri Fries',
    'Hand-cut golden Idaho potatoes tossed in fiery African bird''s eye chili dust and fragrant sea salt.',
    118.00,
    'Fries',
    'https://images.unsplash.com/photo-1576107232684-1279f3908594?w=800',
    true,
    true,
    10,
    ARRAY['Bestseller', 'Crispy']
),
(
    'c1111111-1111-4111-b111-111111111111',
    'Truffle Parmesan Fries',
    'Crispy golden shoe-string fries infused with white truffle essence, shaved aged parmesan, and cracked black pepper.',
    169.00,
    'Fries',
    'https://images.unsplash.com/photo-1585109649139-366815a0d713?w=800',
    true,
    true,
    12,
    ARRAY['Gourmet']
),
(
    'c1111111-1111-4111-b111-111111111111',
    'Classic Club Sandwich',
    'Triple-decker toasted bread filled with cheddar melt, crunchy garden lettuce, vine tomatoes, and herb garlic aioli.',
    189.00,
    'Sandwich',
    'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=800',
    true,
    true,
    12,
    ARRAY['Healthy']
),
(
    'c1111111-1111-4111-b111-111111111111',
    'Signature Emerald Cold Brew',
    'Slow-steeped for 18 hours using Chikmagalur organic Arabica beans, poured over crystal ice with subtle citrus notes.',
    149.00,
    'Coffee',
    'https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?w=800',
    true,
    true,
    5,
    ARRAY['Signature', 'Beverage']
),
(
    'c1111111-1111-4111-b111-111111111111',
    'Classic Tiramisu Jar',
    'Espresso-soaked savoiardi ladyfingers layered with velvety mascarpone custard and dusted with Dutch cocoa.',
    220.00,
    'Desserts',
    'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=800',
    true,
    true,
    5,
    ARRAY['Sweet Tooth']
),

-- Saga Cafe - Indiranagar (Burgers, Pasta & Cold Brews)
(
    'c2222222-2222-4222-b222-222222222222',
    'Gourmet Truffle Burger',
    'Double-crisped house patty, melted English cheddar, caramelized onions, and black truffle mayo in toasted brioche.',
    289.00,
    'Burger',
    'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800',
    true,
    true,
    18,
    ARRAY['Bestseller', 'Chef Special']
),
(
    'c2222222-2222-4222-b222-222222222222',
    'Spicy Paneer Crunch Burger',
    'Panko-crusted cottage cheese patty, spicy chipotle coleslaw, and jalapeños nestled in a soft sesame brioche bun.',
    239.00,
    'Burger',
    'https://images.unsplash.com/photo-1550547660-d9450f859349?w=800',
    true,
    true,
    15,
    ARRAY['Popular']
),
(
    'c2222222-2222-4222-b222-222222222222',
    'Creamy Pesto Penne Pasta',
    'Al dente penne tossed in house-made Genovese basil pesto, roasted pine nuts, sundried tomatoes, and cream.',
    279.00,
    'Pasta',
    'https://images.unsplash.com/photo-1621996346565-e3d5d628102a?w=800',
    true,
    true,
    20,
    ARRAY['Italian', 'Herbal']
),
(
    'c2222222-2222-4222-b222-222222222222',
    'Iced Spanish Latte',
    'Double espresso shaken with condensed milk and whole milk over cracked ice, finished with cinnamon aroma.',
    179.00,
    'Coffee',
    'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=800',
    true,
    true,
    5,
    ARRAY['Beverage']
),
(
    'c2222222-2222-4222-b222-222222222222',
    'Loaded Nachos Grande',
    'Crisp corn tortilla chips smothered in melted queso, pico de gallo, sour cream, and spicy refried beans.',
    219.00,
    'Combos',
    'https://images.unsplash.com/photo-1513456852971-30c0b8199d4d?w=800',
    true,
    true,
    12,
    ARRAY['Sharing']
),

-- Saga Cafe - HSR Layout (Brunch & Quick Bites)
(
    'c3333333-3333-4333-b333-333333333333',
    'Belgian Dark Chocolate Waffle',
    'Crispy golden waffle grid drenched in 54% Callebaut melted chocolate, toasted hazelnuts, and vanilla gelato.',
    210.00,
    'Desserts',
    'https://images.unsplash.com/photo-1562376552-0d160a2f238d?w=800',
    true,
    true,
    15,
    ARRAY['Sweet', 'Bestseller']
),
(
    'c3333333-3333-4333-b333-333333333333',
    'Saga Special Pizza Combo',
    'Medium Margherita pizza + Large Peri Peri fries + 2 Cold Brews for an unbeatable cafe sharing feast.',
    449.00,
    'Combos',
    'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800',
    true,
    true,
    25,
    ARRAY['Value Deal', 'Feast']
),
(
    'c3333333-3333-4333-b333-333333333333',
    'Spicy Cheese Garlic Bread',
    'Toasted artisan baguette slices topped with rich garlic herb butter, mozzarella blanket, and green chili bits.',
    159.00,
    'Sandwich',
    'https://images.unsplash.com/photo-1573140247632-f8fd74997d5c?w=800',
    true,
    true,
    10,
    ARRAY['Quick Bite']
);

-- Seed Orders (Demonstrating Customer, Cafe, Rider Journey)
INSERT INTO orders (id, order_number, customer_id, cafe_id, rider_id, items, subtotal_inr, delivery_fee_inr, platform_fee_inr, total_amount_inr, status, delivery_address, special_instructions, payment_status, payment_method, created_at) VALUES
(
    'e1111111-1111-4111-c111-111111111111',
    'SAGA-8921',
    '88888888-8888-4888-a888-888888888888',
    'c1111111-1111-4111-b111-111111111111',
    '66666666-6666-4666-a666-666666666666',
    '[
        {"menu_item_id": "item1", "name": "Farm Fresh Pizza", "price_inr": 249.00, "quantity": 1},
        {"menu_item_id": "item4", "name": "Peri Peri Fries", "price_inr": 118.00, "quantity": 1}
    ]'::jsonb,
    367.00,
    30.00,
    5.00,
    402.00,
    'delivered',
    '{"recipient_name": "Arjun Nair", "phone": "+919900012345", "street": "12th Cross, 5th Block", "building": "Palm Grove Apt, Flat 302", "city": "Bengaluru", "postal_code": "560095"}'::jsonb,
    'Please ring the bell twice and leave near the door table.',
    'paid',
    'upi',
    NOW() - INTERVAL '4 days' -- Older order, settled
),
(
    'e2222222-2222-4222-c222-222222222222',
    'SAGA-8945',
    '99999999-9999-4999-a999-999999999999',
    'c1111111-1111-4111-b111-111111111111',
    '66666666-6666-4666-a666-666666666666',
    '[
        {"menu_item_id": "item2", "name": "Paneer Tikka Pizza", "price_inr": 329.00, "quantity": 1},
        {"menu_item_id": "item7", "name": "Signature Emerald Cold Brew", "price_inr": 149.00, "quantity": 1}
    ]'::jsonb,
    478.00,
    30.00,
    5.00,
    513.00,
    'out_for_delivery',
    '{"recipient_name": "Neha Sharma", "phone": "+919900023456", "street": "100 Feet Inner Ring Rd", "building": "Salarpuria Oasis, Tower B 401", "city": "Bengaluru", "postal_code": "560047"}'::jsonb,
    'Make cold brew extra cold, no sugar added.',
    'paid',
    'upi',
    NOW() - INTERVAL '35 minutes' -- Active order currently on hold
);

-- Seed Wallets (Cafe Owners, Riders, Platform)
INSERT INTO wallets (id, user_id, role, cafe_id, balance_inr, on_hold_balance_inr, total_earned_inr, total_withdrawn_inr) VALUES
-- Platform Escrow & Fee Wallet
(
    'f0000000-0000-4000-d000-000000000000',
    '11111111-1111-4111-a111-111111111111',
    'admin',
    NULL,
    25000.00,
    0.00,
    32000.00,
    7000.00
),
-- Rohan Mehta (Saga Koramangala Cafe Owner)
(
    'f1111111-1111-4111-d111-111111111111',
    '22222222-2222-4222-a222-222222222222',
    'cafe_owner',
    'c1111111-1111-4111-b111-111111111111',
    311.95, -- Available balance from matured order SAGA-8921 (367 - 15% commission = 311.95)
    406.30, -- On-hold 3-day balance from active order SAGA-8945 (478 - 15% commission = 406.30)
    718.25,
    0.00
),
-- Ananya Rao (Saga Indiranagar Cafe Owner)
(
    'f2222222-2222-4222-d222-222222222222',
    '33333333-3333-4333-a333-333333333333',
    'cafe_owner',
    'c2222222-2222-4222-b222-222222222222',
    1240.00,
    0.00,
    1240.00,
    0.00
),
-- Vikram Singh (Rider)
(
    'f6666666-6666-4666-d666-666666666666',
    '66666666-6666-4666-a666-666666666666',
    'rider',
    NULL,
    120.00, -- Available rider balance (2 deliveries completed)
    40.00,  -- In-transit delivery earning
    160.00,
    0.00
);

-- Seed Wallet Transactions (3-Day Hold Escrow Tracking & Rider Payouts)
INSERT INTO wallet_transactions (wallet_id, order_id, amount_inr, type, status, settlement_hold_until, settled_at, description, metadata) VALUES
-- 1. SAGA-8921 Matured Order Payout (Placed 4 days ago -> Settled after 3 days)
(
    'f1111111-1111-4111-d111-111111111111',
    'e1111111-1111-4111-c111-111111111111',
    311.95,
    'merchant_credit',
    'settled',
    NOW() - INTERVAL '1 day', -- Settlement hold matured yesterday
    NOW() - INTERVAL '1 day',
    'Merchant net payout for Order #SAGA-8921 (Subtotal ₹367 less 15% platform commission)',
    '{"order_number": "SAGA-8921", "subtotal": 367, "commission_rate": 15, "commission_deducted": 55.05}'::jsonb
),
-- 2. SAGA-8945 Active Order Payout (Placed today -> Held for 3-Day Escrow)
(
    'f1111111-1111-4111-d111-111111111111',
    'e2222222-2222-4222-c222-222222222222',
    406.30,
    'merchant_credit',
    'held',
    NOW() + INTERVAL '3 days', -- Active 3-Day settlement hold timestamp
    NULL,
    'Escrow hold for Order #SAGA-8945 (Matures in 3 days)',
    '{"order_number": "SAGA-8945", "subtotal": 478, "commission_rate": 15, "commission_deducted": 71.70, "escrow_days": 3}'::jsonb
),
-- 3. Rider Earning for SAGA-8921 (Settled)
(
    'f6666666-6666-4666-d666-666666666666',
    'e1111111-1111-4111-c111-111111111111',
    40.00,
    'rider_earning',
    'settled',
    NOW() - INTERVAL '4 days',
    NOW() - INTERVAL '4 days',
    'Delivery fee credit for completed drop #SAGA-8921',
    '{"order_number": "SAGA-8921", "distance_km": 3.2, "incentive": 10}'::jsonb
),
-- 4. Rider Earning for SAGA-8945 (Held until delivered)
(
    'f6666666-6666-4666-d666-666666666666',
    'e2222222-2222-4222-c222-222222222222',
    40.00,
    'rider_earning',
    'held',
    NOW() + INTERVAL '2 hours',
    NULL,
    'Estimated delivery fee for active drop #SAGA-8945',
    '{"order_number": "SAGA-8945", "distance_km": 2.8}'::jsonb
);

-- ------------------------------------------------------------------------------
-- IDEMPOTENT MIGRATIONS FOR EXISTING DATABASES
-- ------------------------------------------------------------------------------
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_otp TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS pickup_photo_url TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_photo_url TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS pickup_timestamp TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_timestamp TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_utr TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_collected_by TEXT DEFAULT 'online';

-- ------------------------------------------------------------------------------
-- BANK ACCOUNTS TABLE & REALTIME PUBLICATION
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS bank_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    cafe_id UUID REFERENCES cafes(id) ON DELETE CASCADE,
    role user_role NOT NULL,
    account_holder_name TEXT NOT NULL,
    bank_name TEXT NOT NULL,
    account_number TEXT NOT NULL,
    ifsc_code TEXT NOT NULL,
    upi_id TEXT,
    account_type TEXT DEFAULT 'Current',
    branch TEXT,
    is_verified BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'bank_accounts' AND policyname = 'Public read bank accounts'
    ) THEN
        CREATE POLICY "Public read bank accounts" ON bank_accounts FOR SELECT USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'bank_accounts' AND policyname = 'Public insert/update bank accounts'
    ) THEN
        CREATE POLICY "Public insert/update bank accounts" ON bank_accounts FOR ALL USING (true);
    END IF;
END $$;

-- ------------------------------------------------------------------------------
-- USER ADDRESSES TABLE & REALTIME PUBLICATION
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS addresses (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    label TEXT NOT NULL DEFAULT 'Home',
    recipient_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    flat_house_no TEXT NOT NULL,
    building_name TEXT NOT NULL,
    area_street TEXT NOT NULL,
    landmark TEXT,
    city TEXT NOT NULL DEFAULT 'Bengaluru',
    postal_code TEXT NOT NULL DEFAULT '560095',
    distance_km NUMERIC(5, 2) NOT NULL DEFAULT 2.8,
    is_default BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE addresses ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'addresses' AND policyname = 'Public read addresses'
    ) THEN
        CREATE POLICY "Public read addresses" ON addresses FOR SELECT USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'addresses' AND policyname = 'Public insert/update addresses'
    ) THEN
        CREATE POLICY "Public insert/update addresses" ON addresses FOR ALL USING (true);
    END IF;
END $$;

-- Enable Supabase Realtime publication
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        BEGIN
            ALTER PUBLICATION supabase_realtime ADD TABLE orders, wallets, wallet_transactions, addresses, bank_accounts;
        EXCEPTION WHEN OTHERS THEN
            NULL;
        END;
    END IF;
END $$;

-- ==============================================================================
-- END OF SCHEMA & SEED DATA
-- ==============================================================================
