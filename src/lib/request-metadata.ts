type HeaderReader = {
  get(name: string): string | null;
};

type HeaderRecord = Record<string, string | string[] | undefined>;

function firstHeaderValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

export function getRequestHeader(
  headers: HeaderReader | HeaderRecord | undefined,
  name: string,
) {
  if (!headers) {
    return null;
  }

  if ("get" in headers && typeof headers.get === "function") {
    return headers.get(name);
  }

  const lowerName = name.toLowerCase();
  const record = headers as HeaderRecord;

  return firstHeaderValue(record[lowerName] ?? record[name]);
}

export function getRequestUserAgent(
  headers: HeaderReader | HeaderRecord | undefined,
) {
  const userAgent = getRequestHeader(headers, "user-agent")?.trim();

  if (!userAgent) {
    return null;
  }

  return userAgent.slice(0, 500);
}

export function parseUserAgent(userAgent: string | null | undefined) {
  const value = userAgent ?? "";
  const lowerValue = value.toLowerCase();
  const operatingSystem =
    lowerValue.includes("windows")
      ? "Windows"
      : lowerValue.includes("android")
        ? "Android"
        : lowerValue.includes("iphone") ||
            lowerValue.includes("ipad") ||
            lowerValue.includes("ios")
          ? "iOS"
          : lowerValue.includes("mac os") || lowerValue.includes("macintosh")
            ? "macOS"
            : lowerValue.includes("linux")
              ? "Linux"
              : "Unknown";

  const scriptClients = [
    { pattern: "curl", label: "Script: curl" },
    { pattern: "postmanruntime", label: "Script: Postman" },
    { pattern: "python-requests", label: "Script: Python requests" },
    { pattern: "httpie", label: "Script: HTTPie" },
    { pattern: "axios", label: "Script: Axios" },
    { pattern: "node-fetch", label: "Script: node-fetch" },
    { pattern: "go-http-client", label: "Script: Go HTTP client" },
    { pattern: "java/", label: "Script: Java client" },
    { pattern: "powershell", label: "Script: PowerShell" },
    { pattern: "wget", label: "Script: wget" },
  ];
  const scriptClient = scriptClients.find(({ pattern }) =>
    lowerValue.includes(pattern),
  );

  if (scriptClient) {
    return {
      operatingSystem,
      clientType: scriptClient.label,
    };
  }

  const browser =
    lowerValue.includes("edg/")
      ? "Browser: Edge"
      : lowerValue.includes("chrome/")
        ? "Browser: Chrome"
        : lowerValue.includes("firefox/")
          ? "Browser: Firefox"
          : lowerValue.includes("safari/") && !lowerValue.includes("chrome/")
            ? "Browser: Safari"
            : lowerValue.includes("opr/") || lowerValue.includes("opera")
              ? "Browser: Opera"
              : "Unknown";

  return {
    operatingSystem,
    clientType: browser,
  };
}
