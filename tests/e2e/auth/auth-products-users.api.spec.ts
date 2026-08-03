import { expect, test } from "@playwright/test";

test("auth normal protege y habilita CRUD de products/users @critical @smoke", async ({
  request,
}) => {
  const suffix = Date.now();
  const email = `e2e-${suffix}@rimac.com`;
  const password = "super-secure-password";
  const sku = `SKU-${suffix}`;

  const unauthorizedProducts = await request.get("/products");
  expect(unauthorizedProducts.status()).toBe(401);

  const registerResponse = await request.post("/auth/register", {
    data: {
      email,
      full_name: "Usuario E2E",
      password,
    },
  });
  expect(registerResponse.status()).toBe(201);

  const registerBody = (await registerResponse.json()) as {
    access_token: string;
    user: { email: string };
  };
  expect(registerBody.user.email).toBe(email);
  expect(registerBody.access_token.length).toBeGreaterThan(20);
  expect(registerBody).not.toHaveProperty("refresh_token");

  const registerSetCookie = registerResponse.headers()["set-cookie"] ?? "";
  expect(registerSetCookie).toContain("HttpOnly");
  expect(registerSetCookie).toContain("SameSite=Lax");
  expect(registerSetCookie).toContain("Path=/auth");

  const refreshResponse = await request.post("/auth/refresh", {
    data: {},
  });
  expect(refreshResponse.status()).toBe(200);

  const refreshBody = (await refreshResponse.json()) as {
    access_token: string;
  };
  expect(refreshBody.access_token.length).toBeGreaterThan(20);
  expect(refreshBody).not.toHaveProperty("refresh_token");
  const refreshSetCookie = refreshResponse.headers()["set-cookie"] ?? "";
  expect(refreshSetCookie).toContain("HttpOnly");
  expect(refreshSetCookie).toContain("SameSite=Lax");
  expect(refreshSetCookie).toContain("Path=/auth");
  expect(refreshSetCookie).not.toBe(registerSetCookie);

  const loginResponse = await request.post("/auth/login", {
    data: {
      email,
      password,
    },
  });
  expect(loginResponse.status()).toBe(200);

  const loginBody = (await loginResponse.json()) as { access_token: string };
  const headers = {
    Authorization: `Bearer ${loginBody.access_token}`,
  };

  const productResponse = await request.post("/products", {
    data: {
      sku,
      nombre: "Producto E2E",
      descripcion: "Una descripcion de prueba",
      precio: "149.90",
      stock: 7,
    },
    headers,
  });
  expect(productResponse.status()).toBe(201);

  const productBody = (await productResponse.json()) as {
    product: { id: number; precio: string; sku: string };
  };
  expect(productBody.product.sku).toBe(sku);
  expect(productBody.product.precio).toBe("149.90");

  const uploadResponse = await request.post("/uploads/presigned-url", {
    data: {
      file_name: "producto.csv",
      mime_type: "text/csv",
      purpose: "document",
      size_bytes: 1024,
    },
    headers,
  });
  expect(uploadResponse.status()).toBe(201);

  const uploadBody = (await uploadResponse.json()) as {
    upload: {
      headers: Record<string, string>;
      key: string;
      method: string;
      url: string;
    };
  };
  expect(uploadBody.upload.method).toBe("PUT");
  expect(uploadBody.upload.headers["content-type"]).toBe("text/csv");
  expect(uploadBody.upload.key).toMatch(/^uploads\/document\//);
  expect(uploadBody.upload.url).toContain("X-Amz-Signature");

  const productsResponse = await request.get(`/products?search=${sku}&limit=10&offset=0`, {
    headers,
  });
  expect(productsResponse.status()).toBe(200);

  const productsBody = (await productsResponse.json()) as {
    results: Array<{ sku: string }>;
  };
  expect(productsBody.results).toContainEqual(expect.objectContaining({ sku }));

  const usersResponse = await request.get(`/users?search=${email}`, {
    headers,
  });
  expect(usersResponse.status()).toBe(403);

  const adminLoginResponse = await request.post("/auth/login", {
    data: {
      email: "admin.local@rimac.test",
      password: "AdminPassword2026!",
    },
  });
  expect(adminLoginResponse.status()).toBe(200);

  const adminLoginBody = (await adminLoginResponse.json()) as { access_token: string };
  const adminUsersResponse = await request.get(`/users?search=${email}`, {
    headers: { Authorization: `Bearer ${adminLoginBody.access_token}` },
  });
  expect(adminUsersResponse.status()).toBe(200);

  const usersBody = (await adminUsersResponse.json()) as {
    results: Array<{ email: string; password_hash?: string }>;
  };
  expect(usersBody.results).toContainEqual(expect.objectContaining({ email }));
  expect(usersBody.results[0]?.password_hash).toBeUndefined();

  const logoutResponse = await request.post("/auth/logout", { data: {} });
  expect(logoutResponse.status()).toBe(200);
  const logoutSetCookie = logoutResponse.headers()["set-cookie"] ?? "";
  expect(logoutSetCookie).toContain("HttpOnly");
  expect(logoutSetCookie).toContain("Expires=Thu, 01 Jan 1970 00:00:00 GMT");
});
