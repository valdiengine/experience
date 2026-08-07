/**
 * Migration: 0005_business_layer
 * Layer: Business (Layer 5)
 * Tables: accommodations, accommodation_units, availability, availability_rules,
 *         reservations, reservation_activities, payments, invoices,
 *         reviews, review_helpfulness, business_notifications, notification_preferences
 * Dependencies: 0001_platform_foundation (tenants), 0003_company_layer (companies),
 *               0004_identity_layer (users)
 */

export async function up(provider) {
  await provider.execute(`
    -- ============================================
    -- ACCOMMODATIONS
    -- ============================================
    CREATE TABLE IF NOT EXISTS accommodations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
      company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
      owner_id UUID,
      name VARCHAR(255) NOT NULL,
      slug VARCHAR(100) NOT NULL UNIQUE,
      type VARCHAR(50) DEFAULT 'hotel',
      status VARCHAR(50) DEFAULT 'draft',
      description TEXT,
      short_description VARCHAR(500),
      images JSONB DEFAULT '[]',
      gallery JSONB DEFAULT '[]',
      location JSONB DEFAULT '{}',
      contact JSONB DEFAULT '{}',
      amenities JSONB DEFAULT '[]',
      policies JSONB DEFAULT '{}',
      rooms JSONB DEFAULT '[]',
      pricing JSONB DEFAULT '{}',
      inventory JSONB DEFAULT '{}',
      seo JSONB DEFAULT '{}',
      branding JSONB DEFAULT '{}',
      rating DECIMAL(3, 2),
      review_count INTEGER DEFAULT 0,
      metadata JSONB DEFAULT '{}',
      settings JSONB DEFAULT '{}',
      published_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      deleted_at TIMESTAMPTZ,
      created_by UUID,
      updated_by UUID
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_accommodation_slug ON accommodations(slug);
    CREATE INDEX IF NOT EXISTS idx_accommodation_tenant_id ON accommodations(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_accommodation_company_id ON accommodations(company_id);
    CREATE INDEX IF NOT EXISTS idx_accommodation_category_id ON accommodations(category_id);
    CREATE INDEX IF NOT EXISTS idx_accommodation_owner_id ON accommodations(owner_id);
    CREATE INDEX IF NOT EXISTS idx_accommodation_type ON accommodations(type);
    CREATE INDEX IF NOT EXISTS idx_accommodation_status ON accommodations(status);
    CREATE INDEX IF NOT EXISTS idx_accommodation_deleted_at ON accommodations(deleted_at);

    -- ============================================
    -- ACCOMMODATION UNITS
    -- ============================================
    CREATE TABLE IF NOT EXISTS accommodation_units (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      accommodation_id UUID NOT NULL REFERENCES accommodations(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      slug VARCHAR(100) NOT NULL UNIQUE,
      type VARCHAR(50) DEFAULT 'room',
      description TEXT,
      images JSONB DEFAULT '[]',
      max_guests INTEGER DEFAULT 2,
      bedrooms INTEGER DEFAULT 1,
      bathrooms INTEGER DEFAULT 1,
      beds JSONB DEFAULT '[]',
      amenities JSONB DEFAULT '[]',
      pricing JSONB DEFAULT '{}',
      inventory JSONB DEFAULT '{}',
      status VARCHAR(50) DEFAULT 'active',
      sort_order INTEGER DEFAULT 0,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_accommodation_unit_slug ON accommodation_units(slug);
    CREATE INDEX IF NOT EXISTS idx_accommodation_unit_accommodation_id ON accommodation_units(accommodation_id);
    CREATE INDEX IF NOT EXISTS idx_accommodation_unit_type ON accommodation_units(type);
    CREATE INDEX IF NOT EXISTS idx_accommodation_unit_status ON accommodation_units(status);

    -- ============================================
    -- AVAILABILITY
    -- ============================================
    CREATE TABLE IF NOT EXISTS availability (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
      accommodation_id UUID NOT NULL REFERENCES accommodations(id) ON DELETE CASCADE,
      date VARCHAR(20) NOT NULL,
      status VARCHAR(50) DEFAULT 'available',
      is_blocked BOOLEAN DEFAULT false,
      is_reserved BOOLEAN DEFAULT false,
      min_stay INTEGER,
      max_stay INTEGER,
      arrival_days JSONB DEFAULT '[]',
      departure_days JSONB DEFAULT '[]',
      price JSONB DEFAULT '{}',
      inventory INTEGER DEFAULT 1,
      reserved_count INTEGER DEFAULT 0,
      metadata JSONB DEFAULT '{}',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_availability_accommodation_date ON availability(accommodation_id, date);
    CREATE INDEX IF NOT EXISTS idx_availability_tenant_id ON availability(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_availability_status ON availability(status);
    CREATE INDEX IF NOT EXISTS idx_availability_is_blocked ON availability(is_blocked);

    -- ============================================
    -- AVAILABILITY RULES
    -- ============================================
    CREATE TABLE IF NOT EXISTS availability_rules (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
      accommodation_id UUID REFERENCES accommodations(id) ON DELETE CASCADE,
      name VARCHAR(255) NOT NULL,
      type VARCHAR(50) NOT NULL,
      config JSONB DEFAULT '{}',
      priority INTEGER DEFAULT 0,
      start_date VARCHAR(20),
      end_date VARCHAR(20),
      days_of_week JSONB DEFAULT '[]',
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_availability_rule_tenant_id ON availability_rules(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_availability_rule_accommodation_id ON availability_rules(accommodation_id);
    CREATE INDEX IF NOT EXISTS idx_availability_rule_type ON availability_rules(type);
    CREATE INDEX IF NOT EXISTS idx_availability_rule_is_active ON availability_rules(is_active);

    -- ============================================
    -- RESERVATIONS
    -- ============================================
    CREATE TABLE IF NOT EXISTS reservations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
      accommodation_id UUID NOT NULL REFERENCES accommodations(id) ON DELETE RESTRICT,
      user_id UUID REFERENCES users(id) ON DELETE SET NULL,
      visitor_id UUID,
      status VARCHAR(50) NOT NULL DEFAULT 'pending',
      confirmation_code VARCHAR(50) NOT NULL UNIQUE,
      check_in_date VARCHAR(20) NOT NULL,
      check_out_date VARCHAR(20) NOT NULL,
      check_in_time VARCHAR(20),
      check_out_time VARCHAR(20),
      guest_count INTEGER DEFAULT 1,
      adults INTEGER DEFAULT 1,
      children INTEGER DEFAULT 0,
      infants INTEGER DEFAULT 0,
      pets INTEGER DEFAULT 0,
      subtotal DECIMAL(12, 2),
      taxes DECIMAL(12, 2),
      fees DECIMAL(12, 2),
      discount DECIMAL(12, 2),
      total_price DECIMAL(12, 2),
      currency VARCHAR(3) DEFAULT 'USD',
      channel VARCHAR(50),
      customer JSONB DEFAULT '{}',
      guest_details JSONB DEFAULT '{}',
      special_requests TEXT,
      internal_notes TEXT,
      metadata JSONB DEFAULT '{}',
      expires_at TIMESTAMPTZ,
      confirmed_at TIMESTAMPTZ,
      cancelled_at TIMESTAMPTZ,
      checked_in_at TIMESTAMPTZ,
      checked_out_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      deleted_at TIMESTAMPTZ
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_reservation_confirmation_code ON reservations(confirmation_code);
    CREATE INDEX IF NOT EXISTS idx_reservation_tenant_id ON reservations(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_reservation_accommodation_id ON reservations(accommodation_id);
    CREATE INDEX IF NOT EXISTS idx_reservation_user_id ON reservations(user_id);
    CREATE INDEX IF NOT EXISTS idx_reservation_visitor_id ON reservations(visitor_id);
    CREATE INDEX IF NOT EXISTS idx_reservation_status ON reservations(status);
    CREATE INDEX IF NOT EXISTS idx_reservation_check_in_date ON reservations(check_in_date);
    CREATE INDEX IF NOT EXISTS idx_reservation_check_out_date ON reservations(check_out_date);
    CREATE INDEX IF NOT EXISTS idx_reservation_channel ON reservations(channel);

    -- ============================================
    -- RESERVATION ACTIVITIES
    -- ============================================
    CREATE TABLE IF NOT EXISTS reservation_activities (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      reservation_id UUID NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
      activity_type VARCHAR(50) NOT NULL,
      description TEXT,
      actor_id UUID,
      actor_type VARCHAR(50),
      old_status VARCHAR(50),
      new_status VARCHAR(50),
      metadata JSONB DEFAULT '{}',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_reservation_activity_reservation_id ON reservation_activities(reservation_id);
    CREATE INDEX IF NOT EXISTS idx_reservation_activity_type ON reservation_activities(activity_type);

    -- ============================================
    -- PAYMENTS
    -- ============================================
    CREATE TABLE IF NOT EXISTS payments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
      reservation_id UUID REFERENCES reservations(id) ON DELETE SET NULL,
      user_id UUID REFERENCES users(id) ON DELETE SET NULL,
      amount DECIMAL(12, 2) NOT NULL,
      currency VARCHAR(3) NOT NULL DEFAULT 'USD',
      status VARCHAR(50) NOT NULL DEFAULT 'pending',
      type VARCHAR(50) DEFAULT 'payment',
      method VARCHAR(50),
      provider VARCHAR(50),
      provider_reference VARCHAR(255),
      provider_transaction_id VARCHAR(255),
      gateway_response JSONB DEFAULT '{}',
      customer JSONB DEFAULT '{}',
      billing_details JSONB DEFAULT '{}',
      metadata JSONB DEFAULT '{}',
      refunded_amount DECIMAL(12, 2) DEFAULT '0',
      refund_reason TEXT,
      refunded_at TIMESTAMPTZ,
      processed_at TIMESTAMPTZ,
      failed_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      deleted_at TIMESTAMPTZ
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_provider_reference ON payments(provider_reference) WHERE provider_reference IS NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_payment_tenant_id ON payments(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_payment_reservation_id ON payments(reservation_id);
    CREATE INDEX IF NOT EXISTS idx_payment_user_id ON payments(user_id);
    CREATE INDEX IF NOT EXISTS idx_payment_status ON payments(status);
    CREATE INDEX IF NOT EXISTS idx_payment_type ON payments(type);
    CREATE INDEX IF NOT EXISTS idx_payment_method ON payments(method);

    -- ============================================
    -- INVOICES
    -- ============================================
    CREATE TABLE IF NOT EXISTS invoices (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
      invoice_number VARCHAR(50) NOT NULL UNIQUE,
      reservation_id UUID REFERENCES reservations(id) ON DELETE SET NULL,
      customer_id UUID,
      status VARCHAR(50) DEFAULT 'draft',
      issue_date TIMESTAMPTZ,
      due_date TIMESTAMPTZ,
      subtotal DECIMAL(12, 2),
      tax DECIMAL(12, 2),
      total DECIMAL(12, 2),
      currency VARCHAR(3) DEFAULT 'USD',
      items JSONB DEFAULT '[]',
      customer_details JSONB DEFAULT '{}',
      metadata JSONB DEFAULT '{}',
      paid_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_invoice_number ON invoices(invoice_number);
    CREATE INDEX IF NOT EXISTS idx_invoice_tenant_id ON invoices(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_invoice_reservation_id ON invoices(reservation_id);
    CREATE INDEX IF NOT EXISTS idx_invoice_status ON invoices(status);

    -- ============================================
    -- REVIEWS
    -- ============================================
    CREATE TABLE IF NOT EXISTS reviews (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE RESTRICT,
      accommodation_id UUID NOT NULL REFERENCES accommodations(id) ON DELETE CASCADE,
      reservation_id UUID REFERENCES reservations(id) ON DELETE SET NULL,
      user_id UUID REFERENCES users(id) ON DELETE SET NULL,
      visitor_id UUID,
      rating DECIMAL(3, 2) NOT NULL,
      title VARCHAR(255),
      content TEXT,
      categories JSONB DEFAULT '{}',
      pros JSONB DEFAULT '[]',
      cons JSONB DEFAULT '[]',
      images JSONB DEFAULT '[]',
      status VARCHAR(50) DEFAULT 'pending',
      is_verified BOOLEAN DEFAULT false,
      is_featured BOOLEAN DEFAULT false,
      helpful_count INTEGER DEFAULT 0,
      response JSONB DEFAULT '{}',
      metadata JSONB DEFAULT '{}',
      published_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      deleted_at TIMESTAMPTZ
    );

    CREATE INDEX IF NOT EXISTS idx_review_tenant_id ON reviews(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_review_accommodation_id ON reviews(accommodation_id);
    CREATE INDEX IF NOT EXISTS idx_review_reservation_id ON reviews(reservation_id);
    CREATE INDEX IF NOT EXISTS idx_review_user_id ON reviews(user_id);
    CREATE INDEX IF NOT EXISTS idx_review_visitor_id ON reviews(visitor_id);
    CREATE INDEX IF NOT EXISTS idx_review_status ON reviews(status);
    CREATE INDEX IF NOT EXISTS idx_review_rating ON reviews(rating);
    CREATE INDEX IF NOT EXISTS idx_review_is_verified ON reviews(is_verified);
    CREATE INDEX IF NOT EXISTS idx_review_published_at ON reviews(published_at);

    -- ============================================
    -- REVIEW HELPFULNESS
    -- ============================================
    CREATE TABLE IF NOT EXISTS review_helpfulness (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      review_id UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
      user_id UUID REFERENCES users(id) ON DELETE SET NULL,
      is_helpful BOOLEAN NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_review_helpfulness_review_user ON review_helpfulness(review_id, user_id);
    CREATE INDEX IF NOT EXISTS idx_review_helpfulness_review_id ON review_helpfulness(review_id);
    CREATE INDEX IF NOT EXISTS idx_review_helpfulness_user_id ON review_helpfulness(user_id);

    -- ============================================
    -- BUSINESS NOTIFICATIONS
    -- ============================================
    CREATE TABLE IF NOT EXISTS business_notifications (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
      user_id UUID REFERENCES users(id) ON DELETE SET NULL,
      reservation_id UUID REFERENCES reservations(id) ON DELETE SET NULL,
      recipient_id UUID,
      recipient_type VARCHAR(50),
      type VARCHAR(100) NOT NULL,
      channel VARCHAR(50) DEFAULT 'in_app',
      priority VARCHAR(20) DEFAULT 'normal',
      subject VARCHAR(255),
      title VARCHAR(255),
      content JSONB DEFAULT '{}',
      body TEXT,
      data JSONB DEFAULT '{}',
      status VARCHAR(50) NOT NULL DEFAULT 'pending',
      scheduled_at TIMESTAMPTZ,
      sent_at TIMESTAMPTZ,
      delivered_at TIMESTAMPTZ,
      read_at TIMESTAMPTZ,
      failed_at TIMESTAMPTZ,
      failure_reason TEXT,
      retry_count INTEGER DEFAULT 0,
      metadata JSONB DEFAULT '{}',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      deleted_at TIMESTAMPTZ
    );

    CREATE INDEX IF NOT EXISTS idx_business_notification_tenant_id ON business_notifications(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_business_notification_user_id ON business_notifications(user_id);
    CREATE INDEX IF NOT EXISTS idx_business_notification_recipient_id ON business_notifications(recipient_id);
    CREATE INDEX IF NOT EXISTS idx_business_notification_reservation_id ON business_notifications(reservation_id);
    CREATE INDEX IF NOT EXISTS idx_business_notification_type ON business_notifications(type);
    CREATE INDEX IF NOT EXISTS idx_business_notification_channel ON business_notifications(channel);
    CREATE INDEX IF NOT EXISTS idx_business_notification_status ON business_notifications(status);
    CREATE INDEX IF NOT EXISTS idx_business_notification_priority ON business_notifications(priority);
    CREATE INDEX IF NOT EXISTS idx_business_notification_scheduled_at ON business_notifications(scheduled_at);
    CREATE INDEX IF NOT EXISTS idx_business_notification_sent_at ON business_notifications(sent_at);
    CREATE INDEX IF NOT EXISTS idx_business_notification_read_at ON business_notifications(read_at);

    -- ============================================
    -- NOTIFICATION PREFERENCES
    -- ============================================
    CREATE TABLE IF NOT EXISTS notification_preferences (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
      email BOOLEAN DEFAULT true,
      sms BOOLEAN DEFAULT false,
      push BOOLEAN DEFAULT true,
      whatsapp BOOLEAN DEFAULT false,
      in_app BOOLEAN DEFAULT true,
      reservation_confirmations BOOLEAN DEFAULT true,
      reservation_reminders BOOLEAN DEFAULT true,
      reservation_cancellations BOOLEAN DEFAULT true,
      marketing BOOLEAN DEFAULT false,
      newsletter BOOLEAN DEFAULT false,
      digest BOOLEAN DEFAULT false,
      frequency VARCHAR(20) DEFAULT 'instant',
      quiet_hours_start VARCHAR(10),
      quiet_hours_end VARCHAR(10),
      metadata JSONB DEFAULT '{}',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_notification_preference_user_id ON notification_preferences(user_id);
    CREATE INDEX IF NOT EXISTS idx_notification_preference_email ON notification_preferences(email);
    CREATE INDEX IF NOT EXISTS idx_notification_preference_frequency ON notification_preferences(frequency);

    -- Migration tracking
    INSERT INTO _drizzle_migrations (name, hash, executed_at)
    VALUES ('0005_business_layer', gen_random_uuid(), NOW())
    ON CONFLICT DO NOTHING;
  `)
}

export async function down(provider) {
  await provider.execute(`
    DROP TABLE IF EXISTS notification_preferences CASCADE;
    DROP TABLE IF EXISTS business_notifications CASCADE;
    DROP TABLE IF EXISTS review_helpfulness CASCADE;
    DROP TABLE IF EXISTS reviews CASCADE;
    DROP TABLE IF EXISTS invoices CASCADE;
    DROP TABLE IF EXISTS payments CASCADE;
    DROP TABLE IF EXISTS reservation_activities CASCADE;
    DROP TABLE IF EXISTS reservations CASCADE;
    DROP TABLE IF EXISTS availability_rules CASCADE;
    DROP TABLE IF EXISTS availability CASCADE;
    DROP TABLE IF EXISTS accommodation_units CASCADE;
    DROP TABLE IF EXISTS accommodations CASCADE;
    DELETE FROM _drizzle_migrations WHERE name = '0005_business_layer';
  `)
}

export default { up, down }
