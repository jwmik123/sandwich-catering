// Date helpers shared by the start screen and the checkout calendar.
// The rules are the ones DeliveryCalendar used: no past dates, no today, and
// none of the closed periods from Sanity site settings.

export const toDateString = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;

export const fromDateString = (value) => {
  if (!value) return undefined;
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return undefined;
  return new Date(year, month - 1, day);
};

export const isDateDisabled = (date, disabledDates = []) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (date <= today) return true;

  const dateStr = toDateString(date);
  return disabledDates.some((period) =>
    period.endDate
      ? dateStr >= period.startDate && dateStr <= period.endDate
      : dateStr === period.startDate
  );
};

export const nextAvailableDates = (count, disabledDates = []) => {
  const dates = [];
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  for (let i = 0; i < 60 && dates.length < count; i++) {
    cursor.setDate(cursor.getDate() + 1);
    if (!isDateDisabled(cursor, disabledDates)) dates.push(new Date(cursor));
  }
  return dates;
};

// Half-hour slots from 10:00 up to and including 16:30.
export const TIME_SLOTS = Array.from({ length: 14 }, (_, i) => {
  const hour = 10 + Math.floor(i / 2);
  return `${String(hour).padStart(2, "0")}:${i % 2 === 0 ? "00" : "30"}`;
});

export const formatLongDate = (value) => {
  const date = fromDateString(value);
  if (!date) return "";
  return date.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
};

// Every postcode we deliver to is in Amsterdam except these, so the city
// follows from the postcode and the customer does not have to type it.
const CITY_BY_POSTCODE = {
  1112: "Diemen",
  1114: "Amsterdam-Duivendrecht",
  1117: "Schiphol",
};

export const cityForPostcode = (postalCode, deliveryZones) => {
  const digits = (postalCode || "").replace(/\s/g, "").substring(0, 4);
  if (digits.length < 4 || !deliveryZones[digits]) return "";
  return CITY_BY_POSTCODE[digits] || "Amsterdam";
};
