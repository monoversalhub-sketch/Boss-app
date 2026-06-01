import { calendar as calendarV3 } from "@googleapis/calendar";
import { OAuth2Client } from "google-auth-library";

function getOAuth2Client() {
  return new OAuth2Client(
    process.env.GOOGLE_DRIVE_CLIENT_ID,
    process.env.GOOGLE_DRIVE_CLIENT_SECRET,
    process.env.GOOGLE_DRIVE_REDIRECT_URI
  );
}

async function getCalendarClient(refreshToken) {
  const auth = getOAuth2Client();
  auth.setCredentials({ refresh_token: refreshToken });
  return calendarV3({ version: "v3", auth });
}

export async function createDeliveryEvent(refreshToken, order, customer, tailorShop) {
  const calendar = await getCalendarClient(refreshToken);
  const deliveryDate = order.delivery_date || order.date;

  const event = {
    summary: `👗 ${customer.name} — ${order.type || "Order"} Ready`,
    description: [
      `Customer: ${customer.name}`,
      `Phone: ${customer.phone || "N/A"}`,
      `Balance Due: ₦${((order.price || 0) - (order.deposit || 0) - (order.paid || 0)).toLocaleString("en-NG")}`,
      `Status: ${order.status}`,
      `\nManage in BOSS: https://boss-africa.vercel.app`,
    ].join("\n"),
    start: { date: deliveryDate },
    end:   { date: deliveryDate },
    reminders: {
      useDefault: false,
      overrides: [
        { method: "popup", minutes: 3 * 24 * 60 },
        { method: "popup", minutes: 24 * 60 },
        { method: "popup", minutes: 60 },
      ],
    },
    colorId: "11",
  };

  const res = await calendar.events.insert({
    calendarId: "primary",
    requestBody: event,
  });

  return res.data.id;
}

export async function updateDeliveryEvent(refreshToken, googleEventId, order, customer) {
  const calendar = await getCalendarClient(refreshToken);
  const deliveryDate = order.delivery_date || order.date;

  await calendar.events.patch({
    calendarId: "primary",
    eventId: googleEventId,
    requestBody: {
      summary: `👗 ${customer.name} — ${order.type || "Order"} Ready`,
      start: { date: deliveryDate },
      end:   { date: deliveryDate },
    },
  });
}

export async function deleteDeliveryEvent(refreshToken, googleEventId) {
  const calendar = await getCalendarClient(refreshToken);
  await calendar.events.delete({
    calendarId: "primary",
    eventId: googleEventId,
  });
}
