const serverStatus = document.querySelector("#server-status");
const databaseStatus = document.querySelector("#database-status");
const refreshButton = document.querySelector("#refresh-status");
const echoForm = document.querySelector("#echo-form");
const messageInput = document.querySelector("#message");
const queryResult = document.querySelector("#query-result");

function setStatus(element, text, state) {
  element.textContent = text;
  element.dataset.state = state;
}

async function refreshStatus() {
  refreshButton.disabled = true;
  setStatus(serverStatus, "Checking…", "pending");
  setStatus(databaseStatus, "Checking…", "pending");

  try {
    const response = await fetch("/api/health");
    if (!response.ok) throw new Error("Server health check failed");
    setStatus(serverStatus, "Online", "ok");
  } catch {
    setStatus(serverStatus, "Unavailable", "error");
  }

  try {
    const response = await fetch("/api/db/health");
    const data = await response.json();
    if (!response.ok) throw new Error(data.message);
    setStatus(databaseStatus, "Connected", "ok");
  } catch (error) {
    setStatus(databaseStatus, error.message || "Unavailable", "error");
  } finally {
    refreshButton.disabled = false;
  }
}

refreshButton.addEventListener("click", refreshStatus);

echoForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const submitButton = echoForm.querySelector("button[type=submit]");
  submitButton.disabled = true;
  queryResult.textContent = "Sending…";

  try {
    const response = await fetch("/api/db/echo", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: messageInput.value }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Query failed");
    queryResult.textContent = `PostgreSQL returned: ${data.message}`;
  } catch (error) {
    queryResult.textContent = error.message;
  } finally {
    submitButton.disabled = false;
  }
});

refreshStatus();
