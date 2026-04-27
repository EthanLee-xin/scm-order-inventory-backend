async function runHighConcurrencyTest() {
  console.log("High Concurrency start...");

  const url = "http://localhost:3000/api/orders";
  const payload = {
    productId: "PROD_IPHONE_15",
    quantity: 1,
  };

  // 5 concurrency requests
  const requests = Array.from({ length: 5 }).map((_, index) => {
    return fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-user-id": "USER_999", // same user
      },
      body: JSON.stringify(payload),
    }).then(async (res) => {
      const data = await res.json();
      console.log(
        `[Request ${index + 1}] Status: ${res.status} | Response:`,
        data,
      );
    });
  });

  // send 5 requests in 1ms
  await Promise.all(requests);
  console.log("High Concurrency test stop.");
}

runHighConcurrencyTest();
