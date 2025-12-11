# Security Documentation

## Overview

This document outlines security best practices implemented in the SOYL Supabase Ecommerce Demo and recommendations for production deployment.

## Authentication & Authorization

### User Authentication

- **Supabase Auth**: Handles user registration, login, password reset
- **JWT Tokens**: Secure, stateless authentication
- **Session Management**: Handled by Supabase client SDK

### Admin Authorization

- **Role-Based Access**: Admin users have `role = 'admin'` in `profiles` table
- **Server-Side Verification**: All admin operations verify role in Netlify Functions
- **Database Function**: `is_admin()` checks user role via RLS

```sql
CREATE OR REPLACE FUNCTION is_admin() RETURNS boolean AS $$
  SELECT exists (
    SELECT 1 FROM profiles p 
    WHERE p.id = auth.uid() AND p.role = 'admin'
  );
$$ LANGUAGE SQL STABLE;
```

### API Security

- **Service Role Key**: Only used in server-side Netlify Functions
- **Never Exposed**: Service role key never sent to client
- **Token Verification**: All admin endpoints verify JWT token

## Row Level Security (RLS)

### Policies

All tables have RLS enabled with appropriate policies:

**Public Access**:
- `products`: SELECT (read-only)
- `product_images`: SELECT (read-only)
- `embeddings`: SELECT (for chatbot queries)

**Authenticated Users**:
- `orders`: INSERT (create orders)
- `events`: INSERT (track events)

**Admin Only**:
- All tables: Full CRUD access via `is_admin()` check

### Policy Examples

```sql
-- Public can read products
CREATE POLICY "anon_can_read_products" ON products
  FOR SELECT USING (true);

-- Authenticated users can create orders
CREATE POLICY "auth_can_insert_orders" ON orders
  FOR INSERT USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Admin can modify products
CREATE POLICY "admin_can_modify_products" ON products
  FOR ALL USING (is_admin()) WITH CHECK (is_admin());
```

## Environment Variables

### Client-Safe Variables

These are exposed to the browser (prefixed with `NEXT_PUBLIC_`):
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Server-Only Variables

Never exposed to client:
- `SUPABASE_SERVICE_ROLE_KEY` ⚠️ **CRITICAL**
- `OPENAI_API_KEY`
- `PGVECTOR_DIMENSION`

### Storage

- **Netlify**: Store in Netlify dashboard → Environment variables
- **Local**: Use `.env.local` (gitignored)
- **Never Commit**: Add to `.gitignore`

## Input Validation

### Client-Side

- HTML5 form validation
- TypeScript type checking
- React form libraries (optional)

### Server-Side

- Validate all inputs in Netlify Functions
- Sanitize user input
- Type checking with TypeScript
- SQL injection prevention (Supabase client handles this)

### Example

```typescript
// Validate coupon code
if (!code || typeof code !== 'string' || code.length > 20) {
  return { error: 'Invalid coupon code' };
}

// Sanitize input
const sanitizedCode = code.toUpperCase().trim();
```

## Rate Limiting

### Chatbot Endpoint

- **Limit**: 10 requests per minute per IP
- **Window**: 60 seconds
- **Implementation**: In-memory map (use Redis in production)

```typescript
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const RATE_LIMIT_MAX = 10;
```

### Production Recommendations

- Use Redis for distributed rate limiting
- Implement per-user rate limits (not just IP)
- Add CAPTCHA for abuse-prone endpoints

## Security Headers

Configured in `next.config.js`:

- **CSP**: Content Security Policy
- **HSTS**: HTTP Strict Transport Security
- **X-Frame-Options**: Prevent clickjacking
- **X-Content-Type-Options**: Prevent MIME sniffing
- **X-XSS-Protection**: XSS protection

```javascript
async headers() {
  return [{
    source: '/:path*',
    headers: [
      { key: 'Strict-Transport-Security', value: 'max-age=63072000' },
      { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
      { key: 'Content-Security-Policy', value: '...' },
    ]
  }];
}
```

## Secret Management

### Rotation Schedule

- **Service Role Key**: Rotate every 90 days
- **OpenAI API Key**: Rotate if compromised
- **Admin Passwords**: Enforce strong passwords, 2FA recommended

### Rotation Process

1. Generate new key in Supabase dashboard
2. Update environment variable in Netlify
3. Redeploy application
4. Revoke old key after verification

### Admin Onboarding

1. Create admin user via seed script or Supabase dashboard
2. Set `role = 'admin'` in profiles table
3. Require password change on first login
4. Enable 2FA (recommended)

## SQL Injection Prevention

- **Supabase Client**: Uses parameterized queries
- **Never Use**: Raw SQL with user input
- **RLS**: Additional layer of protection

### Safe Example

```typescript
// ✅ Safe: Supabase client handles parameterization
const { data } = await supabase
  .from('products')
  .select('*')
  .eq('slug', userInput);
```

### Unsafe Example

```typescript
// ❌ Never do this
const query = `SELECT * FROM products WHERE slug = '${userInput}'`;
```

## XSS Prevention

- **React**: Automatically escapes content
- **Sanitization**: Sanitize user-generated content
- **CSP**: Content Security Policy prevents inline scripts

### Safe Rendering

```tsx
// ✅ Safe: React escapes by default
<div>{product.description}</div>

// ✅ Safe: Use dangerouslySetInnerHTML only with sanitized content
<div dangerouslySetInnerHTML={{ __html: sanitizedHtml }} />
```

## CSRF Protection

- **SameSite Cookies**: Supabase Auth uses SameSite cookies
- **CORS**: Configured in Netlify Functions
- **Origin Validation**: Verify request origin (optional)

## Data Privacy

### Personal Data

- **Minimal Collection**: Only collect necessary data
- **Encryption**: Data encrypted at rest (Supabase)
- **GDPR Compliance**: Implement data export/deletion (if required)

### Payment Data

- **Never Store**: Credit card numbers, CVV
- **Use Gateway**: Integrate Stripe/Razorpay (PCI compliant)
- **Tokenization**: Store payment tokens only

## Monitoring & Alerts

### Security Events to Monitor

- Failed login attempts
- Unauthorized admin access attempts
- Unusual API usage patterns
- Database query anomalies

### Alert Channels

- **Slack**: Webhook for critical alerts
- **Email**: Admin notifications
- **Sentry**: Error tracking (optional)

### Logging

- Log all admin actions to `events` table
- Include user ID, timestamp, action type
- Retain logs for 90 days (compliance)

## Checklist for Production

- [ ] All RLS policies enabled and tested
- [ ] Service role key secured in Netlify (never in Git)
- [ ] Admin passwords are strong and rotated
- [ ] Security headers configured
- [ ] Rate limiting implemented
- [ ] Input validation on all endpoints
- [ ] Error messages don't leak sensitive info
- [ ] HTTPS enforced (Netlify auto-provisions)
- [ ] Database backups configured (Supabase)
- [ ] Monitoring and alerts set up
- [ ] Security audit completed
- [ ] Penetration testing (recommended)

## Incident Response

### If Service Role Key is Compromised

1. **Immediately**: Rotate key in Supabase dashboard
2. **Update**: Environment variable in Netlify
3. **Redeploy**: Application
4. **Audit**: Review access logs for unauthorized access
5. **Notify**: Affected users if data was accessed

### If Database is Breached

1. **Isolate**: Disable affected services
2. **Assess**: Determine scope of breach
3. **Notify**: Users and authorities (if required)
4. **Remediate**: Fix vulnerabilities
5. **Restore**: From backup if needed

## Additional Resources

- [Supabase Security Best Practices](https://supabase.com/docs/guides/platform/security)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Next.js Security](https://nextjs.org/docs/app/building-your-application/configuring/security-headers)

## Questions?

For security concerns, please contact the development team or open a GitHub issue.

