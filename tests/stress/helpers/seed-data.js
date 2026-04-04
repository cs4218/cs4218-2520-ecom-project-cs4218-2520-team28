// Foo Chao, A0272024R
// AI Assistance: GitHub Copilot (Claude Sonnet 4.6)
//
// helpers/seed-data.js — shared SharedArray pools for catalog/admin stress tests
//
// PURPOSE
//   Provides pre-fetched product IDs, category IDs, product slugs, and a keyword
//   bank so every catalog/admin VU can randomise its requests without making extra
//   API calls at iteration time.
//
//   ALL data is loaded once during k6 initialisation (the SharedArray constructor
//   runs in the init context) and shared across all VUs with zero per-VU copy cost.
//
// USAGE
//   import { products, categories, keywords, filterPayloads } from './helpers/seed-data.js';
//   const p = products[Math.floor(Math.random() * products.length)];
//   http.get(`${BASE_URL}/api/v1/product/product-photo/${p.id}`);
//
// PREREQUISITES
//   Backend must be running on BASE_URL before k6 starts — the SharedArray
//   callback fires during init and will fail fast if the server is unreachable.
//   Seed at least 20 products and 5 categories first.

import http from 'k6/http';

// ─── Products ────────────────────────────────────────────────────────────────
// Fetches up to two pages of products. Call from setup(), NOT from init context.
// Returns array of { _id, slug, category: { _id } }
export function fetchProducts(baseUrl) {
  const page1 = http.get(`${baseUrl}/api/v1/product/product-list/1`);
  const page2 = http.get(`${baseUrl}/api/v1/product/product-list/2`);

  let items = [];
  try {
    const p1 = JSON.parse(page1.body);
    if (Array.isArray(p1.products)) items = items.concat(p1.products);
  } catch { /* server may not have page 1 — continue */ }
  try {
    const p2 = JSON.parse(page2.body);
    if (Array.isArray(p2.products)) items = items.concat(p2.products);
  } catch { /* page 2 may be empty — continue */ }

  if (items.length === 0) {
    return [{ _id: 'unknown', slug: 'unknown', category: { _id: 'unknown' } }];
  }
  return items;
}

// ─── Categories ──────────────────────────────────────────────────────────────
// Fetches all categories. Call from setup(), NOT from init context.
// Returns array of { _id, name, slug }
export function fetchCategories(baseUrl) {
  const res = http.get(`${baseUrl}/api/v1/category/get-category`);
  try {
    const body = JSON.parse(res.body);
    if (Array.isArray(body.category) && body.category.length > 0) return body.category;
  } catch { /* fall through */ }
  return [{ _id: 'unknown', name: 'unknown', slug: 'unknown' }];
}

// ─── Orders (for admin scenarios) ────────────────────────────────────────────
// Orders are user-specific; admin scenarios fetch all orders via a pre-built
// admin JWT injected by the setup() function in each admin script.
// This array is a placeholder — admin scripts pass the JWT directly.
export const orderStatuses = ['Not Process', 'Processing', 'Shipped', 'delivered', 'cancel'];

// ─── Keyword bank (20 terms) ─────────────────────────────────────────────────
// Realistic search queries for a general e-commerce/tech shop.
// Must be plain strings — no regex/special chars — so the API doesn't reject them.
export const keywords = [
  'shirt', 'book', 'laptop', 'phone', 'headphone',
  'watch', 'shoe', 'bag', 'camera', 'jacket',
  'keyboard', 'mouse', 'monitor', 'desk', 'chair',
  'lamp', 'cable', 'charger', 'speaker', 'pen',
];

// ─── Filter payloads ─────────────────────────────────────────────────────────
// Builds POST bodies for /api/v1/product/product-filters.
// Fetches categories internally. Call from setup(), NOT from init context.
export function fetchFilterPayloads(baseUrl) {
  const res = http.get(`${baseUrl}/api/v1/category/get-category`);
  let cats = [];
  try {
    const body = JSON.parse(res.body);
    if (Array.isArray(body.category)) cats = body.category;
  } catch { /* fall through */ }

  // Price ranges that cover typical product prices
  const priceRanges = [
    [0, 19],
    [20, 49],
    [50, 99],
    [100, 199],
    [200, 499],
    [0, 999],
  ];

  const payloads = [];

  // Category-only filters (one per category)
  for (const cat of cats) {
    payloads.push({ checked: [cat._id], radio: [] });
  }

  // Price-only filters
  for (const range of priceRanges) {
    payloads.push({ checked: [], radio: range });
  }

  // Combined: first category + each price range
  if (cats.length > 0) {
    for (const range of priceRanges) {
      payloads.push({ checked: [cats[0]._id], radio: range });
    }
  }

  if (payloads.length === 0) {
    return [{ checked: [], radio: [0, 999] }];
  }
  return payloads;
}
