export interface OrderClientResponse {
  message: string;
  orderId: string;
  status: string;
}

export class OrderClient {
  constructor(private remoteEndpoint: string) {}

  async processOrder(userId: string, productId: string, quantity: number) {
    const response = await fetch(`${this.remoteEndpoint}/api/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-user-id": userId,
      },
      body: JSON.stringify({ productId, quantity }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.code || "REMOTE_SERVICE_ERROR");
    }

    const data = (await response.json()) as {
      success: boolean;
      data?: OrderClientResponse;
      error?: { code?: string };
    };

    if (!data.success || !data.data) {
      throw new Error(data.error?.code || "REMOTE_SERVICE_ERROR");
    }

    return data.data;
  }
}
