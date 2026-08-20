/* =========================================================
   Copy this file to twilio-config.js and fill in real values.
   twilio-config.js is gitignored — it never gets committed.
   ========================================================= */
const TWILIO_CONFIG = {
  accountSid: "PASTE_YOUR_TWILIO_ACCOUNT_SID",
  authToken: "PASTE_YOUR_TWILIO_AUTH_TOKEN",
  whatsappFrom: "whatsapp:+14155238886",

  // The account owner/operator is never a notification recipient, so leave
  // them out of this list. Kids/dependents with no phone of their own also
  // don't belong here if their cost is already covered by a parent's message.
  // enabled:false = message is built but not sent (test mode).
  recipients: [
    { id: "rahul", name: "Rahul", phone: "+91XXXXXXXXXX", enabled: false },
    { id: "dhara", name: "Dhara", phone: "+91XXXXXXXXXX", enabled: false },
    { id: "prakash", name: "Prakash", phone: "+91XXXXXXXXXX", enabled: false },
    { id: "parul", name: "Parul", phone: "+91XXXXXXXXXX", enabled: false }
  ]
};
