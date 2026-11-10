# Global Counterparty (Seller) Identification Architecture

## 1. Threat Model & Why Simple Identifiers Fail
In agentic commerce systems, trusting client-supplied counterparty identifiers is an acute vulnerability:
- **Display names**: Not unique, easily impersonated ("Elena Rostova" vs "Elena Rostova ").
- **Client-asserted seller IDs**: Any malicious agent or compromised browser client could substitute an attacker's UUID.
- **PayPal Payer IDs**: Payer IDs identify PayPal wallets, not contractual parties, and cannot establish mutual agreement consent.

## 2. Global Standard Solution: Cryptographically Bound Email Invitation Flow
PAYSHARK AI implements a global, high-assurance counterparty binding flow:

1. **Normalized Invitation at Agreement Creation**:
   - Buyer enters `counterparty_email`.
   - The server normalizes the email (`normEmail = email.trim().toLowerCase()`).
   - The server generates a cryptographically secure, 24-byte random token (`randomBytes(24).toString("hex")`).
   - Only the SHA-256 hash of this token is persisted in Neon (`invitation_token_hash`), alongside an expiration timestamp (`invitation_expires_at = now() + 7 days`).
   - The raw invitation token is transmitted securely via invitation link: `/agreements/{id}?invite={token}`.

2. **Verified Identity Claim & Binding**:
   - When the counterparty visits the invitation link, they authenticate with their verified account.
   - The server verifies:
     1. The presented invitation token hash matches the database record.
     2. The invitation has not expired and has not been previously consumed.
     3. The authenticated user's verified email matches `counterparty_email`.
   - If verified, the server atomically updates `seller_id = authenticated_user.id` and invalidates the invitation token.

3. **Mutual Agreement Confirmation**:
   - An agreement remains in `PENDING_CONFIRMATION` until BOTH the buyer and the verified seller explicitly confirm the exact terms of the active version (`version_number`).
   - Only when both parties confirm does the status transition to `ACTIVE`.

4. **Payment Request & PayPal Execution Guard**:
   - Payment requests verify that the counterparty matches the bound `seller_id`.
   - PayPal Sandbox order creation re-verifies that the agreement is `ACTIVE` and that the seller binding is intact.
