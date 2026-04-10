// create-100-products.js
// Run with: node create-100-products.js
// Node 18+ recommended (for built-in fetch/FormData)

// node k6/spike_test/setup/create-test-product.js 

const BASE_URL = 'http://localhost:6060';
const ADMIN_EMAIL = 'admin@example.com';
const ADMIN_PASSWORD = 'Test1234!';

// Change these if your route prefix is different
const LOGIN_URL = `${BASE_URL}/api/v1/auth/login`;
const GET_CATEGORIES_URL = `${BASE_URL}/api/v1/category/get-category`;
const CREATE_PRODUCT_URL = `${BASE_URL}/api/v1/product/create-product`;

const PRODUCT_COUNT = 500;

// If category fetching fails, you can manually paste category IDs here.
// Example:
// const FALLBACK_CATEGORY_IDS = ['66db427fdb0119d9234b27ed', '66db427fdb0119d9234b27ee'];
const FALLBACK_CATEGORY_IDS = [];

async function loginAdmin() {
  const res = await fetch(LOGIN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
    }),
  });

  const data = await safeJson(res);

  if (!res.ok) {
    throw new Error(
      `Login failed: ${res.status} ${res.statusText}\n` +
      JSON.stringify(data, null, 2)
    );
  }

  if (!data?.token) {
    throw new Error(`Login succeeded but no token returned:\n${JSON.stringify(data, null, 2)}`);
  }

  console.log(`Logged in as admin: ${ADMIN_EMAIL}`);
  return data.token;
}

async function getCategories() {
  const res = await fetch(GET_CATEGORIES_URL, {
    method: 'GET',
  });

  const data = await safeJson(res);

  if (!res.ok) {
    throw new Error(
      `Get categories failed: ${res.status} ${res.statusText}\n` +
      JSON.stringify(data, null, 2)
    );
  }

  // Try multiple common response shapes
  let categories = [];

  if (Array.isArray(data)) {
    categories = data;
  } else if (Array.isArray(data?.category)) {
    categories = data.category;
  } else if (Array.isArray(data?.categories)) {
    categories = data.categories;
  } else if (Array.isArray(data?.data)) {
    categories = data.data;
  }

  const categoryIds = categories
    .map((c) => c?._id)
    .filter(Boolean);

  if (categoryIds.length > 0) {
    console.log(`Fetched ${categoryIds.length} categories from backend.`);
    return categoryIds;
  }

  if (FALLBACK_CATEGORY_IDS.length > 0) {
    console.log('Using fallback category IDs.');
    return FALLBACK_CATEGORY_IDS;
  }

  throw new Error(
    `No category IDs found.\nResponse was:\n${JSON.stringify(data, null, 2)}`
  );
}

function buildProduct(index, categoryId) {
  const productNumber = String(index + 1).padStart(3, '0');

  return {
    name: `Spike Test Product ${productNumber}`,
    description: `Seeded product ${productNumber} for spike testing the product listing endpoint.`,
    price: (10 + (index % 25) * 3 + 0.99).toFixed(2), // string is okay for form-data
    category: categoryId,
    quantity: String(20 + (index % 50)),
    shipping: String(index % 2 === 0), // "true" / "false"
  };
}

async function createOneProduct(token, product) {
  const form = new FormData();
  form.append('name', product.name);
  form.append('description', product.description);
  form.append('price', product.price);
  form.append('category', product.category);
  form.append('quantity', product.quantity);
  form.append('shipping', product.shipping);

  const res = await fetch(CREATE_PRODUCT_URL, {
    method: 'POST',
    headers: {
      Authorization: token,
    },
    body: form,
  });

  const data = await safeJson(res);

  if (!res.ok) {
    throw new Error(
      `Create product failed for "${product.name}": ${res.status} ${res.statusText}\n` +
      JSON.stringify(data, null, 2)
    );
  }

  return data;
}

async function main() {
  try {
    const token = await loginAdmin();
    const categoryIds = await getCategories();

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < PRODUCT_COUNT; i++) {
      const categoryId = categoryIds[i % categoryIds.length];
      const product = buildProduct(i, categoryId);

      try {
        const result = await createOneProduct(token, product);
        successCount++;
        console.log(
          `[${successCount}/${PRODUCT_COUNT}] Created: ${product.name}`,
          result?.products?._id ? `ID=${result.products._id}` : ''
        );
      } catch (err) {
        failCount++;
        console.error(`[FAILED] ${product.name}`);
        console.error(err.message);
      }
    }

    console.log('\nDone.');
    console.log(`Success: ${successCount}`);
    console.log(`Failed : ${failCount}`);
  } catch (err) {
    console.error('Fatal error:');
    console.error(err.message);
    process.exit(1);
  }
}

async function safeJson(res) {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

main();