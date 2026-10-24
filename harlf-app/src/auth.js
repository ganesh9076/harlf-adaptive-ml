
function extractMessage(body, status) {
  const detail = body?.detail;

  if (typeof detail === "string") {
    return detail;
  }

  if (Array.isArray(detail) && detail[0]?.msg) {
    return detail[0].msg.replace(/^Value error, /, "");
  }

  if (status >= 500) {
    return "Server error. Try again in a moment.";
  }

  return "Something went wrong. Try again.";
}

async function request(path, options = {}) {
  let response;

  try {
    response = await fetch(`/api${path}`, {
      ...options,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
    });
  } catch {
    throw new Error(
      "Can't reach the server. Check your connection and try again."
    );
  }

  let body = null;

  try {
    body = await response.json();
  } catch {
    body = null;
  }

  if (!response.ok) {
    throw new Error(extractMessage(body, response.status));
  }

  return body;
}

export function register(name, email, password, remember) {
  return request("/auth/register", {
    method: "POST",
    body: JSON.stringify({
      name,
      email,
      password,
      remember,
    }),
  });
}

export function login(email, password, remember) {
  return request("/auth/login", {
    method: "POST",
    body: JSON.stringify({
      email,
      password,
      remember,
    }),
  });
}

export function logout() {
  return request("/auth/logout", {
    method: "POST",
  });
}

export async function fetchSession() {
  try {
    return await request("/auth/me");
  } catch {
    return null;
  }
}

export function api(path, options) {
  return request(path, options);
}
