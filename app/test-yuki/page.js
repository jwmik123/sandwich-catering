// pages/test-yuki.js (of app/test-yuki/page.js)
"use client";
import { useState } from "react";

export default function TestYuki() {
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);

  const testConnection = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/yuki/admin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_ADMIN_SECRET}`,
        },
        body: JSON.stringify({ action: "test-connection" }),
      });

      const data = await response.json();
      setResult(JSON.stringify(data, null, 2));
    } catch (error) {
      setResult(`Error: ${error.message}`);
    }
    setLoading(false);
  };

  return (
    <div className="p-6">
      <h1>Yuki Connection Test</h1>
      <button
        onClick={testConnection}
        disabled={loading}
        className="px-4 py-2 text-white bg-blue-500 rounded"
      >
        {loading ? "Testing..." : "Test Connection"}
      </button>

      {result && <pre className="p-4 mt-4 bg-gray-100 rounded">{result}</pre>}
    </div>
  );
}
