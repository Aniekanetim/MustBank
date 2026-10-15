// Development uses the corrected implementation. Each packaged build contains
// its own concrete payment-policy.mjs, with no alternate implementation.
export { paymentPolicy } from './policies/fixed.mjs';
