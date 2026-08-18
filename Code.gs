/*******************************************************
RAJASTHAN TRIP TRACKER - GOOGLE APPS SCRIPT

HOW TO USE
1. Create a Google Sheet.
2. Extensions -> Apps Script.
3. Replace Code.gs with this code.
4. Save.
5. Deploy -> New deployment -> Web app.
6. Execute as: Me
7. Who has access: Anyone
8. Copy the Web App URL.
9. Paste it into API_URL in index.html.

The spreadsheet has three sheets:
  Days
  Places
  FoodBills

The HTML app uses JSONP GET requests, so you do NOT need
a database server or CORS configuration.
*******************************************************/

const DAYS_SHEET = "Days";
const PLACES_SHEET = "Places";
const FOOD_BILLS_SHEET = "FoodBills";

const PEOPLE_IDS = [
  "rahul","dhara","dugu1","dugu2","naren","parul","prakash"
];

function doGet(e) {
  try {
    const action = e.parameter.action || "read";
    const callback = safeCallback(e.parameter.callback);
    const payload = e.parameter.payload
      ? JSON.parse(Utilities.newBlob(Utilities.base64Decode(e.parameter.payload)).getDataAsString("UTF-8"))
      : {};

    let result;

    switch (action) {
      case "read":
        result = readAll();
        break;

      case "saveDay":
        result = saveDay(payload.day);
        break;

      case "savePlace":
        result = savePlace(payload.dayId, payload.dayName, payload.place);
        break;

      case "deletePlace":
        result = deletePlace(payload.dayId, payload.placeId);
        break;

      case "saveFoodBill":
        result = saveFoodBill(payload.dayId, payload.dayName, payload.bill);
        break;

      case "deleteFoodBill":
        result = deleteFoodBill(payload.dayId, payload.billId);
        break;

      case "reset":
        result = resetAll();
        break;

      default:
        throw new Error("Unknown action: " + action);
    }

    return jsonp(callback, {ok:true, ...result});
  } catch (err) {
    return jsonp(safeCallback(e.parameter.callback), {
      ok:false,
      error:String(err && err.message ? err.message : err)
    });
  }
}

function safeCallback(callback) {
  callback = callback || "callback";
  if (!/^[A-Za-z_$][0-9A-Za-z_$]*$/.test(callback)) {
    return "callback";
  }
  return callback;
}

function jsonp(callback, obj) {
  const json = JSON.stringify(obj).replace(/</g, "\\u003c");
  return ContentService
    .createTextOutput(callback + "(" + json + ");")
    .setMimeType(ContentService.MimeType.JAVASCRIPT);
}

function getSpreadsheet() {
  return SpreadsheetApp.getActiveSpreadsheet();
}

function setupSheets() {
  const ss = getSpreadsheet();

  let days = ss.getSheetByName(DAYS_SHEET);
  if (!days) {
    days = ss.insertSheet(DAYS_SHEET);
    days.appendRow(["id","name"]);
  }

  let places = ss.getSheetByName(PLACES_SHEET);
  if (!places) {
    places = ss.insertSheet(PLACES_SHEET);
    places.appendRow([
      "dayId","dayName","placeId","sourceKey","original",
      "name","visited","paidBy",
      "rahul","dhara","dugu1","dugu2","naren","parul","prakash"
    ]);
  }

  let foodBills = ss.getSheetByName(FOOD_BILLS_SHEET);
  if (!foodBills) {
    foodBills = ss.insertSheet(FOOD_BILLS_SHEET);
    foodBills.appendRow([
      "dayId","dayName","billId","date","restaurantShop","food",
      "category","amount","paidBy","paymentStatus","notes"
    ]);
  }

  return {days, places, foodBills};
}

function readAll() {
  const sheets = setupSheets();
  const daysSheet = sheets.days;
  const placesSheet = sheets.places;
  const foodBillsSheet = sheets.foodBills;

  const daysValues = daysSheet.getDataRange().getValues();
  const placesValues = placesSheet.getDataRange().getValues();
  const foodBillsValues = foodBillsSheet.getDataRange().getValues();

  const days = [];

  for (let i = 1; i < daysValues.length; i++) {
    const row = daysValues[i];
    if (!row[0]) continue;

    days.push({
      id: String(row[0]),
      name: String(row[1] || "Day"),
      places: [],
      foodBills: []
    });
  }

  const dayMap = {};
  days.forEach(day => dayMap[day.id] = day);

  for (let i = 1; i < placesValues.length; i++) {
    const row = placesValues[i];
    if (!row[0] || !row[2]) continue;

    const place = rowToPlace(row);

    if (!dayMap[place.dayId]) {
      dayMap[place.dayId] = {
        id: place.dayId,
        name: place.dayName || "Day",
        places: [],
        foodBills: []
      };
      days.push(dayMap[place.dayId]);
    }

    dayMap[place.dayId].places.push(place);
  }

  for (let i = 1; i < foodBillsValues.length; i++) {
    const row = foodBillsValues[i];
    if (!row[0] || !row[2]) continue;

    const bill = rowToFoodBill(row);

    if (!dayMap[bill.dayId]) {
      dayMap[bill.dayId] = {
        id: bill.dayId,
        name: bill.dayName || "Day",
        places: [],
        foodBills: []
      };
      days.push(dayMap[bill.dayId]);
    }

    dayMap[bill.dayId].foodBills.push(bill);
  }

  return {days};
}

function rowToPlace(row) {
  const costs = {};

  PEOPLE_IDS.forEach((id, index) => {
    costs[id] = Number(row[8 + index]) || 0;
  });

  return {
    id: String(row[2]),
    sourceKey: row[3] ? String(row[3]) : null,
    original: String(row[4]).toLowerCase() === "true",
    name: String(row[5] || "Sightseeing"),
    visited: row[6] === true || String(row[6]).toLowerCase() === "true",
    paidBy: row[7] ? String(row[7]) : "Not Paid",
    costs: costs,
    dayId: String(row[0]),
    dayName: String(row[1] || "Day")
  };
}

function rowToFoodBill(row) {
  return {
    id: String(row[2]),
    date: formatDateCell(row[3]),
    restaurantShop: String(row[4] || ""),
    food: String(row[5] || ""),
    category: row[6] ? String(row[6]) : "lunch",
    amount: Number(row[7]) || 0,
    paidBy: row[8] ? String(row[8]) : "parul",
    paymentStatus: row[9] ? String(row[9]) : "paid",
    notes: String(row[10] || ""),
    dayId: String(row[0]),
    dayName: String(row[1] || "Day")
  };
}

function formatDateCell(value) {
  if (!value) return "";
  if (Object.prototype.toString.call(value) === "[object Date]") {
    return Utilities.formatDate(value, Session.getScriptTimeZone() || "Etc/UTC", "yyyy-MM-dd");
  }
  return String(value);
}

function saveDay(day) {
  if (!day || !day.id) throw new Error("Invalid day");

  const sheets = setupSheets();
  const sheet = sheets.days;
  const values = sheet.getDataRange().getValues();

  for (let i = 1; i < values.length; i++) {
    if (String(values[i][0]) === String(day.id)) {
      sheet.getRange(i + 1, 1, 1, 2)
        .setValues([[day.id, day.name || "Day"]]);
      return {message:"Day updated"};
    }
  }

  sheet.appendRow([day.id, day.name || "Day"]);
  return {message:"Day saved"};
}

function savePlace(dayId, dayName, place) {
  if (!dayId || !place || !place.id) {
    throw new Error("Invalid place");
  }

  const sheets = setupSheets();
  const sheet = sheets.places;
  const values = sheet.getDataRange().getValues();

  const row = [
    dayId,
    dayName || "Day",
    place.id,
    place.sourceKey || "",
    place.original === true,
    place.name || "Sightseeing",
    place.visited === true,
    place.paidBy || "Not Paid"
  ];

  PEOPLE_IDS.forEach(id => {
    row.push(Number(place.costs && place.costs[id]) || 0);
  });

  for (let i = 1; i < values.length; i++) {
    if (String(values[i][0]) === String(dayId) &&
        String(values[i][2]) === String(place.id)) {

      sheet.getRange(i + 1, 1, 1, row.length).setValues([row]);
      return {message:"Place updated"};
    }
  }

  sheet.appendRow(row);
  return {message:"Place saved"};
}

function deletePlace(dayId, placeId) {
  if (!dayId || !placeId) throw new Error("Invalid place");

  const sheets = setupSheets();
  const sheet = sheets.places;
  const values = sheet.getDataRange().getValues();

  for (let i = values.length - 1; i >= 1; i--) {
    if (String(values[i][0]) === String(dayId) &&
        String(values[i][2]) === String(placeId)) {
      sheet.deleteRow(i + 1);
      return {message:"Place deleted"};
    }
  }

  return {message:"Place not found"};
}

function saveFoodBill(dayId, dayName, bill) {
  if (!dayId || !bill || !bill.id) {
    throw new Error("Invalid food bill");
  }

  const sheets = setupSheets();
  const sheet = sheets.foodBills;
  const values = sheet.getDataRange().getValues();

  const row = [
    dayId,
    dayName || "Day",
    bill.id,
    bill.date || "",
    bill.restaurantShop || "",
    bill.food || "",
    bill.category || "lunch",
    Number(bill.amount) || 0,
    bill.paidBy || "parul",
    bill.paymentStatus || "paid",
    bill.notes || ""
  ];

  let targetRow = -1;
  for (let i = 1; i < values.length; i++) {
    if (String(values[i][0]) === String(dayId) &&
        String(values[i][2]) === String(bill.id)) {
      targetRow = i + 1;
      break;
    }
  }

  const isUpdate = targetRow !== -1;
  if (isUpdate) {
    sheet.getRange(targetRow, 1, 1, row.length).setValues([row]);
  } else {
    sheet.appendRow(row);
    targetRow = sheet.getLastRow();
  }

  // Keep the date column as plain text so Sheets doesn't reinterpret "yyyy-MM-dd" as a serial date.
  sheet.getRange(targetRow, 4).setNumberFormat("@").setValue(row[3]);

  return {message: isUpdate ? "Food bill updated" : "Food bill saved"};
}

function deleteFoodBill(dayId, billId) {
  if (!dayId || !billId) throw new Error("Invalid food bill");

  const sheets = setupSheets();
  const sheet = sheets.foodBills;
  const values = sheet.getDataRange().getValues();

  for (let i = values.length - 1; i >= 1; i--) {
    if (String(values[i][0]) === String(dayId) &&
        String(values[i][2]) === String(billId)) {
      sheet.deleteRow(i + 1);
      return {message:"Food bill deleted"};
    }
  }

  return {message:"Food bill not found"};
}

function resetAll() {
  const sheets = setupSheets();

  clearDataSheet(sheets.days, 2);
  clearDataSheet(sheets.places, 2);
  clearDataSheet(sheets.foodBills, 2);

  return {message:"Trip data cleared"};
}

function clearDataSheet(sheet, firstDataRow) {
  const lastRow = sheet.getLastRow();

  if (lastRow >= firstDataRow) {
    sheet.deleteRows(firstDataRow, lastRow - firstDataRow + 1);
  }
}

/* Optional helper:
   Run setupSheets() manually once if you want to create the
   two sheets before deploying the Web App.
*/
