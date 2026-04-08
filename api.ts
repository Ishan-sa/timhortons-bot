// src/api.ts
// All Tim Hortons GraphQL API calls

const TH_GATEWAY = "https://use1-prod-th-gateway.rbictg.com/graphql";

function getHeaders(token: string) {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
    "x-platform": "app",
    "x-platform-framework": "react-native",
    "x-os-version": "18.0",
    "x-app-version": "7.1.523",
    "x-channel": "app",
    "x-ui-region": "CA",
    "x-ui-language": "en",
    "apollographql-client-name": "wl-rn-ios",
    "apollographql-client-version": "7.1.523-5faece378978-prod",
    "x-forter-device-id": "0AD61863-BC0A-4DD8-873A-A7B7B0DAEF19",
    "user-agent": "TimHortons/192387700 CFNetwork/3860.400.51 Darwin/25.3.0",
    accept: "*/*",
    "accept-language": "en-CA,en-US;q=0.9,en;q=0.8",
  };
}

async function gql(token: string, body: object) {
  const res = await fetch(TH_GATEWAY, {
    method: "POST",
    headers: getHeaders(token),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    if (!res.ok) {
      const body = await res.text();
      console.error("TH API error body:", body);
      throw new Error(`TH API error: ${res.status} ${res.statusText}`);
    }
  }

  const json = await res.json();

  if (json.errors) {
    throw new Error(`GraphQL error: ${JSON.stringify(json.errors)}`);
  }

  return json.data;
}

// Step 1: Create the order + get pricing
export async function orderPrice(
  token: string,
  restaurantId: string,
  paymentAccountId: string,
) {
  const data = await gql(token, {
    operationName: "OrderPrice",
    variables: {
      input: {
        menuContext: {
          channel: "app",
          restaurantId,
          serviceMode: "TAKEOUT",
        },
        lines: [
          {
            // Small Coffee Original Blend
            lineId: crypto.randomUUID(), // ← add this line
            productVariantId: "item_26546",
            quantity: 1,
            price: {
              cents: 162,
              currency: "CAD",
            },
            itemPath: "/menu/picker-picker_7407",
            selectedModifiers: [
              {
                // 2 Cream
                modifierId: "item_26546:displayGroup_38:Modifier_167",
                optionId:
                  "item_26546:displayGroup_38:Modifier_167:modifierMultiplier_2-00-160655",
                price: { cents: 0, currency: "CAD" },
              },
              {
                // 2 Sugar
                modifierId: "item_26546:displayGroup_25:Modifier_168",
                optionId:
                  "item_26546:displayGroup_25:Modifier_168:modifierMultiplier_2-00-160216",
                price: { cents: 0, currency: "CAD" },
              },
            ],
          },
        ],
      },
    },
    query: `
      mutation OrderPrice($input: OrderPriceInput!) {
        orderPrice(input: $input) {
          order {
            id
            status
            __typename
          }
          __typename
        }
      }
    `,
  });

  const orderId = data?.orderPrice?.order?.id;
  if (!orderId) throw new Error("Failed to get orderId from OrderPrice");
  return orderId as string;
}

// Step 2: Commit / place the order
export async function orderCommit(
  token: string,
  orderId: string,
  restaurantId: string,
  paymentAccountId: string,
  fireOrderInMinutes: number,
) {
  const data = await gql(token, {
    operationName: "OrderCommit",
    variables: {
      input: {
        orderId,
        restaurantId,
        serviceMode: "TAKEOUT",
        payment: {
          accountId: paymentAccountId,
        },
        fireOrderInMinutes,
        skipCoolingPeriod: false,
      },
    },
    query: `
      mutation OrderCommit($input: OrderCommitInput!) {
        orderCommit(input: $input) {
          order {
            id
            __typename
          }
          __typename
        }
      }
    `,
  });

  const committedOrderId = data?.orderCommit?.order?.id;
  if (!committedOrderId)
    throw new Error("OrderCommit failed - no order ID returned");
  return committedOrderId as string;
}

export async function getOrderStatus(
  token: string,
  orderId: string,
): Promise<string> {
  const data = await gql(token, {
    operationName: "GetOrderStatus",
    variables: { orderId },
    query: `
      query GetOrderStatus($orderId: ID!) {
        me {
          order(id: $orderId) {
            id
            status
            __typename
          }
          __typename
        }
      }
    `,
  });
  return data?.me?.order?.status as string;
}
