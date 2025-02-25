// Save this as a file like cleanup.js
const { createClient } = require("@sanity/client");

const client = createClient({
  projectId: process.env.SANITY_PROJECT_ID,
  dataset: process.env.SANITY_DATASET,
  token: process.env.SANITY_WRITE_TOKEN, // needs write access
  useCdn: false,
  apiVersion: "2023-03-01",
});

// Delete the documents
client
  .delete({ query: '*[_type in ["quote", "invoice"]]' })
  .then((result) => console.log("Deleted quotes and invoices:", result))
  .catch((err) => console.error("Delete failed:", err.message));
