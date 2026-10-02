const $ = id => document.getElementById(id);

let refreshInProgress = false;

function log(message) {
    $("log").textContent +=
        `[${new Date().toLocaleTimeString()}] ${message}\n`;
}

function decodeJwtPayload(token) {
    const parts = token.split(".");

    if (parts.length !== 3) {
        throw new Error("Access token is not a JWT");
    }

    const base64Url = parts[1];

    const base64 = base64Url
        .replace(/-/g, "+")
        .replace(/_/g, "/")
        .padEnd(
            base64Url.length + (4 - base64Url.length % 4) % 4,
            "="
        );

    const json = decodeURIComponent(
        atob(base64)
            .split("")
            .map(c =>
                "%" + c.charCodeAt(0)
                    .toString(16)
                    .padStart(2, "0")
            )
            .join("")
    );

    return JSON.parse(json);
}

async function displayUser() {
    const user = await auth.getUser();

    $("login").disabled = !!user && !user.expired;
    $("logout").disabled = !user;
    $("renew").disabled = !user?.refresh_token;
    $("copy").disabled = !user?.access_token;

    $("claims").textContent = user
        ? JSON.stringify(user.profile, null, 2)
        : "Not authenticated";

    if (user?.access_token) {
        try {
            const claims = decodeJwtPayload(user.access_token);

            $("access-token").textContent =
                JSON.stringify(claims, null, 2);
        } catch (error) {
            $("access-token").textContent =
                `Could not decode access token: ${error.message}`;
        }
    } else {
        $("access-token").textContent = "Not authenticated";
    }

    $("status").textContent = user
        ? JSON.stringify({
            expiresIn: user.expires_in,
            hasRefreshToken: !!user.refresh_token,
            expired: user.expired
          }, null, 2)
        : "Not authenticated";
}

async function refreshToken() {
    if (refreshInProgress) return;

    refreshInProgress = true;

    try {
        log("Refreshing access token...");

        const user = await auth.renewToken();

        log(`Success. New expiration: ${user.expires_in}s`);
        await displayUser();
    } catch (error) {
        log(`Refresh failed: ${error.message}`);
    } finally {
        refreshInProgress = false;
    }
}

$("login").onclick = () => auth.login();
$("logout").onclick = () => auth.logout();
$("renew").onclick = refreshToken;

$("copy").onclick = async () => {
    const user = await auth.getUser();

    if (user?.access_token) {
        await navigator.clipboard.writeText(user.access_token);
        log("Access token copied.");
    }
};

async function initialize() {
    // Handle the redirect from Keycloak.
    const params = new URLSearchParams(location.search);

    if (params.has("state") &&
        (params.has("code") || params.has("error"))) {
        await auth.handleCallback();

        history.replaceState({}, "", location.pathname);
        log("Login completed.");
    }

    // Complete any pending logout callback.
    // Use a separate callback URL if your login/logout
    // callback handling becomes more elaborate.

    await displayUser();

    // Check every 10 seconds.
    setInterval(async () => {
        try {
            const user = await auth.getUser();

            if (user?.refresh_token &&
                user.expires_in <= 60) {
                await refreshToken();
            }

            await displayUser();
        } catch (error) {
            log(`Token check failed: ${error.message}`);
        }
    }, 10000);
}

initialize().catch(error => {
    log(`Initialization failed: ${error.message}`);
});