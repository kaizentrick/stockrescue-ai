document.querySelector("#login").addEventListener("submit", async (e) => {
  e.preventDefault();
  const password = new FormData(e.target).get("password");
  try {
    const r = await fetch("/api/login", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-stockrescue-client": "local",
      },
      body: JSON.stringify({ password }),
    });
    if (!r.ok) throw new Error((await r.json()).error);
    location.href = "/";
  } catch (error) {
    document.querySelector("#error").textContent = error.message;
  }
});
