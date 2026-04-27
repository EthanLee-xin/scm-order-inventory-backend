import jwt from "jsonwebtoken";

const JWT_SECRET = "123";
const MOCK_USER_ID = "USER_888";

const token = jwt.sign({ id: MOCK_USER_ID }, JWT_SECRET, { expiresIn: "1h" });
console.log(
  `✅ Token generated successfully: Bearer ${token.substring(0, 20)}...\n`,
);

const API_ENDPOINT = "http://localhost:3000/api/orders";
const CONCURRENT_REQUESTS = 20; // simulate concurrency requests
const PRODUCT_ID = "IPHONE_15_PRO";

async function sendSingleRequest(requestIndex) {
  try {
    const response = await fetch(API_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        productId: PRODUCT_ID,
        quantity: 1,
      }),
    });

    const data = await response.json();

    if (response.status === 202) {
      return `[Request ${requestIndex}] 🟢 Entered into gateway! OrderId: ${data.orderId}`;
    } else if (response.status === 400) {
      return `[Request ${requestIndex}] 🟡 Interception: ${data.error || "out of stock"}`;
    } else if (response.status === 429) {
      return `[Request ${requestIndex}] 🔴 Rate limitation: Request too fast`;
    } else {
      return `[Request ${requestIndex}] ❌ Failure: ${response.status} - ${JSON.stringify(data)}`;
    }
  } catch (error) {
    return `[Request ${requestIndex}]: ${error.message}`;
  }
}

async function startLoadTest() {
  console.log(`Send ${CONCURRENT_REQUESTS} requests...`);
  const startTime = Date.now();

  const requests = Array.from({ length: CONCURRENT_REQUESTS }, (_, i) =>
    sendSingleRequest(i + 1),
  );

  const results = await Promise.all(requests);

  const endTime = Date.now();

  results.forEach((res) => console.log(res));

  console.log(`\n Test Finish! Time: ${endTime - startTime} ms`);
}

startLoadTest();
